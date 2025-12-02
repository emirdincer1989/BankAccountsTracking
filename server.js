const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');
const fs = require('fs');
require('dotenv').config();

// Import middleware and routes
const { authMiddleware } = require('./middleware/auth');
const { securityCheck } = require('./middleware/validation');
const { generalLimiter, loginLimiter } = require('./middleware/rateLimiter');
const { logger } = require('./utils/logger');

// Import routes
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const roleRoutes = require('./routes/roles');
const menuRoutes = require('./routes/menus');
const dashboardRoutes = require('./routes/dashboard');
const cronManagementRoutes = require('./routes/cron-management');
const emailManagementRoutes = require('./routes/email-management');
const notificationManagementRoutes = require('./routes/notification-management');

const app = express();
const PORT = process.env.PORT || 3000;

// ZORUNLU GÜVENLİK MIDDLEWARE'LERİ
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            scriptSrcAttr: ["'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "https:"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://fonts.gstatic.com"],
            connectSrc: ["'self'", "https://cdn.lordicon.com", "https://cdn.jsdelivr.net"],
        },
    },
}));

app.use(cors({
    origin: (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',')) || ['http://localhost:3000'],
    credentials: true
}));

// HTTPS ZORUNLULUĞU (Production)
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// RATE LIMITING (Production'da aktif, Development'ta skip edilir)
app.use('/api/', generalLimiter);

// Middleware
app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Frontend'e config geç (BASE_PATH vb.)
app.get('/config.js', (req, res) => {
    const config = {
        BASE_PATH: process.env.BASE_PATH || ''
    };
    res.type('application/javascript').send(`window.APP_CONFIG = ${JSON.stringify(config)};`);
});

// Security check middleware
app.use(securityCheck);

// API Routes
app.use('/api/auth', loginLimiter, authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/roles', authMiddleware, roleRoutes);
app.use('/api/menus', authMiddleware, menuRoutes);
app.use('/api/dashboard', authMiddleware, dashboardRoutes);
app.use('/api/panel-settings', authMiddleware, require('./routes/panel-settings'));
app.use('/api/cron-management', authMiddleware, cronManagementRoutes);
app.use('/api/email-management', authMiddleware, emailManagementRoutes);
app.use('/api/notification-management', authMiddleware, notificationManagementRoutes);
app.use('/api/institutions', authMiddleware, require('./routes/institutionRoutes'));
app.use('/api/accounts', authMiddleware, require('./routes/accountRoutes'));
app.use('/api/transactions', authMiddleware, require('./routes/transactionRoutes'));
app.use('/api/reports', authMiddleware, require('./routes/reportRoutes'));

// Serve HTML files
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'auth-signin-basic.html'));
});

// NOT: Sayfa route'larına artık gerek yok!
// Catch-all route (line 144) tüm sayfaları otomatik handle ediyor.
// Sayfalar modüler sistem ile assets/pages/ klasöründe tanımlanıyor.
//
// Örnek sayfalar:
// - /dashboard  → assets/pages/dashboard.js
// - /users      → assets/pages/users.js
// - /roles      → assets/pages/roles.js
// - /menus      → assets/pages/menus.js
// - /custom-page → assets/pages/custom-page.js (oluşturulursa)

// Frontend routing için catch-all route (API ve statik dosyalar hariç)
// Bu route F5 ile refresh ve direkt URL erişimini destekler
app.get('*', (req, res, next) => {
    // API isteklerini atla - bunlar 404 dönmeli
    if (req.path.startsWith('/api/')) {
        return next();
    }

    // Statik dosya isteğiyse atla
    if (req.path.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|json)$/)) {
        return next();
    }

    // Login sayfasına erişim serbest
    if (req.path === '/' || req.path === '/login') {
        return res.sendFile(path.join(__dirname, 'auth-signin-basic.html'));
    }

    // Diğer tüm route'lar için hybrid-layout.html döndür
    // Frontend router bu route'u handle edecek
    res.sendFile(path.join(__dirname, 'hybrid-layout.html'));
});

// 404 handler - sadece API istekleri için
app.use('/api/*', (req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint bulunamadı'
    });
});

// Error handler
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Sunucu hatası'
    });
});

// Cron Manager'ı başlat
const { getCronJobManager } = require('./services/cron/CronJobManager');
const testModalJob = require('./jobs/testModalJob');
const emailQueueProcessor = require('./jobs/emailQueueProcessor');

async function initCronJobs() {
    try {
        const cronManager = getCronJobManager();

        // Database'den job'ları yükle
        const jobs = await cronManager.loadJobsFromDB();
        logger.info(`📋 ${jobs.length} cron job database'den yüklendi`);

        let registeredCount = 0;
        let errorCount = 0;

        // Her job'ı kaydet
        for (const jobConfig of jobs) {
            try {
                if (jobConfig.name === 'testModalJob') {
                    cronManager.registerJob(jobConfig, testModalJob);
                    registeredCount++;
                    logger.info(`✅ testModalJob kaydedildi`);
                } else if (jobConfig.name === 'emailQueueProcessor') {
                    cronManager.registerJob(jobConfig, emailQueueProcessor);
                    registeredCount++;
                    logger.info(`✅ emailQueueProcessor kaydedildi`);
                } else if (jobConfig.name === 'bankSyncJob') {
                    const scheduleBankSync = require('./jobs/scheduleBankSync');
                    cronManager.registerJob(jobConfig, scheduleBankSync);
                    registeredCount++;
                    logger.info(`✅ bankSyncJob kaydedildi (Schedule: ${jobConfig.schedule}, Enabled: ${jobConfig.is_enabled})`);
                } else {
                    logger.warn(`⚠️  Bilinmeyen job: ${jobConfig.name} - Kayıt atlandı`);
                }
            } catch (jobError) {
                errorCount++;
                logger.error(`❌ Job kayıt hatası (${jobConfig.name}):`, jobError);
                // Bir job hata verse bile diğerlerini kaydetmeye devam et
            }
        }

        logger.info(`✅ Cron job başlatma tamamlandı: ${registeredCount} başarılı, ${errorCount} hata`);
        
        // Aktif job sayısını göster
        const activeJobs = Array.from(cronManager.jobs.values()).filter(j => j.isRunning);
        logger.info(`▶️  ${activeJobs.length} aktif job çalışıyor`);
        
        // Server başlangıcında takılı kalmış job'ları temizle
        try {
            logger.info('🧹 Server başlangıcında takılı kalmış job\'lar temizleniyor...');
            const clearResult = await cronManager.clearStuckJobs();
            if (clearResult.cleared > 0) {
                logger.warn(`⚠️  ${clearResult.cleared} adet takılı kalmış job temizlendi`);
            } else {
                logger.info('✅ Takılı kalmış job bulunamadı');
            }
        } catch (clearError) {
            logger.error('❌ Takılı job temizleme hatası:', clearError);
        }
        
        // Periyodik otomatik temizleme (her 10 dakikada bir)
        setInterval(async () => {
            try {
                const clearResult = await cronManager.clearStuckJobs();
                if (clearResult.cleared > 0) {
                    logger.warn(`🧹 Otomatik temizleme: ${clearResult.cleared} adet takılı kalmış job temizlendi`);
                }
            } catch (clearError) {
                logger.error('❌ Otomatik takılı job temizleme hatası:', clearError);
            }
        }, 10 * 60 * 1000); // 10 dakika
        
        logger.info('✅ Otomatik takılı job temizleme başlatıldı (her 10 dakikada bir)');
        
    } catch (error) {
        logger.error('❌ Cron job başlatma hatası:', error);
        logger.error('Stack trace:', error.stack);
    }
}

// Socket.io setup
const server = require('http').createServer(app);
const io = require('socket.io')(server, {
    cors: {
        origin: (process.env.ALLOWED_ORIGINS && process.env.ALLOWED_ORIGINS.split(',')) || ['http://localhost:3000'],
        credentials: true
    }
});

// Socket.io authentication middleware
io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token ||
            (socket.handshake.headers.cookie && socket.handshake.headers.cookie.split('auth_token=')[1] && socket.handshake.headers.cookie.split('auth_token=')[1].split(';')[0]);

        if (!token) {
            return next(new Error('Authentication token bulunamadı'));
        }

        const jwt = require('jsonwebtoken');
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        // Kullanıcıyı veritabanından al
        const { query } = require('./config/database');
        const userResult = await query(
            `SELECT id, email, name, role_id, is_active
             FROM users 
             WHERE id = $1 AND is_active = true`,
            [decoded.userId]
        );

        if (userResult.rows.length === 0) {
            return next(new Error('Geçersiz kullanıcı'));
        }

        socket.userId = decoded.userId;
        socket.user = userResult.rows[0];
        next();
    } catch (error) {
        logger.error('Socket.io authentication error:', error);
        next(new Error('Authentication başarısız'));
    }
});

io.on('connection', (socket) => {
    logger.info(`✅ Client connected to socket: ${socket.id} (User: ${socket.userId})`);

    // Kullanıcı room'una katıl
    const userRoom = `user_${socket.userId}`;
    socket.join(userRoom);
    logger.info(`User ${socket.userId} joined room: ${userRoom}`);

    // Join event (client'tan gelen)
    socket.on('join', (room) => {
        socket.join(room);
        logger.info(`Socket ${socket.id} joined room: ${room}`);
    });

    socket.on('disconnect', () => {
        logger.info(`❌ Client disconnected from socket: ${socket.id} (User: ${socket.userId})`);
    });
});

// Make io accessible to other modules globally
global.io = io;

// Start server
server.listen(PORT, async () => {
    try {
        logger.info(`🚀 Server running on port ${PORT}`);
        logger.info(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
        logger.info(`🔒 Security: ${process.env.NODE_ENV === 'production' ? 'HTTPS Required' : 'Development Mode'}`);
        logger.info(`🔌 Socket.io enabled for real-time notifications`);

        // Cron Manager'ı başlat
        try {
            await initCronJobs();
        } catch (cronError) {
            logger.error('❌ Cron job başlatma hatası (devam ediliyor):', cronError);
            // Cron hatası server'ı durdurmamalı
        }

        // BullMQ Worker'ları başlat
        try {
            const { initWorkers } = require('./services/queue/QueueManager');
            initWorkers();
        } catch (workerError) {
            logger.error('❌ Worker başlatma hatası (devam ediliyor):', workerError);
            // Worker hatası server'ı durdurmamalı
        }
    } catch (error) {
        logger.error('❌ Server başlatma hatası:', error);
        logger.error('Stack trace:', error.stack);
        // Hata olsa bile server çalışmaya devam etsin (en azından static dosyalar servis edilsin)
    }
});

module.exports = app;
