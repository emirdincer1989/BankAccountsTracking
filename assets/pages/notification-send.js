/**
 * Bildirim Gönder Sayfası
 * Süper admin kullanıcılara bildirim gönderme sayfası.
 */

export async function loadContent() {
    try {
        // Kullanıcıları yükle
        const usersResponse = await fetch('/api/users?page=1&limit=1000&search=', {
            credentials: 'include'
        });
        const usersData = await usersResponse.json();

        const users = usersData.success ? usersData.data.users : [];

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title mb-0">
                                <i class="ri-notification-line me-2"></i>
                                Bildirim Gönder
                            </h4>
                            <p class="text-muted mb-0">Kullanıcılara bildirim gönderin</p>
                        </div>
                        <div class="card-body">
                            <form id="notificationSendForm">
                                <div class="row">
                                    <div class="col-lg-4">
                                        <h5 class="mb-3">
                                            <i class="ri-user-line me-2 text-primary"></i>
                                            Kullanıcı Seçimi
                                        </h5>

                                        <div class="mb-3">
                                            <div class="d-flex justify-content-between align-items-center mb-2">
                                                <label class="form-label mb-0">Alıcılar <span class="text-danger">*</span></label>
                                                <div>
                                                    <button type="button" class="btn btn-sm btn-outline-primary" id="selectAllBtn">
                                                        Tümünü Seç
                                                    </button>
                                                    <button type="button" class="btn btn-sm btn-outline-secondary ms-1" id="deselectAllBtn">
                                                        Temizle
                                                    </button>
                                                </div>
                                            </div>
                                            <div class="border rounded p-3" style="max-height: 400px; overflow-y: auto;">
                                                ${users.length === 0 ? 
                                                    '<p class="text-muted text-center mb-0">Kullanıcı bulunamadı</p>' :
                                                    users.map(user => `
                                                        <div class="form-check mb-2">
                                                            <input class="form-check-input user-checkbox" type="checkbox" 
                                                                   value="${user.id}" id="user_${user.id}">
                                                            <label class="form-check-label" for="user_${user.id}">
                                                                ${user.name} 
                                                                <span class="text-muted">(${user.email || 'Email yok'})</span>
                                                            </label>
                                                        </div>
                                                    `).join('')
                                                }
                                            </div>
                                            <div class="form-text">
                                                <span id="selectedCount">0</span> kullanıcı seçildi
                                            </div>
                                        </div>
                                    </div>

                                    <div class="col-lg-8">
                                        <h5 class="mb-3">
                                            <i class="ri-notification-3-line me-2 text-success"></i>
                                            Bildirim İçeriği
                                        </h5>

                                        <div class="mb-3">
                                            <label class="form-label">Başlık <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="notificationTitle" 
                                                   placeholder="Bildirim başlığı" required maxlength="500">
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Mesaj <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="notificationMessage" rows="6" 
                                                      placeholder="Bildirim mesajı..." required></textarea>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Tip</label>
                                            <select class="form-select" id="notificationType">
                                                <option value="info" selected>Bilgi</option>
                                                <option value="success">Başarılı</option>
                                                <option value="warning">Uyarı</option>
                                                <option value="error">Hata</option>
                                            </select>
                                            <div class="form-text">Bildirim tipi görsel olarak farklı renklerle gösterilir</div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Link (Opsiyonel)</label>
                                            <input type="text" class="form-control" id="notificationLink" 
                                                   placeholder="/dashboard veya /users (bildirime tıklayınca gidilecek sayfa)" maxlength="500">
                                            <div class="form-text">Bildirime tıklayınca yönlendirilecek sayfa</div>
                                        </div>

                                        <div class="alert alert-info">
                                            <h6 class="alert-heading">
                                                <i class="ri-information-line me-1"></i>
                                                Bilgilendirme
                                            </h6>
                                            <ul class="mb-0 small">
                                                <li>Bildirimler anında gönderilir ve kullanıcılar header'daki bildirim ikonundan görebilir</li>
                                                <li>Bildirim gönderim durumunu "Bildirim İstatistikleri" sayfasından takip edebilirsiniz</li>
                                                <li>Okunma durumunu takip edebilirsiniz</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex gap-2 mt-4">
                                    <button type="submit" class="btn btn-primary" id="sendNotificationBtn">
                                        <i class="ri-send-plane-line me-1"></i>
                                        Bildirim Gönder
                                    </button>
                                    <button type="button" class="btn btn-outline-secondary" id="previewBtn">
                                        <i class="ri-eye-line me-1"></i>
                                        Önizleme
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {
            html,
            title: 'Bildirim Gönder'
        };
    } catch (error) {
        console.error('Notification send content error:', error);
        return {
            html: '<div class="alert alert-danger">Sayfa yüklenirken hata oluştu!</div>',
            title: 'Hata'
        };
    }
}

export function init() {
    setupEventListeners();
    updateSelectedCount();
}

function setupEventListeners() {
    // Form submit
    const form = document.getElementById('notificationSendForm');
    if (form && !form.dataset.listenerAdded) {
        form.dataset.listenerAdded = 'true';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendNotifications();
        });
    }

    // Select all / Deselect all
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    
    if (selectAllBtn && !selectAllBtn.dataset.listenerAdded) {
        selectAllBtn.dataset.listenerAdded = 'true';
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.user-checkbox').forEach(cb => {
                cb.checked = true;
            });
            updateSelectedCount();
        });
    }

    if (deselectAllBtn && !deselectAllBtn.dataset.listenerAdded) {
        deselectAllBtn.dataset.listenerAdded = 'true';
        deselectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.user-checkbox').forEach(cb => {
                cb.checked = false;
            });
            updateSelectedCount();
        });
    }

    // Checkbox change - selected count update
    document.querySelectorAll('.user-checkbox').forEach(cb => {
        if (!cb.dataset.listenerAdded) {
            cb.dataset.listenerAdded = 'true';
            cb.addEventListener('change', updateSelectedCount);
        }
    });

    // Preview button
    const previewBtn = document.getElementById('previewBtn');
    if (previewBtn && !previewBtn.dataset.listenerAdded) {
        previewBtn.dataset.listenerAdded = 'true';
        previewBtn.addEventListener('click', showPreview);
    }
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('.user-checkbox:checked').length;
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selected;
    }
}

async function sendNotifications() {
    // Seçili kullanıcıları al
    const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedUsers.length === 0) {
        showWarning('Lütfen en az bir kullanıcı seçin');
        return;
    }

    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;
    const link = document.getElementById('notificationLink').value.trim() || null;

    if (!title || !message) {
        showWarning('Başlık ve mesaj zorunludur');
        return;
    }

    const confirmed = await showConfirmDelete({
        title: 'Bildirim Gönder',
        message: `${selectedUsers.length} kullanıcıya bildirim gönderilecek. Devam etmek istiyor musunuz?`
    });

    if (!confirmed) {
        return;
    }

    const loadingId = showLoading('Bildirimler gönderiliyor...');

    try {
        const response = await fetch('/api/notification-management/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({
                user_ids: selectedUsers,
                title: title,
                message: message,
                type: type,
                link: link
            })
        });

        const result = await response.json();

        Notification.remove(loadingId);

        if (result.success) {
            showSuccess(`${result.data.successCount} kullanıcıya bildirim gönderildi!`);
            // Formu temizle
            document.getElementById('notificationSendForm').reset();
            document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
            updateSelectedCount();
        } else {
            showError(result.message || 'Bildirim gönderilirken hata oluştu');
        }

    } catch (error) {
        Notification.remove(loadingId);
        showError('Bildirim gönderilirken bir hata oluştu: ' + error.message);
    }
}

function showPreview() {
    const title = document.getElementById('notificationTitle').value.trim();
    const message = document.getElementById('notificationMessage').value.trim();
    const type = document.getElementById('notificationType').value;

    if (!title || !message) {
        showWarning('Önizleme için başlık ve mesaj gerekli');
        return;
    }

    const typeConfig = {
        info: { class: 'info', icon: 'ri-information-line', color: '#299cdb' },
        success: { class: 'success', icon: 'ri-checkbox-circle-line', color: '#0ab39c' },
        warning: { class: 'warning', icon: 'ri-alert-line', color: '#f7b84b' },
        error: { class: 'danger', icon: 'ri-error-warning-line', color: '#f06548' }
    }[type] || typeConfig.info;

    const previewHtml = `
        <div class="alert alert-${typeConfig.class} mb-0">
            <div class="d-flex align-items-start">
                <div class="flex-shrink-0">
                    <i class="${typeConfig.icon} fs-20 me-2"></i>
                </div>
                <div class="flex-grow-1">
                    <h6 class="mb-1">${title}</h6>
                    <p class="mb-0">${message}</p>
                </div>
            </div>
        </div>
    `;

    Modal.custom({
        title: 'Bildirim Önizleme',
        content: previewHtml,
        size: 'md'
    });
}

