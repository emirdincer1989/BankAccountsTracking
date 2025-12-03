/**
 * Dashboard Sayfası
 */

export async function loadContent() {
    // Super admin kontrolü
    if (!window.currentUser) {
        // Kullanıcı bilgisi yüklenene kadar bekle
        await new Promise(resolve => {
            const checkUser = setInterval(() => {
                if (window.currentUser) {
                    clearInterval(checkUser);
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(checkUser); resolve(); }, 5000);
        });
    }

    const userRole = window.currentUser?.role_name || window.currentUser?.role;

    // Sadece super_admin erişebilir
    if (userRole !== 'super_admin') {
        // Rol bazlı yönlendirme
        let redirectUrl = '/accounts-view'; // Varsayılan
        
        if (userRole === 'finans_admin') {
            redirectUrl = '/finans-dashboard';
        } else if (userRole === 'admin') {
            redirectUrl = '/accounts-view';
        } else {
            redirectUrl = '/accounts-view'; // Diğer roller için varsayılan
        }

        // Yönlendirme yap
        setTimeout(() => {
            window.location.href = redirectUrl;
        }, 100);

        return {
            html: `<div class="alert alert-warning">
                <i class="ri-alert-line me-2"></i>
                Bu sayfaya erişim yetkiniz yok. Yönlendiriliyorsunuz...
            </div>`,
            title: 'Erişim Reddedildi'
        };
    }

    try {
        const response = await fetch('/api/dashboard/stats');
        const data = await response.json();

        console.log('Dashboard API yanıtı:', data);

        if (data.success && data.data) {
            const html = `
                <div class="row">
                    <div class="col-xl-3 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1 overflow-hidden">
                                        <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Toplam Kullanıcı</p>
                                    </div>
                                </div>
                                <div class="d-flex align-items-end justify-content-between mt-4">
                                    <div>
                                        <h4 class="fs-22 fw-semibold ff-secondary mb-4">${data.data.totalUsers || 0}</h4>
                                    </div>
                                    <div class="avatar-sm flex-shrink-0">
                                        <span class="avatar-title bg-success-subtle rounded fs-3">
                                            <i class="ri-user-line text-success"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1 overflow-hidden">
                                        <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Toplam Rol</p>
                                    </div>
                                </div>
                                <div class="d-flex align-items-end justify-content-between mt-4">
                                    <div>
                                        <h4 class="fs-22 fw-semibold ff-secondary mb-4">${data.data.totalRoles || 0}</h4>
                                    </div>
                                    <div class="avatar-sm flex-shrink-0">
                                        <span class="avatar-title bg-info-subtle rounded fs-3">
                                            <i class="ri-shield-line text-info"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1 overflow-hidden">
                                        <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Toplam Menü</p>
                                    </div>
                                </div>
                                <div class="d-flex align-items-end justify-content-between mt-4">
                                    <div>
                                        <h4 class="fs-22 fw-semibold ff-secondary mb-4">${data.data.totalMenus || 0}</h4>
                                    </div>
                                    <div class="avatar-sm flex-shrink-0">
                                        <span class="avatar-title bg-warning-subtle rounded fs-3">
                                            <i class="ri-menu-line text-warning"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="col-xl-3 col-md-6">
                        <div class="card card-animate">
                            <div class="card-body">
                                <div class="d-flex align-items-center">
                                    <div class="flex-grow-1 overflow-hidden">
                                        <p class="text-uppercase fw-medium text-muted text-truncate mb-0">Aktif Kullanıcı</p>
                                    </div>
                                </div>
                                <div class="d-flex align-items-end justify-content-between mt-4">
                                    <div>
                                        <h4 class="fs-22 fw-semibold ff-secondary mb-4">${data.data.activeUsers || 0}</h4>
                                    </div>
                                    <div class="avatar-sm flex-shrink-0">
                                        <span class="avatar-title bg-primary-subtle rounded fs-3">
                                            <i class="ri-user-check-line text-primary"></i>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return { html, title: 'Dashboard' };
        } else {
            return {
                html: '<div class="alert alert-warning">Dashboard verileri bulunamadı!</div>',
                title: 'Dashboard'
            };
        }
    } catch (error) {
        console.error('Dashboard content error:', error);
        return {
            html: '<div class="alert alert-danger">Dashboard verileri yüklenemedi!</div>',
            title: 'Dashboard'
        };
    }
}

export function init() {
    console.log('Dashboard initialized');
}
