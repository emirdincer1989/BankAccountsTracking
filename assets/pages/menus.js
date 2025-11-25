/**
 * Menü Yönetimi Sayfası
 */

export async function loadContent() {
    try {
        const response = await fetch('/api/menus');
        const data = await response.json();

        if (data.success) {
            // Kategorileri ve menüleri ayır
            const categories = data.data.menus.filter(menu => menu.is_category);
            const menuItems = data.data.menus.filter(menu => !menu.is_category);

            const html = `
                <div class="row">
                    <!-- Kategori Listesi -->
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h5 class="card-title mb-0">Kategoriler</h5>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-info" id="addCategoryBtn">
                                            <i class="ri-folder-add-line align-bottom me-1"></i> Yeni Kategori
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-nowrap align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Sıra</th>
                                                <th>Kategori Adı</th>
                                                <th>İkon</th>
                                                <th>Durum</th>
                                                <th>İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${categories.length === 0 ? `
                                                <tr>
                                                    <td colspan="5" class="text-center text-muted py-4">
                                                        <i class="ri-folder-line fs-48 mb-3 d-block"></i>
                                                        <p class="mb-0">Henüz kategori eklenmemiş</p>
                                                    </td>
                                                </tr>
                                            ` : categories.sort((a, b) => a.order_index - b.order_index).map(category => `
                                                <tr>
                                                    <td>${category.order_index}</td>
                                                    <td>
                                                        <i class="${category.icon} me-2"></i>
                                                        ${category.title}
                                                    </td>
                                                    <td><code>${category.icon || '-'}</code></td>
                                                    <td>
                                                        <span class="badge ${category.is_active ? 'bg-success' : 'bg-danger'}">
                                                            ${category.is_active ? 'Aktif' : 'Pasif'}
                                                        </span>
                                                    </td>
                                                    <td>
                                                        <button class="btn btn-soft-primary btn-sm edit-category-btn" data-category-id="${category.id}">
                                                            <i class="ri-pencil-line"></i>
                                                        </button>
                                                        <button class="btn btn-soft-danger btn-sm delete-category-btn" data-category-id="${category.id}">
                                                            <i class="ri-delete-bin-line"></i>
                                                        </button>
                                                    </td>
                                                </tr>
                                            `).join('')}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Menü Listesi -->
                    <div class="col-12">
                        <div class="card">
                            <div class="card-header">
                                <div class="row align-items-center">
                                    <div class="col">
                                        <h5 class="card-title mb-0">Menüler</h5>
                                    </div>
                                    <div class="col-auto">
                                        <button class="btn btn-primary" id="addMenuBtn">
                                            <i class="ri-add-line me-1"></i> Yeni Menü
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <div class="card-body">
                                <div class="table-responsive">
                                    <table class="table table-bordered table-nowrap align-middle mb-0">
                                        <thead class="table-light">
                                            <tr>
                                                <th>Sıra</th>
                                                <th>Menü Adı</th>
                                                <th>Kategori</th>
                                                <th>URL</th>
                                                <th>İkon</th>
                                                <th>Durum</th>
                                                <th>İşlemler</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            ${menuItems.length === 0 ? `
                                                <tr>
                                                    <td colspan="7" class="text-center text-muted py-4">
                                                        <i class="ri-menu-line fs-48 mb-3 d-block"></i>
                                                        <p class="mb-0">Henüz menü eklenmemiş</p>
                                                    </td>
                                                </tr>
                                            ` : (() => {
                                                // Menüleri kategoriye göre grupla
                                                const menuCategories = {};
                                                menuItems.forEach(menu => {
                                                    const categoryName = menu.category || 'Kategori Yok';
                                                    if (!menuCategories[categoryName]) {
                                                        menuCategories[categoryName] = [];
                                                    }
                                                    menuCategories[categoryName].push(menu);
                                                });

                                                // Kategorileri sırala
                                                const sortedCategoryNames = Object.keys(menuCategories).sort((a, b) => {
                                                    const getCategoryOrder = (name) => {
                                                        const category = categories.find(cat => cat.title === name);
                                                        if (category && category.order_index !== undefined) {
                                                            return category.order_index;
                                                        }
                                                        // Kategori yoksa menülerin minimum order_index'ini kullan
                                                        const items = menuCategories[name] || [];
                                                        const orders = items.map(m => m.order_index || 999);
                                                        return orders.length ? Math.min(...orders) : 999;
                                                    };
                                                    return getCategoryOrder(a) - getCategoryOrder(b);
                                                });

                                                // Her kategori için HTML oluştur
                                                let html = '';
                                                sortedCategoryNames.forEach(categoryName => {
                                                    const categoryMenus = menuCategories[categoryName];

                                                    // Kategori başlığı
                                                    html += `
                                                        <tr class="table-info">
                                                            <td colspan="7" class="fw-bold text-primary">
                                                                <i class="ri-folder-line me-2"></i>${categoryName}
                                                            </td>
                                                        </tr>
                                                    `;

                                                    // Kategori altındaki menüler
                                                    categoryMenus.sort((a, b) => (a.order_index || 0) - (b.order_index || 0)).forEach(menu => {
                                                        html += `
                                                            <tr>
                                                                <td>${menu.order_index}</td>
                                                                <td>
                                                                    <i class="${menu.icon} me-2"></i>
                                                                    ${menu.title}
                                                                </td>
                                                                <td>
                                                                    ${menu.category ? `<span class="badge bg-info">${menu.category}</span>` : '-'}
                                                                </td>
                                                                <td><code>${menu.url}</code></td>
                                                                <td><code>${menu.icon || '-'}</code></td>
                                                                <td>
                                                                    <span class="badge ${menu.is_active ? 'bg-success' : 'bg-danger'}">
                                                                        ${menu.is_active ? 'Aktif' : 'Pasif'}
                                                                    </span>
                                                                </td>
                                                                <td>
                                                                    <button class="btn btn-soft-primary btn-sm edit-menu-btn" data-menu-id="${menu.id}">
                                                                        <i class="ri-pencil-line"></i>
                                                                    </button>
                                                                    <button class="btn btn-soft-danger btn-sm delete-menu-btn" data-menu-id="${menu.id}">
                                                                        <i class="ri-delete-bin-line"></i>
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        `;
                                                    });
                                                });

                                                return html;
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            return { html, title: 'Menü Yönetimi' };
        }
    } catch (error) {
        console.error('Menus content error:', error);
        return {
            html: '<div class="alert alert-danger">Menü verileri yüklenemedi!</div>',
            title: 'Menü Yönetimi'
        };
    }
}

export function init() {
    // Add category button - Event listener duplicate olmaması için kontrol
    const addCategoryBtn = document.getElementById('addCategoryBtn');
    if (addCategoryBtn && !addCategoryBtn.dataset.listenerAdded) {
        addCategoryBtn.dataset.listenerAdded = 'true';
        addCategoryBtn.addEventListener('click', () => {
            // showCategoryModal global function defined in hybrid-layout.html
            if (typeof showCategoryModal === 'function') {
                showCategoryModal();
            }
        });
    }

    // Add menu button - Event listener duplicate olmaması için kontrol
    const addMenuBtn = document.getElementById('addMenuBtn');
    if (addMenuBtn && !addMenuBtn.dataset.listenerAdded) {
        addMenuBtn.dataset.listenerAdded = 'true';
        addMenuBtn.addEventListener('click', () => {
            // showMenuModal global function defined in hybrid-layout.html
            if (typeof showMenuModal === 'function') {
                showMenuModal();
            }
        });
    }

    // Edit category buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.edit-category-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', () => {
            const categoryId = btn.getAttribute('data-category-id');
            // editCategory global function defined in hybrid-layout.html
            if (typeof editCategory === 'function') {
                editCategory(categoryId);
            }
        });
    });

    // Delete category buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.delete-category-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', async () => {
            const categoryId = btn.getAttribute('data-category-id');

            // Yeni modal utility kullanımı
            const confirmed = await showConfirmDelete({
                message: 'Bu kategoriyi silmek istediğinizden emin misiniz? Bu kategorideki tüm menüler etkilenebilir.'
            });

            if (confirmed) {
                try {
                    const response = await fetch(`/api/menus/${categoryId}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        showSuccess('Kategori başarıyla silindi!');
                        setTimeout(() => window.reloadPage(), 1500);
                    } else {
                        showError(data.message || 'Kategori silinemedi!');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    showError('Kategori silinirken bir hata oluştu!');
                }
            }
        });
    });

    // Edit menu buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.edit-menu-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', () => {
            const menuId = btn.getAttribute('data-menu-id');
            // editMenu global function defined in hybrid-layout.html
            if (typeof editMenu === 'function') {
                editMenu(menuId);
            }
        });
    });

    // Delete menu buttons - Event listener duplicate olmaması için kontrol
    document.querySelectorAll('.delete-menu-btn').forEach(btn => {
        if (btn.dataset.listenerAdded === 'true') {
            return;
        }
        btn.dataset.listenerAdded = 'true';

        btn.addEventListener('click', async () => {
            const menuId = btn.getAttribute('data-menu-id');

            // Yeni modal utility kullanımı
            const confirmed = await showConfirmDelete({
                message: 'Bu menüyü silmek istediğinizden emin misiniz?'
            });

            if (confirmed) {
                try {
                    const response = await fetch(`/api/menus/${menuId}`, {
                        method: 'DELETE'
                    });

                    const data = await response.json();

                    if (data.success) {
                        showSuccess('Menü başarıyla silindi!');
                        setTimeout(() => window.reloadPage(), 1500);
                    } else {
                        showError(data.message || 'Menü silinemedi!');
                    }
                } catch (error) {
                    console.error('Delete error:', error);
                    showError('Menü silinirken bir hata oluştu!');
                }
            }
        });
    });

    console.log('Menus page initialized');
}
