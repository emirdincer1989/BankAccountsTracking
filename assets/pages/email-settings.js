/**
 * Email Ayarları Sayfası
 * SMTP ayarlarını yönetir ve test emaili gönderir.
 */

export async function loadContent() {
    const html = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <h4 class="card-title mb-0">
                            <i class="ri-mail-settings-line me-2"></i>
                            Email Ayarları
                        </h4>
                        <p class="text-muted mb-0">SMTP ayarlarını yapılandırın ve test emaili gönderin</p>
                    </div>
                    <div class="card-body">
                        <form id="emailSettingsForm">
                            <div class="row">
                                <div class="col-lg-6">
                                    <h5 class="mb-3">
                                        <i class="ri-server-line me-2 text-primary"></i>
                                        SMTP Ayarları
                                    </h5>

                                    <div class="mb-3">
                                        <label class="form-label">SMTP Host <span class="text-danger">*</span></label>
                                        <input type="text" class="form-control" id="smtpHost" 
                                               placeholder="smtp.gmail.com" required>
                                        <div class="form-text">SMTP sunucu adresi</div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">SMTP Port <span class="text-danger">*</span></label>
                                        <input type="number" class="form-control" id="smtpPort" 
                                               placeholder="587" value="587" required>
                                        <div class="form-text">
                                            <strong>587:</strong> TLS/STARTTLS (Önerilen)<br>
                                            <strong>465:</strong> SSL<br>
                                            <strong>25:</strong> Standart SMTP
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <div class="form-check form-switch">
                                            <input class="form-check-input" type="checkbox" id="smtpSecure">
                                            <label class="form-check-label" for="smtpSecure">
                                                SSL/TLS Kullan (Port 465 için)
                                            </label>
                                        </div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">SMTP Kullanıcı Adı (Email) <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" id="smtpUser" 
                                               placeholder="your-email@gmail.com" required>
                                        <div class="form-text">SMTP sunucusuna bağlanmak için kullanılacak email adresi</div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">SMTP Şifresi <span class="text-danger">*</span></label>
                                        <div class="input-group">
                                            <input type="password" class="form-control" id="smtpPassword" 
                                                   placeholder="••••••••" required>
                                            <button class="btn btn-outline-secondary" type="button" id="togglePassword">
                                                <i class="ri-eye-line" id="togglePasswordIcon"></i>
                                            </button>
                                        </div>
                                        <div class="form-text">
                                            <strong>Gmail için:</strong> Uygulama şifresi kullanın (2FA aktifse)<br>
                                            <strong>Outlook için:</strong> Normal şifre veya uygulama şifresi
                                        </div>
                                    </div>
                                </div>

                                <div class="col-lg-6">
                                    <h5 class="mb-3">
                                        <i class="ri-mail-line me-2 text-success"></i>
                                        Email Gönderen Bilgileri
                                    </h5>

                                    <div class="mb-3">
                                        <label class="form-label">Gönderen Email <span class="text-danger">*</span></label>
                                        <input type="email" class="form-control" id="fromEmail" 
                                               placeholder="noreply@example.com" required>
                                        <div class="form-text">Gönderilecek emaillerin "From" adresi</div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Gönderen İsim</label>
                                        <input type="text" class="form-control" id="fromName" 
                                               placeholder="RBUMS Sistemi">
                                        <div class="form-text">Gönderen adı (opsiyonel)</div>
                                    </div>

                                    <div class="mb-3">
                                        <label class="form-label">Yanıt Adresi (Reply-To)</label>
                                        <input type="email" class="form-control" id="replyTo" 
                                               placeholder="support@example.com">
                                        <div class="form-text">Yanıtların gönderileceği adres (opsiyonel)</div>
                                    </div>

                                    <div class="alert alert-info">
                                        <h6 class="alert-heading">
                                            <i class="ri-information-line me-1"></i>
                                            Bilgilendirme
                                        </h6>
                                        <ul class="mb-0 small">
                                            <li>SMTP ayarları şifrelenmiş olarak saklanır</li>
                                            <li>Ayarları kaydettikten sonra test emaili gönderebilirsiniz</li>
                                            <li>Gmail kullanıyorsanız "Daha az güvenli uygulama erişimi"ni aktifleştirin veya uygulama şifresi kullanın</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div class="d-flex gap-2 mt-4">
                                <button type="submit" class="btn btn-primary" id="saveSettingsBtn">
                                    <i class="ri-save-line me-1"></i>
                                    Ayarları Kaydet
                                </button>
                                <button type="button" class="btn btn-success" id="testEmailBtn" disabled>
                                    <i class="ri-mail-send-line me-1"></i>
                                    Test Emaili Gönder
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
        title: 'Email Ayarları'
    };
}

export function init() {
    loadSettings();
    setupEventListeners();
}

async function loadSettings() {
    try {
        const response = await fetch('/api/email-management/settings', {
            credentials: 'include' // Cookie gönderimi için
        });

        const result = await response.json();

        if (!response.ok) {
            // 500 hatası - migration çalıştırılmamış olabilir
            if (response.status === 500) {
                console.error('Email ayarları yüklenirken hata:', result.message);
                if (result.message && result.message.includes('migration')) {
                    showWarning('Email sistemi henüz kurulmamış. Lütfen migration çalıştırın: npm run migrate');
                } else {
                    showError('Email ayarları yüklenirken bir hata oluştu: ' + (result.message || 'Bilinmeyen hata'));
                }
            }
            return;
        }

        if (result.success) {
            if (result.data) {
                const settings = result.data;
                document.getElementById('smtpHost').value = settings.host || '';
                document.getElementById('smtpPort').value = settings.port || 587;
                document.getElementById('smtpSecure').checked = settings.secure || false;
                document.getElementById('smtpUser').value = settings.user || '';
                document.getElementById('fromEmail').value = settings.from_email || '';
                document.getElementById('fromName').value = settings.from_name || '';
                document.getElementById('replyTo').value = settings.reply_to || '';
                
                // Test email butonunu aktifleştir
                document.getElementById('testEmailBtn').disabled = false;
            } else {
                // Ayarlar henüz yapılandırılmamış
                console.log('Email ayarları henüz yapılandırılmamış');
            }
        }
    } catch (error) {
        console.error('Ayarlar yüklenirken hata:', error);
        showError('Ayarlar yüklenirken bir hata oluştu: ' + error.message);
    }
}

function setupEventListeners() {
    // Form submit
    const form = document.getElementById('emailSettingsForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveSettings();
    });

    // Test email butonu
    document.getElementById('testEmailBtn').addEventListener('click', async () => {
        await sendTestEmail();
    });

    // Password toggle
    document.getElementById('togglePassword').addEventListener('click', () => {
        const passwordInput = document.getElementById('smtpPassword');
        const icon = document.getElementById('togglePasswordIcon');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            icon.classList.remove('ri-eye-line');
            icon.classList.add('ri-eye-off-line');
        } else {
            passwordInput.type = 'password';
            icon.classList.remove('ri-eye-off-line');
            icon.classList.add('ri-eye-line');
        }
    });
}

async function saveSettings() {
    const loadingId = showLoading('Ayarlar kaydediliyor...');

    try {
        // Form değerlerini al ve validate et
        const host = document.getElementById('smtpHost').value.trim();
        const port = parseInt(document.getElementById('smtpPort').value);
        const user = document.getElementById('smtpUser').value.trim();
        const password = document.getElementById('smtpPassword').value;
        const fromEmail = document.getElementById('fromEmail').value.trim();
        const fromName = document.getElementById('fromName').value.trim();
        const replyTo = document.getElementById('replyTo').value.trim();

        // Zorunlu alanları kontrol et
        if (!host || !port || !user || !password || !fromEmail) {
            showError('Lütfen tüm zorunlu alanları doldurun');
            return;
        }

        const settings = {
            name: 'default',
            host: host,
            port: port,
            secure: document.getElementById('smtpSecure').checked,
            user: user,
            password: password,
            from_email: fromEmail,
            from_name: fromName || null,
            reply_to: replyTo || null
        };

        const response = await fetch('/api/email-management/settings', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Cookie gönderimi için
            body: JSON.stringify(settings)
        });

        const result = await response.json();

        Notification.remove(loadingId);

        if (!response.ok) {
            // Validation hatalarını göster
            if (result.errors && Array.isArray(result.errors)) {
                showError(result.message + ': ' + result.errors.join(', '));
            } else {
                showError(result.message || 'Ayarlar kaydedilirken hata oluştu');
            }
            return;
        }

        if (result.success) {
            showSuccess('Email ayarları başarıyla kaydedildi!');
            // Test email butonunu aktifleştir
            document.getElementById('testEmailBtn').disabled = false;
            // Şifre alanını temizle
            document.getElementById('smtpPassword').value = '';
        } else {
            showError(result.message || 'Ayarlar kaydedilirken hata oluştu');
        }

    } catch (error) {
        Notification.remove(loadingId);
        showError('Ayarlar kaydedilirken bir hata oluştu: ' + error.message);
    }
}

async function sendTestEmail() {
    // Test email adresi sor
    const testEmail = prompt('Test emaili gönderilecek adresi girin:', '');
    
    if (!testEmail || !testEmail.includes('@')) {
        showWarning('Geçerli bir email adresi girin');
        return;
    }

    const loadingId = showLoading('Test emaili gönderiliyor...');

    try {
        const response = await fetch('/api/email-management/test', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include', // Cookie gönderimi için
            body: JSON.stringify({ to: testEmail })
        });

        const result = await response.json();

        Notification.remove(loadingId);

        if (result.success) {
            showSuccess(`Test emaili başarıyla gönderildi: ${testEmail}`);
        } else {
            showError(result.message || 'Test emaili gönderilirken hata oluştu');
        }

    } catch (error) {
        Notification.remove(loadingId);
        showError('Test emaili gönderilirken bir hata oluştu: ' + error.message);
    }
}

