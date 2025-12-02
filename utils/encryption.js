const crypto = require('crypto');
const bcrypt = require('bcrypt');

class DataEncryption {
    constructor() {
        this.algorithm = 'aes-256-gcm';
        // ENCRYPTION_MASTER_KEY veya ENCRYPTION_KEY .env dosyasında olmalı
        const keyString = process.env.ENCRYPTION_MASTER_KEY || process.env.ENCRYPTION_KEY;

        this.key = keyString
            ? crypto.scryptSync(keyString, 'salt', 32)
            : null;
    }

    // Hassas veri şifreleme (Kredi kartı, TC kimlik vb. için)
    // Kullanım: const encrypted = new DataEncryption().encrypt('hassas-veri')
    encrypt(data) {
        if (!this.key) {
            throw new Error('ENCRYPTION_MASTER_KEY environment variable bulunamadı!');
        }

        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv(this.algorithm, this.key, iv);
        cipher.setAAD(Buffer.from('additional data'));

        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');

        const authTag = cipher.getAuthTag();

        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        };
    }

    // Hassas veri şifre çözme
    // Kullanım: const decrypted = new DataEncryption().decrypt(encryptedData)
    decrypt(encryptedData) {
        if (!this.key) {
            throw new Error('ENCRYPTION_MASTER_KEY environment variable bulunamadı!');
        }

        const iv = Buffer.from(encryptedData.iv, 'hex');
        const decipher = crypto.createDecipheriv(this.algorithm, this.key, iv);
        decipher.setAAD(Buffer.from('additional data'));
        decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));

        let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');

        return decrypted;
    }

    // Şifre hashleme
    static async hashPassword(password) {
        const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Şifre doğrulama
    static async verifyPassword(password, hashedPassword) {
        return await bcrypt.compare(password, hashedPassword);
    }

    // JWT token oluşturma
    static generateToken(payload) {
        const jwt = require('jsonwebtoken');
        return jwt.sign(payload, process.env.JWT_SECRET, {
            expiresIn: process.env.JWT_EXPIRES_IN || '24h'
        });
    }

    // JWT token doğrulama
    static verifyToken(token) {
        const jwt = require('jsonwebtoken');
        return jwt.verify(token, process.env.JWT_SECRET);
    }
}

module.exports = DataEncryption;






