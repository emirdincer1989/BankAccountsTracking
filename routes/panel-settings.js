const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { authMiddleware } = require('../middleware/auth');
const { logger } = require('../utils/logger');

const router = express.Router();

// Multer konfigürasyonu - dosya yükleme
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'assets/images/');
    },
    filename: function (req, file, cb) {
        // Dosya çakışmasını önlemek için timestamp ekle
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        cb(null, `${name}_${timestamp}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        // Sadece resim dosyalarına izin ver
        if (file.mimetype.startsWith('image/') || file.originalname.endsWith('.ico')) {
            cb(null, true);
        } else {
            cb(new Error('Sadece resim dosyaları kabul edilir!'), false);
        }
    }
});

// Sadece super_admin erişebilir middleware
const superAdminOnly = (req, res, next) => {
    if (req.user.role_name !== 'super_admin') {
        return res.status(403).json({
            success: false,
            message: 'Bu işlem için yetkiniz yok'
        });
    }
    next();
};

// Logo yükleme endpoint'i
router.post('/logos', authMiddleware, superAdminOnly, upload.fields([
    { name: 'largeLogo', maxCount: 1 },
    { name: 'smallLogo', maxCount: 1 },
    { name: 'favicon', maxCount: 1 }
]), async (req, res) => {
    try {
        logger.info('Logo upload request received', { 
            files: req.files ? Object.keys(req.files) : 'no files',
            fileCount: req.files ? Object.keys(req.files).length : 0
        });
        
        const uploadedFiles = {};
        const results = [];

        // Büyük logo işleme (dark ve light varyantları birlikte)
        if (req.files.largeLogo) {
            const file = req.files.largeLogo[0];
            const darkPath = path.join(__dirname, '../assets/images/', 'logo-dark.png');
            const lightPath = path.join(__dirname, '../assets/images/', 'logo-light.png');
            
            // Yüklenen temp dosyayı önce dark'a taşı
            await fs.rename(file.path, darkPath);
            
            // Dark dosyasını light olarak da kopyala (ayrı tema kullanan header için)
            try {
                const fsSync = require('fs');
                await fs.copyFile(darkPath, lightPath);
            } catch (copyErr) {
                logger.error('Logo light copy error:', copyErr);
            }
            
            uploadedFiles.largeLogo = darkPath;
            results.push('Büyük logo (dark/light) güncellendi');
            logger.info(`Large logo updated: ${file.originalname}`);
        }

        // Küçük logo işleme
        if (req.files.smallLogo) {
            const file = req.files.smallLogo[0];
            const newPath = path.join(__dirname, '../assets/images/', 'logo-sm.png');
            await fs.rename(file.path, newPath);
            uploadedFiles.smallLogo = newPath;
            results.push('Küçük logo güncellendi');
            logger.info(`Small logo updated: ${file.originalname}`);
        }

        // Favicon işleme
        if (req.files.favicon) {
            const file = req.files.favicon[0];
            const fileExt = path.extname(file.originalname).toLowerCase();
            
            // Dosya uzantısına göre favicon dosyasını belirle
            let newFileName;
            if (fileExt === '.ico') {
                newFileName = 'favicon.ico';
            } else if (fileExt === '.png') {
                newFileName = 'favicon.png';
            } else {
                // Diğer formatlar için PNG olarak kaydet
                newFileName = 'favicon.png';
            }
            
            const newPath = path.join(__dirname, '../assets/images/', newFileName);
            
            // Önce eski favicon dosyalarını sil (varsa)
            try {
                const oldIcoPath = path.join(__dirname, '../assets/images/', 'favicon.ico');
                const oldPngPath = path.join(__dirname, '../assets/images/', 'favicon.png');
                
                if (await fs.access(oldIcoPath).then(() => true).catch(() => false)) {
                    await fs.unlink(oldIcoPath);
                }
                if (await fs.access(oldPngPath).then(() => true).catch(() => false)) {
                    await fs.unlink(oldPngPath);
                }
            } catch (cleanupErr) {
                logger.warn('Old favicon cleanup warning:', cleanupErr.message);
            }
            
            // Dosyayı doğru uzantıyla kaydet
            await fs.rename(file.path, newPath);
            uploadedFiles.favicon = newPath;
            
            // HTML dosyasındaki favicon link tag'ini güncelle
            try {
                const htmlPath = path.join(__dirname, '../hybrid-layout.html');
                let htmlContent = await fs.readFile(htmlPath, 'utf8');
                
                // Cache busting parametresi ekle (timestamp)
                const timestamp = Date.now();
                
                // Favicon link tag'ini güncelle
                const faviconLinkRegex = /<link rel="shortcut icon" href="[^"]*">/;
                const newFaviconLink = `<link rel="shortcut icon" href="assets/images/${newFileName}?v=${timestamp}">`;
                
                htmlContent = htmlContent.replace(faviconLinkRegex, newFaviconLink);
                await fs.writeFile(htmlPath, htmlContent, 'utf8');
                
                logger.info(`HTML favicon link updated to: assets/images/${newFileName}?v=${timestamp}`);
            } catch (htmlError) {
                logger.error('HTML favicon update error:', htmlError);
            }
            
            results.push('Favicon güncellendi');
            logger.info(`Favicon updated: ${file.originalname} -> ${newFileName}`);
        }

        if (results.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Hiç dosya yüklenmedi'
            });
        }

        res.json({
            success: true,
            message: results.join(', '),
            data: {
                uploadedFiles: Object.keys(uploadedFiles),
                results
            }
        });

    } catch (error) {
        logger.error('Logo upload error:', error);
        res.status(500).json({
            success: false,
            message: 'Dosya yükleme hatası: ' + error.message
        });
    }
});

// Mevcut logo bilgilerini getir
router.get('/current-logos', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const logos = {
            largeLogo: '/assets/images/logo-dark.png',
            smallLogo: '/assets/images/logo-sm.png',
            favicon: '/assets/images/favicon.ico'
        };

        // Dosyaların var olup olmadığını kontrol et
        for (const [key, filePath] of Object.entries(logos)) {
            try {
                await fs.access(filePath.replace('/', ''));
            } catch (error) {
                logos[key] = null; // Dosya yoksa null yap
            }
        }

        res.json({
            success: true,
            data: logos
        });

    } catch (error) {
        logger.error('Current logos fetch error:', error);
        res.status(500).json({
            success: false,
            message: 'Logo bilgileri alınamadı'
        });
    }
});

// Mevcut metin ayarlarını getirme endpoint'i
router.get('/texts', authMiddleware, async (req, res) => {
    try {
        const htmlPath = path.join(__dirname, '../hybrid-layout.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf8');

        // Title tag'inden sistem başlığını çıkar
        const titleMatch = htmlContent.match(/<title>(.*?)<\/title>/);
        const systemTitle = titleMatch ? titleMatch[1] : 'RBUMS';

        // Footer'dan marka adını çıkar
        const footerMatch = htmlContent.match(/<script>document\.write\(new Date\(\)\.getFullYear\(\)\)<\/script> © ([^<]*)/);
        const footerBrand = footerMatch ? footerMatch[1] : 'Ezoft';

        res.json({
            success: true,
            data: {
                systemTitle,
                footerBrand
            }
        });

    } catch (error) {
        logger.error('Mevcut metin ayarları getirme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Metin ayarları alınamadı'
        });
    }
});

// Metin ayarları kaydetme endpoint'i
router.post('/texts', authMiddleware, superAdminOnly, async (req, res) => {
    try {
        const { systemTitle, footerBrand } = req.body;

        // Validation
        if (!systemTitle || !footerBrand) {
            return res.status(400).json({
                success: false,
                message: 'Tüm alanlar zorunludur'
            });
        }

        // HTML dosyasını güncelle
        const htmlPath = path.join(__dirname, '../hybrid-layout.html');
        let htmlContent = await fs.readFile(htmlPath, 'utf8');

        // Sistem başlığını güncelle (title tag)
        htmlContent = htmlContent.replace(
            /<title>.*?<\/title>/,
            `<title>${systemTitle}</title>`
        );

        // Footer marka adını güncelle - daha geniş pattern
        htmlContent = htmlContent.replace(
            /<script>document\.write\(new Date\(\)\.getFullYear\(\)\)<\/script> © [^<]*/g,
            `<script>document.write(new Date().getFullYear())</script> © ${footerBrand}`
        );

        // HTML dosyasını kaydet
        await fs.writeFile(htmlPath, htmlContent, 'utf8');

        logger.info(`Metin ayarları güncellendi: ${systemTitle}, ${footerBrand}`);

        res.json({
            success: true,
            message: 'Metin ayarları başarıyla güncellendi'
        });

    } catch (error) {
        logger.error('Metin ayarları güncelleme hatası:', error);
        res.status(500).json({
            success: false,
            message: 'Metin ayarları güncellenirken hata oluştu'
        });
    }
});

module.exports = router;
