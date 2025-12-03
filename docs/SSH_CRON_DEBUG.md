# 🔍 SSH Terminalden Cron Job Debug Komutları

## Hızlı Kontrol Komutları

### 1. Veritabanından Job Durumunu Kontrol Et

```bash
# Proje dizinine git
cd /path/to/BankAccountsTracking

# Job durumunu kontrol et
node -e "require('dotenv').config(); const { query } = require('./config/database'); (async () => { const result = await query('SELECT name, schedule, is_enabled, last_run_at, last_run_status FROM cron_jobs WHERE name = \$1', ['bankSyncJob']); console.log(JSON.stringify(result.rows[0], null, 2)); process.exit(0); })();"
```

### 2. Son Log Kayıtlarını Kontrol Et

```bash
# Son 10 log kaydı
node -e "require('dotenv').config(); const { query } = require('./config/database'); (async () => { const result = await query('SELECT id, job_name, status, started_at, completed_at, duration, error_message FROM cron_job_logs WHERE job_name = \$1 ORDER BY started_at DESC LIMIT 10', ['bankSyncJob']); result.rows.forEach((log, i) => console.log(\`\${i+1}. \${log.status} | \${log.started_at} | \${log.duration}ms\`)); process.exit(0); })();"
```

### 3. Takılı Kalmış Job'ları Kontrol Et

```bash
# RUNNING durumunda takılı kalmış job'lar
node -e "require('dotenv').config(); const { query } = require('./config/database'); (async () => { const result = await query(\`SELECT id, job_name, started_at, EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as seconds_ago FROM cron_job_logs WHERE job_name = \$1 AND status = 'RUNNING' ORDER BY started_at ASC\`, ['bankSyncJob']); if (result.rows.length > 0) { result.rows.forEach(log => console.log(\`Takılı: ID \${log.id}, \${Math.floor(log.seconds_ago/60)} dakika önce\`)); } else { console.log('Takılı job yok'); } process.exit(0); })();"
```

### 4. Node.js Log Dosyalarını Kontrol Et

```bash
# Combined log'dan bankSyncJob ile ilgili son satırlar
tail -n 200 logs/combined.log | grep -i "bankSyncJob\|schedule\|cron" | tail -n 30

# Error log'u kontrol et
tail -n 50 logs/error.log
```

### 5. Mevcut Script'i Kullan

```bash
# Hazır script'i çalıştır
node scripts/check_cron_status.js
```

## PostgreSQL'e Direkt Bağlanarak Kontrol

Eğer Node.js komutları çalışmıyorsa, PostgreSQL'e direkt bağlanabilirsiniz:

```bash
# PostgreSQL'e bağlan (kendi bilgilerinizle güncelleyin)
psql -h localhost -U postgres -d borc_takip_sistemi

# Job durumunu kontrol et
SELECT name, schedule, is_enabled, last_run_at, last_run_status 
FROM cron_jobs 
WHERE name = 'bankSyncJob';

# Son log kayıtlarını kontrol et
SELECT id, job_name, status, started_at, completed_at, duration, error_message 
FROM cron_job_logs 
WHERE job_name = 'bankSyncJob' 
ORDER BY started_at DESC 
LIMIT 10;

# Takılı kalmış job'ları kontrol et
SELECT id, job_name, started_at, 
       EXTRACT(EPOCH FROM (NOW() - started_at))::INTEGER as seconds_ago
FROM cron_job_logs
WHERE job_name = 'bankSyncJob' AND status = 'RUNNING'
ORDER BY started_at ASC;
```

## Sorun Tespiti

### Eğer Log Kaydı Yoksa:

1. **Job çalışmıyor olabilir** - `is_enabled` kontrolü yapın
2. **Schedule yanlış olabilir** - `schedule` değerini kontrol edin
3. **Node.js process çalışmıyor olabilir** - Process kontrolü yapın

### Process Kontrolü:

```bash
# Node.js process'lerini kontrol et
ps aux | grep node

# PM2 kullanıyorsanız
pm2 list
pm2 logs
```

### Manuel Tetikleme:

```bash
# API üzerinden manuel tetikleme (curl ile)
curl -X POST http://localhost:3000/api/cron-management/jobs/bankSyncJob/trigger \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json"
```

## Schedule Kontrolü

2 dakikada bir çalışması için schedule şu olmalı:
```
*/2 * * * *
```

Kontrol etmek için:
```sql
SELECT schedule FROM cron_jobs WHERE name = 'bankSyncJob';
```

## Önemli Notlar

- Log kayıtları `cron_job_logs` tablosunda tutulur
- Her job çalıştığında bir log kaydı oluşturulur
- Eğer hiç log kaydı yoksa, job hiç çalışmamış demektir
- Schedule güncellendiğinde Node.js process'i yeniden başlatmak gerekebilir

