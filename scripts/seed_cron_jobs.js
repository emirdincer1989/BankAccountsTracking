const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

async function seedCronJobs() {
    try {
        const jobs = [
            {
                name: 'bankSyncJob',
                schedule: '*/30 * * * *', // Every 30 minutes
                is_active: true,
                description: 'Otomatik banka hesap senkronizasyonu'
            },
            {
                name: 'emailQueueProcessor',
                schedule: '*/1 * * * *', // Every minute
                is_active: true,
                description: 'E-posta kuyruğunu işler'
            }
        ];

        for (const job of jobs) {
            const check = await pool.query('SELECT id FROM cron_jobs WHERE name = $1', [job.name]);
            if (check.rows.length === 0) {
                await pool.query(
                    'INSERT INTO cron_jobs (name, schedule, is_active, description) VALUES ($1, $2, $3, $4)',
                    [job.name, job.schedule, job.is_active, job.description]
                );
                console.log(`Inserted job: ${job.name}`);
            } else {
                console.log(`Job already exists: ${job.name}`);
            }
        }
    } catch (err) {
        console.error(err);
    } finally {
        await pool.end();
    }
}

seedCronJobs();
