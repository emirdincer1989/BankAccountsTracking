/**
 * Cron Management Page
 *
 * Zamanlanmış işleri yönetme sayfası.
 */

export async function loadContent() {
    try {
        const html = `
            <div class="row mb-4">
                <div class="col-12">
                    <div class="d-flex justify-content-between align-items-center">
                        <div>
                            <h4 class="mb-1">⏰ Cron Job Yönetimi</h4>
                            <p class="text-muted mb-0">Zamanlanmış işleri yönetin</p>
                        </div>
                        <div>
                            <button id="refresh-jobs-btn" class="btn btn-primary">
                                <i class="ri-refresh-line"></i> Yenile
                            </button>
                            <button id="view-logs-btn" class="btn btn-info ms-2">
                                <i class="ri-file-list-line"></i> Loglar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- İstatistikler -->
            <div id="stats-container" class="row mb-4">
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="avatar-sm">
                                        <span class="avatar-title bg-primary-subtle text-primary rounded-circle fs-3">
                                            <i class="ri-checkbox-circle-line"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <p class="text-muted mb-1">Toplam Job</p>
                                    <h4 class="mb-0" id="stat-total">-</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="avatar-sm">
                                        <span class="avatar-title bg-success-subtle text-success rounded-circle fs-3">
                                            <i class="ri-play-circle-line"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <p class="text-muted mb-1">Aktif</p>
                                    <h4 class="mb-0 text-success" id="stat-enabled">-</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="avatar-sm">
                                        <span class="avatar-title bg-warning-subtle text-warning rounded-circle fs-3">
                                            <i class="ri-pause-circle-line"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <p class="text-muted mb-1">Pasif</p>
                                    <h4 class="mb-0 text-warning" id="stat-disabled">-</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="col-md-3">
                    <div class="card">
                        <div class="card-body">
                            <div class="d-flex align-items-center">
                                <div class="flex-shrink-0">
                                    <div class="avatar-sm">
                                        <span class="avatar-title bg-info-subtle text-info rounded-circle fs-3">
                                            <i class="ri-time-line"></i>
                                        </span>
                                    </div>
                                </div>
                                <div class="flex-grow-1 ms-3">
                                    <p class="text-muted mb-1">Son 24 Saat</p>
                                    <h4 class="mb-0 text-info" id="stat-24h">-</h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cron Jobs Listesi -->
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h5 class="card-title mb-0">Zamanlanmış İşler</h5>
                        </div>
                        <div class="card-body">
                            <div id="jobs-container">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Yükleniyor...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Schedule Düzenleme Modal -->
            <div class="modal fade" id="scheduleModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Schedule Düzenle</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Job Adı</label>
                                <input type="text" class="form-control" id="schedule-job-name" readonly>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Cron Schedule</label>
                                <select class="form-select" id="schedule-select">
                                    <option value="* * * * *">Her dakika</option>
                                    <option value="*/2 * * * *">Her 2 dakikada</option>
                                    <option value="*/5 * * * *">Her 5 dakikada</option>
                                    <option value="*/10 * * * *">Her 10 dakikada</option>
                                    <option value="*/15 * * * *">Her 15 dakikada</option>
                                    <option value="*/30 * * * *">Her 30 dakikada</option>
                                    <option value="0 * * * *">Her saat başı</option>
                                    <option value="0 */2 * * *">Her 2 saatte</option>
                                    <option value="0 0 * * *">Her gün gece yarısı</option>
                                </select>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="button" class="btn btn-primary" id="save-schedule-btn">Kaydet</button>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Loglar Modal -->
            <div class="modal fade" id="logsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Cron Job Logları</h5>
                            <div class="d-flex gap-2">
                                <button id="clear-logs-btn" class="btn btn-danger btn-sm" title="Tüm logları temizle">
                                    <i class="ri-delete-bin-line"></i> Logları Temizle
                                </button>
                                <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                            </div>
                        </div>
                        <div class="modal-body">
                            <div id="logs-content" style="max-height: 500px; overflow-y: auto;">
                                <div class="text-center py-5">
                                    <div class="spinner-border text-primary" role="status">
                                        <span class="visually-hidden">Yükleniyor...</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Cron Job Result Modal -->
            <div class="modal fade" id="cronResultModal" tabindex="-1">
                <div class="modal-dialog">
                    <div class="modal-content">
                        <div class="modal-header bg-success text-white">
                            <h5 class="modal-title" id="cronResultTitle">Cron Job Çalıştı</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div id="cronResultBody">
                                <!-- Job result buraya gelecek -->
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-primary" data-bs-dismiss="modal">Tamam</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {
            html,
            title: 'Cron Yönetimi'
        };
    } catch (error) {
        console.error('Cron management content error:', error);
        return {
            html: '<div class="alert alert-danger">Sayfa yüklenirken hata oluştu!</div>',
            title: 'Cron Yönetimi'
        };
    }
}

export function init() {
    // DOM'un hazır olmasını bekle
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializePage();
        });
    } else {
        // DOM zaten hazırsa hemen başlat
        setTimeout(initializePage, 100);
    }
}

function initializePage() {
    // Elementlerin varlığını kontrol et
    const jobsContainer = document.getElementById('jobs-container');
    const statTotal = document.getElementById('stat-total');

    if (!jobsContainer || !statTotal) {
        console.warn('DOM elementleri henüz hazır değil, tekrar deneniyor...');
        setTimeout(initializePage, 200);
        return;
    }

    setupEventListeners();
    loadAllData();

    // Otomatik yenileme (30 saniyede bir)
    if (window.cronRefreshInterval) {
        clearInterval(window.cronRefreshInterval);
    }
    window.cronRefreshInterval = setInterval(loadAllData, 30000);

    console.log('Cron management page initialized');
}

function setupEventListeners() {
    const refreshBtn = document.getElementById('refresh-jobs-btn');
    if (refreshBtn && !refreshBtn.dataset.listenerAdded) {
        refreshBtn.dataset.listenerAdded = 'true';
        refreshBtn.addEventListener('click', loadAllData);
    }

    const logsBtn = document.getElementById('view-logs-btn');
    if (logsBtn && !logsBtn.dataset.listenerAdded) {
        logsBtn.dataset.listenerAdded = 'true';
        logsBtn.addEventListener('click', showLogsModal);
    }

    const saveScheduleBtn = document.getElementById('save-schedule-btn');
    if (saveScheduleBtn && !saveScheduleBtn.dataset.listenerAdded) {
        saveScheduleBtn.dataset.listenerAdded = 'true';
        saveScheduleBtn.addEventListener('click', saveSchedule);
    }

    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn && !clearLogsBtn.dataset.listenerAdded) {
        clearLogsBtn.dataset.listenerAdded = 'true';
        clearLogsBtn.addEventListener('click', clearLogs);
    }
}

async function loadAllData() {
    try {
        await Promise.all([
            loadJobs(),
            loadStats()
        ]);
    } catch (error) {
        console.error('Veri yükleme hatası:', error);
        showError('Veriler yüklenirken hata oluştu');
    }
}

async function loadJobs() {
    try {
        // Eğer sayfa değiştiyse ve container yoksa işlem yapma
        if (!document.getElementById('jobs-container')) return;

        const response = await fetch('/api/cron-management/jobs');
        if (!response.ok) throw new Error('API hatası');

        const result = await response.json();
        renderJobs(result.data.jobs, result.data.summary);

    } catch (error) {
        console.error('Job yükleme hatası:', error);
        const container = document.getElementById('jobs-container');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    <i class="ri-error-warning-line me-2"></i>
                    Job'lar yüklenirken hata oluştu: ${error.message}
                </div>
            `;
        }
    }
}

async function loadStats() {
    try {
        // Eğer sayfa değiştiyse işlem yapma
        if (!document.getElementById('stats-container')) return;

        const response = await fetch('/api/cron-management/stats');
        if (!response.ok) throw new Error('API hatası');

        const result = await response.json();

        // Summary stats'ları yükle (jobs endpoint'inden gelecek)
        const jobsResponse = await fetch('/api/cron-management/jobs');
        const jobsResult = await jobsResponse.json();

        // Elementlerin varlığını kontrol et
        const statTotal = document.getElementById('stat-total');
        const statEnabled = document.getElementById('stat-enabled');
        const statDisabled = document.getElementById('stat-disabled');
        const stat24h = document.getElementById('stat-24h');

        if (statTotal) statTotal.textContent = jobsResult.data.summary.total;
        if (statEnabled) statEnabled.textContent = jobsResult.data.summary.enabled;
        if (statDisabled) statDisabled.textContent = jobsResult.data.summary.disabled;
        if (stat24h) stat24h.textContent = result.data.last24Hours?.totalRuns || 0;

    } catch (error) {
        console.error('Stats yükleme hatası:', error);
    }
}

function renderJobs(jobs, summary) {
    const container = document.getElementById('jobs-container');

    if (!container) {
        // Container yoksa (sayfa değişmiş olabilir) işlemi durdur
        return;
    }

    if (!jobs || jobs.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                <i class="ri-information-line me-2"></i>
                Henüz tanımlı cron job yok.
            </div>
        `;
        return;
    }

    const html = jobs.map(job => {
        const statusBadge = job.isEnabled
            ? '<span class="badge bg-success">Aktif</span>'
            : '<span class="badge bg-secondary">Pasif</span>';

        const lastRunBadge = job.lastRunStatus === 'SUCCESS'
            ? '<span class="badge bg-success-subtle text-success">Başarılı</span>'
            : job.lastRunStatus === 'FAILED'
                ? '<span class="badge bg-danger-subtle text-danger">Hatalı</span>'
                : '<span class="badge bg-secondary">Henüz çalışmadı</span>';

        const lastRunText = job.lastRun
            ? `${formatDate(job.lastRun)} (${job.lastRunDuration}ms)`
            : 'Henüz çalışmadı';

        return `
            <div class="card mb-3 border">
                <div class="card-body">
                    <div class="row align-items-center">
                        <div class="col-md-6">
                            <h5 class="mb-1">
                                ${job.title}
                                ${statusBadge}
                            </h5>
                            <p class="text-muted mb-2">${job.description || ''}</p>
                            <div class="d-flex gap-3 text-muted small">
                                <span><i class="ri-time-line"></i> ${job.scheduleText}</span>
                                <span><i class="ri-bar-chart-line"></i> ${job.successRate}% başarı</span>
                                <span><i class="ri-play-list-line"></i> ${job.runCount} çalışma</span>
                            </div>
                        </div>
                        <div class="col-md-3">
                            <div class="text-muted small">Son Çalışma</div>
                            <div class="mb-1">${lastRunText}</div>
                            ${lastRunBadge}
                        </div>
                        <div class="col-md-3 text-end">
                            <div class="btn-group" role="group">
                                <button class="btn btn-sm btn-${job.isEnabled ? 'warning' : 'success'} toggle-job-btn"
                                        data-job-name="${job.name}"
                                        data-enabled="${!job.isEnabled}"
                                        title="${job.isEnabled ? 'Durdur' : 'Başlat'}">
                                    <i class="ri-${job.isEnabled ? 'pause' : 'play'}-line"></i>
                                </button>
                                <button class="btn btn-sm btn-primary trigger-job-btn"
                                        data-job-name="${job.name}"
                                        title="Manuel Çalıştır">
                                    <i class="ri-play-circle-line"></i>
                                </button>
                                <button class="btn btn-sm btn-info edit-schedule-btn"
                                        data-job-name="${job.name}"
                                        data-schedule="${job.schedule}"
                                        title="Schedule Düzenle">
                                    <i class="ri-edit-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;

    // Event listeners'ı ekle
    document.querySelectorAll('.toggle-job-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') return;
        btn.dataset.listenerAdded = 'true';
        btn.addEventListener('click', () => {
            toggleJob(btn.dataset.jobName, btn.dataset.enabled === 'true');
        });
    });

    document.querySelectorAll('.trigger-job-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') return;
        btn.dataset.listenerAdded = 'true';
        btn.addEventListener('click', () => {
            triggerJob(btn.dataset.jobName);
        });
    });

    document.querySelectorAll('.edit-schedule-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') return;
        btn.dataset.listenerAdded = 'true';
        btn.addEventListener('click', () => {
            editSchedule(btn.dataset.jobName, btn.dataset.schedule);
        });
    });
}

async function toggleJob(jobName, enabled) {
    try {
        const response = await fetch(`/api/cron-management/jobs/${jobName}/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'İşlem başarısız');

        showSuccess(result.message);
        await loadJobs();

    } catch (error) {
        console.error('Toggle hatası:', error);
        showError(error.message);
    }
}

async function triggerJob(jobName) {
    try {
        console.log('🔧 triggerJob çağrıldı:', jobName);
        showInfo('Job çalıştırılıyor...');

        const response = await fetch(`/api/cron-management/jobs/${jobName}/trigger`, {
            method: 'POST'
        });

        const result = await response.json();
        console.log('📦 API yanıtı:', result);

        if (!response.ok) throw new Error(result.message || 'İşlem başarısız');

        showSuccess(result.message);

        // Eğer job atlandıysa kullanıcıya bilgi ver
        if (result.data && result.data.skipped) {
            console.warn('⚠️ Job atlandı:', result.data.reason);
            
            if (result.data.reason === 'Already running') {
                showWarning(`Job şu anda çalışıyor. Eğer takılı kalmışsa, sayfayı yenileyip tekrar deneyin veya "Takılı Kalmış Job'ları Temizle" butonunu kullanın.`);
            } else {
                showWarning(`Job çalıştırılamadı: ${result.data.reason}`);
            }
        }
        // Eğer result data varsa ve message varsa modal göster
        else if (result.data && result.data.message) {
            console.log('✅ Modal gösteriliyor...');
            showCronResultModal(result.data.message);
        }

        await loadJobs();

    } catch (error) {
        console.error('❌ Trigger hatası:', error);
        showError(error.message);
    }
}

function showCronResultModal(message) {
    console.log('📋 showCronResultModal çağrıldı, message:', message);

    const modalEl = document.getElementById('cronResultModal');
    console.log('🔍 Modal element:', modalEl);

    if (!modalEl) {
        console.error('❌ cronResultModal elementi bulunamadı!');
        return;
    }

    const modal = new bootstrap.Modal(modalEl);
    const titleEl = document.getElementById('cronResultTitle');
    const bodyEl = document.getElementById('cronResultBody');

    console.log('🔍 Title element:', titleEl);
    console.log('🔍 Body element:', bodyEl);

    titleEl.textContent = message.title || 'Cron Job Sonucu';
    bodyEl.innerHTML = `
        <div class="alert alert-success">
            <h6 class="alert-heading"><i class="ri-check-circle-line me-2"></i>${message.title}</h6>
            <p class="mb-0">${message.body}</p>
            <hr>
            <p class="mb-0 small">
                <strong>Çalışma Sayısı:</strong> ${message.runCount}<br>
                <strong>Zaman:</strong> ${formatDate(message.timestamp)}
            </p>
        </div>
    `;

    console.log('✅ Modal gösteriliyor...');
    modal.show();
}

function editSchedule(jobName, currentSchedule) {
    document.getElementById('schedule-job-name').value = jobName;
    document.getElementById('schedule-select').value = currentSchedule;

    const modal = new bootstrap.Modal(document.getElementById('scheduleModal'));
    modal.show();
}

async function saveSchedule() {
    const jobName = document.getElementById('schedule-job-name').value;
    const schedule = document.getElementById('schedule-select').value;

    try {
        const response = await fetch(`/api/cron-management/jobs/${jobName}/schedule`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ schedule })
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.message || 'İşlem başarısız');

        showSuccess(result.message);

        const modal = bootstrap.Modal.getInstance(document.getElementById('scheduleModal'));
        modal.hide();

        await loadJobs();

    } catch (error) {
        console.error('Schedule kaydetme hatası:', error);
        showError(error.message);
    }
}

async function showLogsModal() {
    const modal = new bootstrap.Modal(document.getElementById('logsModal'));

    // Modal açıldığında clear logs butonunun event listener'ını kontrol et
    const clearLogsBtn = document.getElementById('clear-logs-btn');
    if (clearLogsBtn && !clearLogsBtn.dataset.listenerAdded) {
        clearLogsBtn.dataset.listenerAdded = 'true';
        clearLogsBtn.addEventListener('click', clearLogs);
    }

    modal.show();
    await loadLogs();
}

async function loadLogs() {
    try {
        const response = await fetch('/api/cron-management/logs?limit=50');
        const result = await response.json();

        if (!response.ok) throw new Error(result.message || 'Loglar yüklenemedi');

        renderLogs(result.data.logs);

    } catch (error) {
        console.error('Log yükleme hatası:', error);
        document.getElementById('logs-content').innerHTML = `
            <div class="alert alert-danger">Loglar yüklenirken hata oluştu: ${error.message}</div>
        `;
    }
}

function renderLogs(logs) {
    const container = document.getElementById('logs-content');

    if (!logs || logs.length === 0) {
        container.innerHTML = '<div class="alert alert-info">Log kaydı bulunamadı</div>';
        return;
    }

    const html = `
        <table class="table table-sm table-hover">
            <thead>
                <tr>
                    <th>Tarih</th>
                    <th>Job</th>
                    <th>Durum</th>
                    <th>Süre</th>
                    <th>Detay</th>
                </tr>
            </thead>
            <tbody>
                ${logs.map(log => {
        const statusBadge = log.status === 'SUCCESS'
            ? '<span class="badge bg-success">Başarılı</span>'
            : '<span class="badge bg-danger">Hatalı</span>';

        return `
                        <tr>
                            <td>${formatDate(log.started_at)}</td>
                            <td>${log.job_name}</td>
                            <td>${statusBadge}</td>
                            <td>${log.duration || 0}ms</td>
                            <td>
                                ${log.error_message
                ? `<span class="text-danger small">${log.error_message}</span>`
                : '<span class="text-muted small">-</span>'
            }
                            </td>
                        </tr>
                    `;
    }).join('')}
            </tbody>
        </table>
    `;

    container.innerHTML = html;
}

async function clearLogs() {
    try {
        // Kullanıcıdan onay al
        const confirmed = await showConfirmDelete({
            message: 'Tüm cron job loglarını temizlemek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
            title: 'Logları Temizle'
        });

        if (!confirmed) {
            return;
        }

        // Loading göster
        const loadingId = showLoading('Loglar temizleniyor...');

        // API çağrısı
        const response = await fetch('/api/cron-management/logs', {
            method: 'DELETE'
        });

        const result = await response.json();

        // Loading'i kaldır
        Notification.remove(loadingId);

        if (!response.ok) {
            throw new Error(result.message || 'Loglar temizlenirken hata oluştu');
        }

        showSuccess(result.message || 'Loglar başarıyla temizlendi');

        // Logları yeniden yükle
        await loadLogs();

    } catch (error) {
        console.error('Log temizleme hatası:', error);
        showError(error.message || 'Loglar temizlenirken bir hata oluştu');
    }
}

function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}
