/**
 * Template/Fallback Sayfası
 * Henüz oluşturulmamış sayfalar için varsayılan template
 */

export async function loadContent() {
    const pageName = window.location.pathname.substring(1) || 'unknown';

    const html = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-body text-center py-5">
                        <div class="avatar-lg mx-auto mb-4">
                            <div class="avatar-title bg-warning-subtle text-warning fs-2 rounded-circle">
                                <i class="ri-file-text-line"></i>
                            </div>
                        </div>
                        <h4 class="mb-3">Sayfa Modülü Bulunamadı</h4>
                        <p class="text-muted mb-4">
                            <strong>"${pageName}"</strong> sayfası henüz oluşturulmamış.
                        </p>
                        <div class="alert alert-info text-start">
                            <h6 class="alert-heading">Sayfa modülü oluşturmak için:</h6>
                            <ol class="mb-0">
                                <li>
                                    <code>assets/pages/${pageName}.js</code> dosyası oluşturun
                                </li>
                                <li>
                                    <code>loadContent()</code> fonksiyonunu export edin
                                </li>
                                <li>
                                    (Opsiyonel) <code>init()</code> fonksiyonunu export edin
                                </li>
                            </ol>
                        </div>
                        <a href="/dashboard" class="btn btn-primary">
                            <i class="ri-dashboard-line me-1"></i> Dashboard'a Dön
                        </a>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Sayfa Bulunamadı'
    };
}

export function init() {
    console.log('Template page initialized');
}
