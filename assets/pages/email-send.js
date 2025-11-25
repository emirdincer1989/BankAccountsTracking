/**
 * Email Gönder Sayfası
 * Kullanıcılara manuel email gönderme sayfası.
 */

export async function loadContent() {
    try {
        // Kullanıcıları yükle
        const usersResponse = await fetch('/api/users?page=1&limit=1000&search=', {
            credentials: 'include' // Cookie gönderimi için
        });
        const usersData = await usersResponse.json();

        const users = usersData.success ? usersData.data.users : [];

        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title mb-0">
                                <i class="ri-mail-send-line me-2"></i>
                                Email Gönder
                            </h4>
                            <p class="text-muted mb-0">Kullanıcılara manuel email gönderin</p>
                        </div>
                        <div class="card-body">
                            <form id="emailSendForm">
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
                                                                   value="${user.id}" id="user_${user.id}"
                                                                   ${!user.email ? 'disabled' : ''}>
                                                            <label class="form-check-label" for="user_${user.id}">
                                                                ${user.name} 
                                                                <span class="text-muted">(${user.email || 'Email yok'})</span>
                                                                ${!user.email ? '<span class="badge bg-warning ms-1">Email yok</span>' : ''}
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
                                            <i class="ri-mail-line me-2 text-success"></i>
                                            Email İçeriği
                                        </h5>

                                        <div class="mb-3">
                                            <label class="form-label">Konu <span class="text-danger">*</span></label>
                                            <input type="text" class="form-control" id="emailSubject" 
                                                   placeholder="Email konusu" required>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Email İçeriği (HTML) <span class="text-danger">*</span></label>
                                            <textarea class="form-control" id="emailBodyHtml" rows="10" 
                                                      placeholder="<h1>Merhaba</h1><p>Email içeriği...</p>" required></textarea>
                                            <div class="form-text">
                                                HTML formatında email içeriği yazın. 
                                                <a href="#" id="showTemplateBtn" class="text-primary">Şablon örnekleri</a>
                                            </div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Düz Metin Versiyonu (Opsiyonel)</label>
                                            <textarea class="form-control" id="emailBodyText" rows="5" 
                                                      placeholder="Düz metin versiyonu (HTML desteklemeyen email istemcileri için)"></textarea>
                                            <div class="form-text">Boş bırakılırsa HTML'den otomatik oluşturulur</div>
                                        </div>

                                        <div class="mb-3">
                                            <label class="form-label">Öncelik</label>
                                            <select class="form-select" id="emailPriority">
                                                <option value="10">Çok Yüksek</option>
                                                <option value="8">Yüksek</option>
                                                <option value="5" selected>Normal</option>
                                                <option value="3">Düşük</option>
                                                <option value="1">Çok Düşük</option>
                                            </select>
                                            <div class="form-text">Yüksek öncelikli emailler önce gönderilir</div>
                                        </div>

                                        <div class="alert alert-info">
                                            <h6 class="alert-heading">
                                                <i class="ri-information-line me-1"></i>
                                                Bilgilendirme
                                            </h6>
                                            <ul class="mb-0 small">
                                                <li>Emailler queue'ya eklenir ve sırayla gönderilir</li>
                                                <li>Email gönderim durumunu "Email Logları" sayfasından takip edebilirsiniz</li>
                                                <li>Email adresi olmayan kullanıcılar seçilemez</li>
                                            </ul>
                                        </div>
                                    </div>
                                </div>

                                <div class="d-flex gap-2 mt-4">
                                    <button type="submit" class="btn btn-primary" id="sendEmailBtn">
                                        <i class="ri-mail-send-line me-1"></i>
                                        Email Gönder
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

            <!-- Email Şablonları Modal -->
            <div class="modal fade" id="templatesModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Email Şablonları</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Şablon Seçin</label>
                                <select class="form-select" id="templateSelect">
                                    <option value="">Şablon seçin...</option>
                                    <option value="welcome">Hoş Geldiniz</option>
                                    <option value="notification">Bildirim</option>
                                    <option value="announcement">Duyuru</option>
                                </select>
                            </div>
                            <div id="templatePreview" class="border rounded p-3 bg-light"></div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>
                            <button type="button" class="btn btn-primary" id="useTemplateBtn">Şablonu Kullan</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {
            html,
            title: 'Email Gönder'
        };
    } catch (error) {
        console.error('Email send content error:', error);
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
    const form = document.getElementById('emailSendForm');
    if (form && !form.dataset.listenerAdded) {
        form.dataset.listenerAdded = 'true';
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            await sendEmails();
        });
    }

    // Select all / Deselect all
    const selectAllBtn = document.getElementById('selectAllBtn');
    const deselectAllBtn = document.getElementById('deselectAllBtn');
    
    if (selectAllBtn && !selectAllBtn.dataset.listenerAdded) {
        selectAllBtn.dataset.listenerAdded = 'true';
        selectAllBtn.addEventListener('click', () => {
            document.querySelectorAll('.user-checkbox:not(:disabled)').forEach(cb => {
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

    // Template button
    const showTemplateBtn = document.getElementById('showTemplateBtn');
    if (showTemplateBtn && !showTemplateBtn.dataset.listenerAdded) {
        showTemplateBtn.dataset.listenerAdded = 'true';
        showTemplateBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = new bootstrap.Modal(document.getElementById('templatesModal'));
            modal.show();
        });
    }

    // Template select
    const templateSelect = document.getElementById('templateSelect');
    if (templateSelect && !templateSelect.dataset.listenerAdded) {
        templateSelect.dataset.listenerAdded = 'true';
        templateSelect.addEventListener('change', (e) => {
            loadTemplate(e.target.value);
        });
    }

    // Use template button
    const useTemplateBtn = document.getElementById('useTemplateBtn');
    if (useTemplateBtn && !useTemplateBtn.dataset.listenerAdded) {
        useTemplateBtn.dataset.listenerAdded = 'true';
        useTemplateBtn.addEventListener('click', () => {
            applyTemplate();
        });
    }
}

function updateSelectedCount() {
    const selected = document.querySelectorAll('.user-checkbox:checked').length;
    const countElement = document.getElementById('selectedCount');
    if (countElement) {
        countElement.textContent = selected;
    }
}

async function sendEmails() {
    // Seçili kullanıcıları al
    const selectedUsers = Array.from(document.querySelectorAll('.user-checkbox:checked'))
        .map(cb => parseInt(cb.value));

    if (selectedUsers.length === 0) {
        showWarning('Lütfen en az bir kullanıcı seçin');
        return;
    }

    const subject = document.getElementById('emailSubject').value.trim();
    const bodyHtml = document.getElementById('emailBodyHtml').value.trim();
    const bodyText = document.getElementById('emailBodyText').value.trim();
    const priority = parseInt(document.getElementById('emailPriority').value);

    if (!subject || !bodyHtml) {
        showWarning('Konu ve email içeriği zorunludur');
        return;
    }

    const confirmed = await showConfirmDelete({
        title: 'Email Gönder',
        message: `${selectedUsers.length} kullanıcıya email gönderilecek. Devam etmek istiyor musunuz?`
    });

    if (!confirmed) {
        return;
    }

    const loadingId = showLoading('Emailler gönderiliyor...');

    try {
        const response = await fetch('/api/email-management/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Cookie gönderimi için
            body: JSON.stringify({
                user_ids: selectedUsers,
                subject: subject,
                body_html: bodyHtml,
                body_text: bodyText || null,
                priority: priority
            })
        });

        const result = await response.json();

        Notification.remove(loadingId);

        if (result.success) {
            showSuccess(`${result.data.success} email queue'ya eklendi!`);
            // Formu temizle
            document.getElementById('emailSendForm').reset();
            document.querySelectorAll('.user-checkbox').forEach(cb => cb.checked = false);
            updateSelectedCount();
        } else {
            showError(result.message || 'Email gönderilirken hata oluştu');
        }

    } catch (error) {
        Notification.remove(loadingId);
        showError('Email gönderilirken bir hata oluştu: ' + error.message);
    }
}

function showPreview() {
    const subject = document.getElementById('emailSubject').value.trim();
    const bodyHtml = document.getElementById('emailBodyHtml').value.trim();

    if (!subject || !bodyHtml) {
        showWarning('Önizleme için konu ve içerik gerekli');
        return;
    }

    const previewHtml = `
        <div class="border rounded p-4">
            <h5>${subject}</h5>
            <hr>
            <div>${bodyHtml}</div>
        </div>
    `;

    Modal.custom({
        title: 'Email Önizleme',
        content: previewHtml,
        size: 'lg'
    });
}

const templates = {
    welcome: {
        subject: 'Hoş Geldiniz!',
        html: `
            <h1>Hoş Geldiniz!</h1>
            <p>Merhaba,</p>
            <p>Sisteme hoş geldiniz. Hesabınız başarıyla oluşturuldu.</p>
            <p>Giriş yapmak için <a href="#">buraya tıklayın</a>.</p>
            <p>İyi günler dileriz.</p>
        `
    },
    notification: {
        subject: 'Bildirim',
        html: `
            <h2>Bildirim</h2>
            <p>Merhaba,</p>
            <p>Size önemli bir bildirimimiz var.</p>
            <p>Detaylar için lütfen sisteme giriş yapın.</p>
            <p>Saygılarımızla.</p>
        `
    },
    announcement: {
        subject: 'Duyuru',
        html: `
            <h2>Duyuru</h2>
            <p>Sayın Kullanıcılar,</p>
            <p>Önemli bir duyurumuz bulunmaktadır.</p>
            <p>Lütfen detayları kontrol edin.</p>
            <p>Teşekkürler.</p>
        `
    }
};

function loadTemplate(templateName) {
    const preview = document.getElementById('templatePreview');
    if (!templateName || !templates[templateName]) {
        preview.innerHTML = '<p class="text-muted text-center">Şablon seçin</p>';
        return;
    }

    const template = templates[templateName];
    preview.innerHTML = `
        <h5>${template.subject}</h5>
        <hr>
        <div>${template.html}</div>
    `;
}

function applyTemplate() {
    const templateName = document.getElementById('templateSelect').value;
    if (!templateName || !templates[templateName]) {
        showWarning('Lütfen bir şablon seçin');
        return;
    }

    const template = templates[templateName];
    document.getElementById('emailSubject').value = template.subject;
    document.getElementById('emailBodyHtml').value = template.html.trim();

    const modal = bootstrap.Modal.getInstance(document.getElementById('templatesModal'));
    modal.hide();

    showSuccess('Şablon uygulandı');
}

