require('dotenv').config();
const { Pool } = require('pg');
const { logger } = require('../utils/logger');

// PostgreSQL bağlantı konfigürasyonu
const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'borc_takip_sistemi',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
    max: 20, // Maksimum bağlantı sayısı
    idleTimeoutMillis: 30000, // Boşta kalma süresi
    connectionTimeoutMillis: 2000, // Bağlantı timeout
});

// Bağlantı testi
pool.on('connect', () => {
    logger.info('✅ PostgreSQL veritabanına bağlandı');
});

pool.on('error', (err) => {
    logger.error('❌ PostgreSQL bağlantı hatası:', err);
    process.exit(-1);
});

// Veritabanı bağlantısını test et
const testConnection = async () => {
    try {
        const client = await pool.connect();
        const result = await client.query('SELECT NOW()');
        logger.info('📊 Veritabanı bağlantı testi başarılı:', result.rows[0].now);
        client.release();
    } catch (err) {
        logger.error('❌ Veritabanı bağlantı testi başarısız:', err);
        throw err;
    }
};

// Güvenli query fonksiyonu
const query = async (text, params) => {
    const start = Date.now();
    try {
        const result = await pool.query(text, params);
        const duration = Date.now() - start;
        logger.debug('Query executed', { text, duration, rows: result.rowCount });
        return result;
    } catch (error) {
        logger.error('Database query error:', { text, error: error.message });
        throw error;
    }
};

// Transaction wrapper
const transaction = async (callback) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        const result = await callback(client);
        await client.query('COMMIT');
        return result;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

module.exports = {
    pool,
    query,
    transaction,
    testConnection
};



