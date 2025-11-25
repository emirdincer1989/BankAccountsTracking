/**
 * Panel Ayarları Sayfası
 */

export async function loadContent() {
    try {
        const html = `
            <div class="row">
                <div class="col-12">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title mb-0">Panel Ayarları</h4>
                            <p class="text-muted mb-0">Panel görünümünü ve logoları yönetin</p>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <!-- Logo Ayarları -->
                                <div class="col-lg-6">
                                    <div class="border rounded p-4">
                                        <h5 class="mb-3">
                                            <i class="ri-image-line me-2 text-primary"></i>
                                            Logo Ayarları
                                        </h5>

                                        <!-- Büyük Logo (Sidebar) -->
                                        <div class="mb-4">
                                            <label class="form-label fw-semibold">Büyük Logo (Sidebar)</label>
                                            <div class="d-flex align-items-center mb-3">
                                                <div class="me-3">
                                                    <img id="currentLargeLogo" src="assets/images/logo-dark.png" alt="Büyük Logo"
                                                         style="max-width: 120px; max-height: 40px; border: 1px solid #e9ecef; padding: 8px; border-radius: 4px;">
                                                </div>
                                                <div class="flex-grow-1">
                                                    <input type="file" class="form-control" id="largeLogoInput" accept="image/*">
                                                    <div class="form-text">
                                                        <strong>Önerilen boyut:</strong> 120x40px<br>
                                                        <strong>Format:</strong> PNG, JPG, SVG<br>
                                                        <strong>Max boyut:</strong> 2MB
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Küçük Logo (Header) -->
                                        <div class="mb-4">
                                            <label class="form-label fw-semibold">Küçük Logo (Header)</label>
                                            <div class="d-flex align-items-center mb-3">
                                                <div class="me-3">
                                                    <img id="currentSmallLogo" src="assets/images/logo-sm.png" alt="Küçük Logo"
                                                         style="max-width: 40px; max-height: 40px; border: 1px solid #e9ecef; padding: 8px; border-radius: 4px;">
                                                </div>
                                                <div class="flex-grow-1">
                                                    <input type="file" class="form-control" id="smallLogoInput" accept="image/*">
                                                    <div class="form-text">
                                                        <strong>Önerilen boyut:</strong> 40x40px<br>
                                                        <strong>Format:</strong> PNG, JPG, SVG<br>
                                                        <strong>Max boyut:</strong> 2MB
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Favicon -->
                                        <div class="mb-4">
                                            <label class="form-label fw-semibold">Favicon</label>
                                            <div class="d-flex align-items-center mb-3">
                                                <div class="me-3">
                                                    <img id="currentFavicon" src="assets/images/favicon.png" alt="Favicon"
                                                         style="max-width: 32px; max-height: 32px; border: 1px solid #e9ecef; padding: 4px; border-radius: 4px;">
                                                </div>
                                                <div class="flex-grow-1">
                                                    <input type="file" class="form-control" id="faviconInput" accept="image/*,.ico">
                                                    <div class="form-text">
                                                        <strong>Önerilen boyut:</strong> 32x32px<br>
                                                        <strong>Format:</strong> ICO, PNG<br>
                                                        <strong>Max boyut:</strong> 1MB
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        <button type="button" class="btn btn-primary" id="saveLogosBtn">
                                            <i class="ri-save-line me-1"></i>
                                            Logoları Kaydet
                                        </button>
                                    </div>
                                </div>

                                <!-- Önizleme -->
                                <div class="col-lg-6">
                                    <div class="border rounded p-4">
                                        <h5 class="mb-3">
                                            <i class="ri-eye-line me-2 text-success"></i>
                                            Canlı Önizleme
                                        </h5>

                                        <!-- Sidebar Önizleme -->
                                        <div class="mb-4">
                                            <label class="form-label fw-semibold">Sidebar Önizleme</label>
                                            <div class="bg-dark p-3 rounded" style="width: 200px;">
                                                <div class="text-white mb-2">
                                                    <img id="previewLargeLogo" src="assets/images/logo-dark.png" alt="Logo"
                                                         style="max-width: 120px; max-height: 30px;">
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Header Önizleme -->
                                        <div class="mb-4">
                                            <label class="form-label fw-semibold">Header Önizleme</label>
                                            <div class="border p-3 rounded bg-light">
                                                <div class="d-flex align-items-center">
                                                    <img id="previewSmallLogo" src="assets/images/logo-sm.png" alt="Logo"
                                                         style="max-width: 30px; max-height: 30px;" class="me-2">
                                                    <span class="fw-bold">VELZON</span>
                                                </div>
                                            </div>
                                        </div>

                                        <!-- Favicon Önizleme -->
                                        <div>
                                            <label class="form-label fw-semibold">Favicon Önizleme</label>
                                            <div class="border p-3 rounded bg-light">
                                                <div class="d-flex align-items-center">
                                                    <img id="previewFavicon" src="assets/images/favicon.png" alt="Favicon"
                                                         style="max-width: 24px; max-height: 24px;" class="me-2">
                                                    <span>Tarayıcı sekmesi</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Metin Ayarları -->
                <div class="col-12 mt-4">
                    <div class="card">
                        <div class="card-header">
                            <h4 class="card-title mb-0">
                                <i class="ri-text me-2 text-info"></i>
                                Metin Ayarları
                            </h4>
                            <p class="text-muted mb-0">Sistemdeki metinleri özelleştirin</p>
                        </div>
                        <div class="card-body">
                            <div class="row">
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label for="systemTitle" class="form-label fw-semibold">Sistem Başlığı</label>
                                        <input type="text" class="form-control" id="systemTitle" placeholder="Sistem başlığını girin">
                                        <div class="form-text">
                                            <strong>Kullanım:</strong> Tarayıcı sekmesinde görünecek başlık<br>
                                            <strong>Örnek:</strong> "RBUMS"
                                        </div>
                                    </div>
                                </div>
                                <div class="col-md-4">
                                    <div class="mb-3">
                                        <label for="footerBrand" class="form-label fw-semibold">Footer Marka</label>
                                        <input type="text" class="form-control" id="footerBrand" placeholder="Footer marka adını girin">
                                        <div class="form-text">
                                            <strong>Kullanım:</strong> Footer'da görünecek marka adı<br>
                                            <strong>Örnek:</strong> "2025 © Ezoft"
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-12 text-center">
                                    <button type="button" class="btn btn-success" id="saveTextSettingsBtn">
                                        <i class="ri-save-line align-bottom me-1"></i> Metin Ayarlarını Kaydet
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        return {
            html,
            title: 'Panel Ayarları'
        };
    } catch (error) {
        console.error('Panel settings content error:', error);
        return {
            html: '<div class="alert alert-danger">Panel ayarları yüklenirken hata oluştu!</div>',
            title: 'Panel Ayarları'
        };
    }
}

export function init() {
    // Mevcut ayarları yükle
    loadCurrentSettings();

    // Logo önizleme fonksiyonları
    const largeLogoInput = document.getElementById('largeLogoInput');
    const smallLogoInput = document.getElementById('smallLogoInput');
    const faviconInput = document.getElementById('faviconInput');

    if (largeLogoInput) {
        largeLogoInput.addEventListener('change', function(e) {
            handleLogoPreview(e, 'currentLargeLogo', 'previewLargeLogo');
        });
    }

    if (smallLogoInput) {
        smallLogoInput.addEventListener('change', function(e) {
            handleLogoPreview(e, 'currentSmallLogo', 'previewSmallLogo');
        });
    }

    if (faviconInput) {
        faviconInput.addEventListener('change', function(e) {
            handleLogoPreview(e, 'currentFavicon', 'previewFavicon');
        });
    }

    // Kaydet butonları
    const saveLogosBtn = document.getElementById('saveLogosBtn');
    if (saveLogosBtn) {
        saveLogosBtn.addEventListener('click', saveLogos);
    }

    const saveTextSettingsBtn = document.getElementById('saveTextSettingsBtn');
    if (saveTextSettingsBtn) {
        saveTextSettingsBtn.addEventListener('click', saveTextSettings);
    }

    console.log('Panel settings page initialized');
}

// Mevcut ayarları yükle
async function loadCurrentSettings() {
    try {
        console.log('📂 Mevcut panel ayarları yükleniyor...');

        const response = await fetch('/api/panel-settings/texts');
        const data = await response.json();

        if (data.success && data.data) {
            const settings = data.data;
            console.log('✅ Panel ayarları yüklendi:', settings);

            // Metin ayarlarını doldur
            const systemTitleInput = document.getElementById('systemTitle');
            const footerBrandInput = document.getElementById('footerBrand');

            if (systemTitleInput && settings.systemTitle) {
                systemTitleInput.value = settings.systemTitle;
                console.log('✅ Sistem başlığı set edildi:', settings.systemTitle);
            }

            if (footerBrandInput && settings.footerBrand) {
                footerBrandInput.value = settings.footerBrand;
                console.log('✅ Footer marka set edildi:', settings.footerBrand);
            }
        } else {
            console.warn('⚠️ Panel ayarları bulunamadı veya boş');
        }
    } catch (error) {
        console.error('❌ Panel ayarları yükleme hatası:', error);
    }
}

// Logo önizleme fonksiyonu
function handleLogoPreview(event, currentImgId, previewImgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const currentImg = document.getElementById(currentImgId);
            const previewImg = document.getElementById(previewImgId);

            if (currentImg) currentImg.src = e.target.result;
            if (previewImg) previewImg.src = e.target.result;
        };
        reader.readAsDataURL(file);
    }
}

// Logoları kaydetme fonksiyonu
async function saveLogos() {
    const formData = new FormData();

    const largeLogoInput = document.getElementById('largeLogoInput');
    const smallLogoInput = document.getElementById('smallLogoInput');
    const faviconInput = document.getElementById('faviconInput');

    if (largeLogoInput.files[0]) {
        formData.append('largeLogo', largeLogoInput.files[0]);
    }
    if (smallLogoInput.files[0]) {
        formData.append('smallLogo', smallLogoInput.files[0]);
    }
    if (faviconInput.files[0]) {
        formData.append('favicon', faviconInput.files[0]);
    }

    try {
        const response = await fetch('/api/panel-settings/logos', {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Logolar başarıyla kaydedildi!');
            setTimeout(() => location.reload(), 1500);
        } else {
            showError(data.message || 'Logolar kaydedilemedi');
        }
    } catch (error) {
        console.error('Logo save error:', error);
        showError('Logolar kaydedilirken bir hata oluştu!');
    }
}

// Metin ayarlarını kaydetme fonksiyonu
async function saveTextSettings() {
    const systemTitle = document.getElementById('systemTitle').value;
    const footerBrand = document.getElementById('footerBrand').value;

    try {
        const response = await fetch('/api/panel-settings/texts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemTitle,
                footerBrand
            })
        });

        const data = await response.json();

        if (data.success) {
            showSuccess('Metin ayarları başarıyla kaydedildi!');
        } else {
            showError(data.message || 'Metin ayarları kaydedilemedi');
        }
    } catch (error) {
        console.error('Text settings save error:', error);
        showError('Metin ayarları kaydedilirken bir hata oluştu!');
    }
}
