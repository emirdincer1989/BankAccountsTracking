#!/bin/bash
# Cron Job Debug Script
# SSH terminalden çalıştırılabilir

echo "=========================================="
echo "🔍 CRON JOB DEBUG KONTROLÜ"
echo "=========================================="
echo ""

# Proje dizinine git (kendi dizininize göre güncelleyin)
PROJECT_DIR="/path/to/BankAccountsTracking"  # Buraya kendi proje dizininizi yazın
cd "$PROJECT_DIR" || exit 1

# 1. Veritabanından job durumunu kontrol et
echo "📋 1. VERİTABANI JOB DURUMU:"
echo "----------------------------------------"
node -e "
require('dotenv').config();
const { query } = require('./config/database');
(async () => {
    const result = await query('SELECT name, schedule, is_enabled, last_run_at, last_run_status FROM cron_jobs WHERE name = \$1', ['bankSyncJob']);
    if (result.rows.length > 0) {
        const job = result.rows[0];
        console.log('Job Adı:', job.name);
        console.log('Schedule:', job.schedule);
        console.log('Aktif:', job.is_enabled ? 'EVET ✅' : 'HAYIR ❌');
        console.log('Son Çalışma:', job.last_run_at || 'Henüz çalışmadı');
        console.log('Son Durum:', job.last_run_status || 'N/A');
    } else {
        console.log('❌ bankSyncJob bulunamadı!');
    }
    process.exit(0);
})();
"
echo ""

# 2. Son log kayıtlarını kontrol et
echo "📝 2. SON LOG KAYITLARI (Son 10):"
echo "----------------------------------------"
node -e "
require('dotenv').config();
const { query } = require('./config/database');
(async () => {
    const result = await query('SELECT id, job_name, status, started_at, completed_at, duration, error_message FROM cron_job_logs WHERE job_name = \$1 ORDER BY started_at DESC LIMIT 10', ['bankSyncJob']);
    if (result.rows.length > 0) {
        result.rows.forEach((log, index) => {
            console.log(\`\${index + 1}. ID: \${log.id} | Durum: \${log.status} | Başlangıç: \${log.started_at || 'N/A'} | Bitiş: \${log.completed_at || 'N/A'} | Süre: \${log.duration || 0}ms\`);
            if (log.error_message) {
                console.log(\`   Hata: \${log.error_message}\`);
            }
        });
    } else {
        console.log('❌ Hiç log kaydı bulunamadı!');
    }
    process.exit(0);
})();
"
echo ""

# 3. Node.js log dosyalarını kontrol et
echo "📄 3. NODE.JS LOG DOSYALARI:"
echo "----------------------------------------"
if [ -f "logs/combined.log" ]; then
    echo "✅ combined.log bulundu"
    echo "Son 20 satır (bankSyncJob ile ilgili):"
    tail -n 100 logs/combined.log | grep -i "bankSyncJob\|schedule\|cron" | tail -n 20
else
    echo "❌ logs/combined.log bulunamadı"
fi
echo ""

if [ -f "logs/error.log" ]; then
    echo "✅ error.log bulundu"
    echo "Son 10 hata satırı:"
    tail -n 10 logs/error.log
else
    echo "❌ logs/error.log bulunamadı"
fi
echo ""

# 4. Process kontrolü
echo "🔄 4. NODE.JS PROCESS KONTROLÜ:"
echo "----------------------------------------"
ps aux | grep "node.*server.js\|node.*pm2" | grep -v grep
echo ""

# 5. Takılı kalmış job'ları kontrol et
echo "⚠️  5. TAKILI KALMIŞ JOB KONTROLÜ:"
echo "----------------------------------------"
node -e "
require('dotenv').config();
const { query } = require('./config/database');
(async () => {
    const result = await query(\`
        SELECT id, job_name, started_at, 
               EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as seconds_ago
        FROM cron_job_logs
        WHERE job_name = \$1 AND status = 'RUNNING'
        ORDER BY started_at ASC
    \`, ['bankSyncJob']);
    if (result.rows.length > 0) {
        console.log('⚠️  Takılı kalmış job bulundu:');
        result.rows.forEach(log => {
            const minutes = Math.floor(log.seconds_ago / 60);
            console.log(\`   ID: \${log.id} | \${minutes} dakika önce başladı\`);
        });
    } else {
        console.log('✅ Takılı kalmış job yok');
    }
    process.exit(0);
})();
"
echo ""

echo "=========================================="
echo "✅ Kontrol tamamlandı"
echo "=========================================="

