/**
 * Kullanıcı Yönetimi Sayfası
 */

export async function loadContent() {
    try {
        const response = await fetch('/api/users?page=1&limit=10&search=');
        const data = await response.json();

        if (data.success) {
            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h4 class="card-title mb-0">Kullanıcı Yönetimi</h4>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-primary" id="addUserBtn">
                                            <i class="ri-add-line me-1"></i> Yeni Kullanıcı
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <!-- Filtreler -->
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <div class="search-box">
                                            <input type="text" class="form-control" placeholder="Kullanıcı ara..." id="searchInput">
                                            <i class="ri-search-line search-icon"></i>
                                        </div>
                                    </div>
                                </div>

                                <!-- Kullanıcı Tablosu -->
                                <div class="table-responsive">
                                    <table class="table table-bordered table-nowrap align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th scope="col">ID</th>
                                                <th scope="col">Ad Soyad</th>
                                                <th scope="col">E-posta</th>
                                                <th scope="col">Rol</th>
                                                <th scope="col">Durum</th>
                                                <th scope="col">Son Giriş</th>
                                                <th scope="col">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody id="usersTableBody">
                                            ${data.data.users.map(user => `
                                                <tr>
                                                    <td>${user.id}</td>
                                                    <td>${user.name}</td>
                                                    <td>${user.email}</td>
                                                    <td><span class="badge bg-primary">${user.role_name || 'Rol Yok'}</span></td>
                                                    <td>
                                                        <span class="badge ${user.is_active ? 'bg-success' : 'bg-danger'}">
                                                            ${user.is_active ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </td>
                                                    <td>${user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : 'Hiç giriş yapmamış'}</td>
                                                    <td>
                                                        <div class="dropdown">
                                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                                <i class="ri-more-fill align-middle"></i>
                                                            </button>
                                                            <ul class="dropdown-menu dropdown-menu-end">
                                                                <li><a class="dropdown-item edit-user-btn" href="#" data-user-id="${user.id}"><i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Düzenle</a></li>
                                                                <li><a class="dropdown-item delete-user-btn" href="#" data-user-id="${user.id}"><i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Sil</a></li>
                                                            </ul>
                                                        </div>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return {
                html,
                title: 'Kullanıcı Yönetimi'
            };
        }
    } catch (error) {
        console.error('Users content error:', error);
        return {
            html: '<div class="alert alert-danger">Kullanıcı verileri yüklenemedi!</div>',
            title: 'Hata'
        };
    }
}

/**
 * Sayfa init fonksiyonu - sayfa yüklendikten sonra çalışır
 */
export function init() {
    // Event listeners
    const addUserBtn = document.getElementById('addUserBtn');
    if (addUserBtn && !addUserBtn.dataset.listenerAdded) {
        addUserBtn.dataset.listenerAdded = 'true';
        addUserBtn.addEventListener('click', () => {
            // showUserModal global function defined in hybrid-layout.html
            if (typeof showUserModal === 'function') {
                showUserModal();
            }
        });
    }

    // Edit buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.edit-user-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const userId = btn.getAttribute('data-user-id');
            // editUser global function defined in hybrid-layout.html
            if (typeof editUser === 'function') {
                editUser(userId);
            }
        });
    });

    // Delete buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.delete-user-btn').forEach(btn => {
        // Eğer zaten listener eklenmişse tekrar ekleme
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const userId = btn.getAttribute('data-user-id');

            console.log('🗑️ Delete button clicked, userId:', userId);

            // Yeni modal utility kullanımı
            const confirmed = await showConfirmDelete({
                message: 'Bu kullanıcıyı silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.'
            });

            console.log('✅ Modal sonucu (confirmed):', confirmed);

            if (confirmed) {
                console.log('🔥 Silme işlemi başlatılıyor...');
                try {
                    const response = await fetch(`/api/users/${userId}`, {
                        method: 'DELETE'
                    });

                    console.log('📡 DELETE response:', response.status);

                    const data = await response.json();
                    console.log('📦 DELETE data:', data);

                    if (data.success) {
                        showSuccess('Kullanıcı başarıyla silindi!');
                        // Sayfayı yenile
                        setTimeout(() => window.reloadPage(), 1500);
                    } else {
                        showError(data.message || 'Kullanıcı silinemedi!');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    showError('Kullanıcı silinirken bir hata oluştu!');
                }
            } else {
                console.log('❌ Kullanıcı silme işlemini iptal etti');
            }
        });
    });

    // Search input
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            console.log('Search:', e.target.value);
            // Search logic...
        });
    }

    console.log('Users page initialized');
}
