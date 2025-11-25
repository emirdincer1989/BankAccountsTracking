/**
 * Rol Yönetimi Sayfası
 */

export async function loadContent() {
    try {
        const response = await fetch('/api/roles');
        const data = await response.json();

        if (data.success) {
            const html = `
                <div class="row">
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h4 class="card-title mb-0">Rol Yönetimi</h4>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-primary" id="addRoleBtn">
                                            <i class="ri-add-line me-1"></i> Yeni Rol
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <!-- Rol Tablosu -->
                                <div class="table-responsive">
                                    <table class="table table-bordered table-nowrap align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th scope="col">ID</th>
                                                <th scope="col">Rol Adı</th>
                                                <th scope="col">Açıklama</th>
                                                <th scope="col">Durum</th>
                                                <th scope="col">Oluşturulma</th>
                                                <th scope="col">İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody id="rolesTableBody">
                                            ${data.data.roles.map(role => `
                                                <tr>
                                                    <td>${role.id}</td>
                                                    <td><span class="badge bg-primary">${role.name}</span></td>
                                                    <td>${role.description || '-'}</td>
                                                    <td>
                                                        <span class="badge ${role.is_active ? 'bg-success' : 'bg-danger'}">
                                                            ${role.is_active ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </td>
                                                    <td>${new Date(role.created_at).toLocaleString('tr-TR')}</td>
                                                    <td>
                                                        <div class="dropdown">
                                                            <button class="btn btn-soft-secondary btn-sm dropdown" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                                                                <i class="ri-more-fill align-middle"></i>
                                                            </button>
                                                            <ul class="dropdown-menu dropdown-menu-end">
                                                                <li><a class="dropdown-item edit-role-btn" href="#" data-role-id="${role.id}"><i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Düzenle</a></li>
                                                                <li><a class="dropdown-item delete-role-btn" href="#" data-role-id="${role.id}"><i class="ri-delete-bin-fill align-bottom me-2 text-muted"></i> Sil</a></li>
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

            return { html, title: 'Rol Yönetimi' };
        }
    } catch (error) {
        console.error('Roles content error:', error);
        return {
            html: '<div class="alert alert-danger">Rol verileri yüklenemedi!</div>',
            title: 'Rol Yönetimi'
        };
    }
}

export function init() {
    // Add role button - Event listener duplicate olmaması için kontrol
    const addRoleBtn = document.getElementById('addRoleBtn');
    if (addRoleBtn && !addRoleBtn.dataset.listenerAdded) {
        addRoleBtn.dataset.listenerAdded = 'true';
        addRoleBtn.addEventListener('click', () => {
            // showRoleModal global function defined in hybrid-layout.html
            if (typeof showRoleModal === 'function') {
                showRoleModal();
            }
        });
    }

    // Edit buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.edit-role-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const roleId = btn.getAttribute('data-role-id');
            // editRole global function defined in hybrid-layout.html
            if (typeof editRole === 'function') {
                editRole(roleId);
            }
        });
    });

    // Delete buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.delete-role-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', async (e) => {
            e.preventDefault();
            const roleId = btn.getAttribute('data-role-id');

            // Yeni modal utility kullanımı
            const confirmed = await showConfirmDelete({
                message: 'Bu rolü silmek istediğinizden emin misiniz? Rolle ilişkili kullanıcılar etkilenebilir.'
            });

            if (confirmed) {
                try {
                    const response = await fetch(`/api/roles/${roleId}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        showSuccess('Rol başarıyla silindi!');
                        // Sayfayı yenile
                        setTimeout(() => window.reloadPage(), 1500);
                    } else {
                        showError(data.message || 'Rol silinemedi!');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    showError('Rol silinirken bir hata oluştu!');
                }
            }
        });
    });

    console.log('Roles page initialized');
}
