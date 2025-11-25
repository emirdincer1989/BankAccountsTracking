/**
 * Initial Database Schema - RBUMS Complete Schema
 *
 * RBUMS şablon projesinin tüm veritabanı yapısını oluşturur.
 * Bu migration tek seferde tüm tabloları oluşturur:
 * - Temel tablolar: users, roles, menus, role_menus, audit_logs
 * - Cron sistem: cron_jobs, cron_job_logs
 * - Email sistem: email_providers, email_queue, email_logs
 * - Bildirim sistemi: notifications, notification_logs
 *
 * Şablon proje için tüm gerekli tabloları içerir.
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'rbums',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
});

async function runMigration() {
    const client = await pool.connect();

    try {
        console.log('🚀 Migration başlıyor: Complete Database Schema');
        console.log('');

        await client.query('BEGIN');

        // ===== TEMEL TABLOLAR =====
        console.log('📋 Temel tablolar oluşturuluyor...');

        // Mevcut tabloları temizle (ilk kurulum için)
        await client.query(`DROP TABLE IF EXISTS notification_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS notifications CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_queue CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_providers CASCADE`);
        await client.query(`DROP TABLE IF EXISTS cron_job_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS cron_jobs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS role_menus CASCADE`);
        await client.query(`DROP TABLE IF EXISTS menus CASCADE`);
        await client.query(`DROP TABLE IF EXISTS users CASCADE`);
        await client.query(`DROP TABLE IF EXISTS roles CASCADE`);
        console.log('   ⚠️  Mevcut tablolar temizlendi (ilk kurulum)');
        console.log('');

        // 1. ROLLER TABLOSU
        console.log('1️⃣ roles tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE roles (
                id SERIAL PRIMARY KEY,
                name VARCHAR(50) UNIQUE NOT NULL,
                description TEXT,
                permissions JSONB DEFAULT '{}',
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ roles tablosu oluşturuldu');

        // 2. KULLANICILAR TABLOSU
        console.log('2️⃣ users tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE users (
                id SERIAL PRIMARY KEY,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                name VARCHAR(100) NOT NULL,
                role_id INTEGER REFERENCES roles(id),
                is_active BOOLEAN DEFAULT true,
                last_login TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ users tablosu oluşturuldu');

        // 3. MENÜLER TABLOSU
        console.log('3️⃣ menus tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE menus (
                id SERIAL PRIMARY KEY,
                title VARCHAR(100) NOT NULL,
                url VARCHAR(255),
                icon VARCHAR(50),
                category VARCHAR(100),
                is_category BOOLEAN DEFAULT false,
                order_index INTEGER DEFAULT 0,
                category_order_index INTEGER DEFAULT 0,
                menu_order_index INTEGER DEFAULT 0,
                is_active BOOLEAN DEFAULT true,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT unique_menu_title_url UNIQUE (title, url)
            )
        `);
        console.log('   ✅ menus tablosu oluşturuldu');

        // 4. ROL-MENÜ İLİŞKİ TABLOSU
        console.log('4️⃣ role_menus tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE role_menus (
                id SERIAL PRIMARY KEY,
                role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
                menu_id INTEGER REFERENCES menus(id) ON DELETE CASCADE,
                can_view BOOLEAN DEFAULT false,
                can_create BOOLEAN DEFAULT false,
                can_edit BOOLEAN DEFAULT false,
                can_delete BOOLEAN DEFAULT false,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(role_id, menu_id)
            )
        `);
        console.log('   ✅ role_menus tablosu oluşturuldu');

        // 5. AUDIT LOG TABLOSU
        console.log('5️⃣ audit_logs tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE audit_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                action VARCHAR(100) NOT NULL,
                table_name VARCHAR(50),
                record_id INTEGER,
                old_values JSONB,
                new_values JSONB,
                ip_address INET,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ audit_logs tablosu oluşturuldu');
        console.log('');

        // ===== CRON SİSTEM TABLOLARI =====
        console.log('📋 Cron sistemi tabloları oluşturuluyor...');

        // 6. CRON JOBS TABLOSU
        console.log('6️⃣ cron_jobs tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE cron_jobs (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) UNIQUE NOT NULL,
                title VARCHAR(200) NOT NULL,
                description TEXT,
                schedule VARCHAR(50) NOT NULL DEFAULT '* * * * *',
                is_enabled BOOLEAN DEFAULT FALSE,
                last_run_at TIMESTAMP,
                last_run_status VARCHAR(20),
                last_run_duration INTEGER,
                run_count INTEGER DEFAULT 0,
                success_count INTEGER DEFAULT 0,
                error_count INTEGER DEFAULT 0,
                config JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_by INTEGER REFERENCES users(id)
            )
        `);
        console.log('   ✅ cron_jobs tablosu oluşturuldu');

        // 7. CRON JOB LOGS TABLOSU
        console.log('7️⃣ cron_job_logs tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE cron_job_logs (
                id SERIAL PRIMARY KEY,
                job_name VARCHAR(100) NOT NULL,
                status VARCHAR(20) NOT NULL,
                started_at TIMESTAMP NOT NULL,
                completed_at TIMESTAMP,
                duration INTEGER,
                result JSONB,
                error_message TEXT,
                error_stack TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ cron_job_logs tablosu oluşturuldu');
        console.log('');

        // ===== EMAIL SİSTEM TABLOLARI =====
        console.log('📋 Email sistemi tabloları oluşturuluyor...');

        // 8. EMAIL PROVIDERS TABLOSU
        console.log('8️⃣ email_providers tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE email_providers (
                id SERIAL PRIMARY KEY,
                name VARCHAR(100) NOT NULL DEFAULT 'default',
                is_active BOOLEAN DEFAULT true,
                is_default BOOLEAN DEFAULT false,
                host VARCHAR(255),
                port INTEGER DEFAULT 587,
                secure BOOLEAN DEFAULT false,
                "user" VARCHAR(255),
                password_encrypted TEXT,
                password_iv VARCHAR(64),
                password_auth_tag VARCHAR(64),
                from_email VARCHAR(255),
                from_name VARCHAR(255),
                reply_to VARCHAR(255),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ email_providers tablosu oluşturuldu');

        // 9. EMAIL QUEUE TABLOSU
        console.log('9️⃣ email_queue tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE email_queue (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                to_email VARCHAR(255) NOT NULL,
                from_email VARCHAR(255),
                from_name VARCHAR(255),
                reply_to VARCHAR(255),
                subject VARCHAR(500) NOT NULL,
                body_html TEXT,
                body_text TEXT,
                status VARCHAR(20) DEFAULT 'pending',
                priority INTEGER DEFAULT 5,
                retry_count INTEGER DEFAULT 0,
                max_retries INTEGER DEFAULT 3,
                scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                sent_at TIMESTAMP,
                failed_at TIMESTAMP,
                provider_id INTEGER REFERENCES email_providers(id),
                provider_message_id VARCHAR(255),
                error_message TEXT,
                error_code VARCHAR(50),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ email_queue tablosu oluşturuldu');

        // 10. EMAIL LOGS TABLOSU
        console.log('🔟 email_logs tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE email_logs (
                id SERIAL PRIMARY KEY,
                queue_id INTEGER REFERENCES email_queue(id) ON DELETE SET NULL,
                user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                to_email VARCHAR(255) NOT NULL,
                from_email VARCHAR(255),
                subject VARCHAR(500) NOT NULL,
                status VARCHAR(20) NOT NULL,
                sent_at TIMESTAMP,
                failed_at TIMESTAMP,
                provider_id INTEGER REFERENCES email_providers(id),
                provider_message_id VARCHAR(255),
                error_message TEXT,
                error_code VARCHAR(50),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ email_logs tablosu oluşturuldu');
        console.log('');

        // ===== BİLDİRİM SİSTEMİ TABLOLARI =====
        console.log('📋 Bildirim sistemi tabloları oluşturuluyor...');

        // 11. NOTIFICATIONS TABLOSU
        console.log('1️⃣1️⃣ notifications tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE notifications (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                title VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                is_read BOOLEAN DEFAULT false,
                read_at TIMESTAMP,
                sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                link VARCHAR(500),
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ notifications tablosu oluşturuldu');

        // 12. NOTIFICATION LOGS TABLOSU
        console.log('1️⃣2️⃣ notification_logs tablosu oluşturuluyor...');
        await client.query(`
            CREATE TABLE notification_logs (
                id SERIAL PRIMARY KEY,
                sent_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
                sent_by_name VARCHAR(255),
                title VARCHAR(500) NOT NULL,
                message TEXT NOT NULL,
                type VARCHAR(50) DEFAULT 'info',
                recipient_count INTEGER DEFAULT 0,
                recipient_user_ids INTEGER[],
                sent_count INTEGER DEFAULT 0,
                read_count INTEGER DEFAULT 0,
                metadata JSONB DEFAULT '{}'::jsonb,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);
        console.log('   ✅ notification_logs tablosu oluşturuldu');
        console.log('');

        // ===== İNDEKSLER =====
        console.log('📊 İndeksler oluşturuluyor...');

        // Temel tablolar indeksleri
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_role_id ON users(role_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_menus_order ON menus(order_index)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_menus_category ON menus(category)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_menus_category_order ON menus(category_order_index)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_menus_menu_order ON menus(menu_order_index)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_role_menus_role_id ON role_menus(role_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_role_menus_menu_id ON role_menus(menu_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at)`);

        // Cron sistemi indeksleri
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_name ON cron_jobs(name)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cron_jobs_enabled ON cron_jobs(is_enabled)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cron_job_logs_job_name ON cron_job_logs(job_name)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cron_job_logs_started_at ON cron_job_logs(started_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_cron_job_logs_status ON cron_job_logs(status)`);

        // Email sistemi indeksleri
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_providers_active ON email_providers(is_active, is_default)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_status ON email_queue(status, scheduled_at)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_user_id ON email_queue(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_priority ON email_queue(priority DESC, scheduled_at ASC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_queue_provider ON email_queue(provider_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_queue_id ON email_logs(queue_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(status)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_email_logs_sent_at ON email_logs(sent_at DESC)`);

        // Bildirim sistemi indeksleri
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_read ON notifications(user_id, is_read)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_by ON notification_logs(sent_by)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_notification_logs_created_at ON notification_logs(created_at DESC)`);

        console.log('   ✅ Tüm indeksler oluşturuldu');
        console.log('');

        // ===== TRİGGER'LAR =====
        console.log('⚡ Trigger\'lar oluşturuluyor...');

        // Updated_at trigger fonksiyonu (cron_jobs için)
        await client.query(`
            CREATE OR REPLACE FUNCTION update_cron_jobs_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_cron_jobs_updated_at ON cron_jobs;

            CREATE TRIGGER trigger_update_cron_jobs_updated_at
            BEFORE UPDATE ON cron_jobs
            FOR EACH ROW
            EXECUTE FUNCTION update_cron_jobs_updated_at();
        `);

        // Updated_at trigger fonksiyonu (email tabloları için)
        await client.query(`
            CREATE OR REPLACE FUNCTION update_email_tables_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_email_providers_updated_at ON email_providers;
            DROP TRIGGER IF EXISTS trigger_update_email_queue_updated_at ON email_queue;

            CREATE TRIGGER trigger_update_email_providers_updated_at
            BEFORE UPDATE ON email_providers
            FOR EACH ROW
            EXECUTE FUNCTION update_email_tables_updated_at();

            CREATE TRIGGER trigger_update_email_queue_updated_at
            BEFORE UPDATE ON email_queue
            FOR EACH ROW
            EXECUTE FUNCTION update_email_tables_updated_at();
        `);

        // Updated_at trigger fonksiyonu (notifications için)
        await client.query(`
            CREATE OR REPLACE FUNCTION update_notifications_updated_at()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.updated_at = CURRENT_TIMESTAMP;
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;

            DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;

            CREATE TRIGGER trigger_update_notifications_updated_at
            BEFORE UPDATE ON notifications
            FOR EACH ROW
            EXECUTE FUNCTION update_notifications_updated_at();
        `);

        console.log('   ✅ Tüm trigger\'lar oluşturuldu');
        console.log('');

        await client.query('COMMIT');

        console.log('╔════════════════════════════════════════════════╗');
        console.log('║  ✅ Migration başarıyla tamamlandı!           ║');
        console.log('╚════════════════════════════════════════════════╝');
        console.log('');
        console.log('📝 Oluşturulan tablolar:');
        console.log('   📋 Temel Tablolar:');
        console.log('      • roles - Rol yönetimi');
        console.log('      • users - Kullanıcı yönetimi');
        console.log('      • menus - Menü yönetimi');
        console.log('      • role_menus - Rol-menü yetkileri');
        console.log('      • audit_logs - İşlem logları');
        console.log('   ⏰ Cron Sistemi:');
        console.log('      • cron_jobs - Zamanlanmış işler');
        console.log('      • cron_job_logs - Cron job logları');
        console.log('   📧 Email Sistemi:');
        console.log('      • email_providers - SMTP ayarları');
        console.log('      • email_queue - Email kuyruğu');
        console.log('      • email_logs - Email gönderim geçmişi');
        console.log('   🔔 Bildirim Sistemi:');
        console.log('      • notifications - Kullanıcı bildirimleri');
        console.log('      • notification_logs - Bildirim gönderim geçmişi');
        console.log('');
        console.log('💡 Sonraki adım: Seed verilerini eklemek için `node scripts/seed.js` çalıştırın');
        console.log('');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Migration hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

async function rollback() {
    const client = await pool.connect();

    try {
        console.log('🔄 Rollback başlıyor...');
        console.log('');

        await client.query('BEGIN');

        // Trigger'ları kaldır
        console.log('1️⃣ Trigger\'lar kaldırılıyor...');
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_cron_jobs_updated_at ON cron_jobs`);
        await client.query(`DROP FUNCTION IF EXISTS update_cron_jobs_updated_at()`);
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_email_providers_updated_at ON email_providers`);
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_email_queue_updated_at ON email_queue`);
        await client.query(`DROP FUNCTION IF EXISTS update_email_tables_updated_at()`);
        await client.query(`DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications`);
        await client.query(`DROP FUNCTION IF EXISTS update_notifications_updated_at()`);
        console.log('   ✅ Trigger\'lar kaldırıldı');
        console.log('');

        // Tabloları ters sırada sil (foreign key constraints nedeniyle)
        console.log('2️⃣ Tablolar kaldırılıyor...');
        await client.query(`DROP TABLE IF EXISTS notification_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS notifications CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_queue CASCADE`);
        await client.query(`DROP TABLE IF EXISTS email_providers CASCADE`);
        await client.query(`DROP TABLE IF EXISTS cron_job_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS cron_jobs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS audit_logs CASCADE`);
        await client.query(`DROP TABLE IF EXISTS role_menus CASCADE`);
        await client.query(`DROP TABLE IF EXISTS menus CASCADE`);
        await client.query(`DROP TABLE IF EXISTS users CASCADE`);
        await client.query(`DROP TABLE IF EXISTS roles CASCADE`);
        console.log('   ✅ Tüm tablolar kaldırıldı');
        console.log('');

        await client.query('COMMIT');

        console.log('✅ Rollback başarıyla tamamlandı!');
        console.log('');

    } catch (error) {
        await client.query('ROLLBACK');
        console.error('❌ Rollback hatası:', error);
        throw error;
    } finally {
        client.release();
    }
}

// CLI kullanımı
if (require.main === module) {
    const args = process.argv.slice(2);
    const isRollback = args.includes('--rollback');

    (isRollback ? rollback() : runMigration())
        .then(() => {
            console.log('👋 Migration script sonlandı');
            process.exit(0);
        })
        .catch((error) => {
            console.error('💥 Fatal error:', error);
            process.exit(1);
        });
}

module.exports = { runMigration, rollback };
