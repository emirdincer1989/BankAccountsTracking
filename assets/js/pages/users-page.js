/**
 * Kullanıcı Yönetimi Sayfası
 * 
 * Bu dosya kullanıcı listesi sayfasının tüm fonksiyonlarını içerir.
 * Auth Helpers kullanarak yetkilendirme kontrolleri yapar.
 * 
 * @requires authHelpers - auth-helpers.js
 * @requires currentUser - common.js
 */

(function() {
    'use strict';
    
    console.log('📄 users-page.js yüklendi');
    
    // Global değişkenler
    let currentUserId = null;
    let allUsers = [];
    let allRoles = [];
    
    /**
     * Sayfa başlatma fonksiyonu
     */
    function initUsersPage() {
        console.log('🚀 Kullanıcı yönetimi sayfası başlatılıyor...');
        
        // Sayfa erişim kontrolü
        if (!window.authHelpers.requirePermission('users', 'view')) {
            return; // Yetki yoksa sayfa yüklenmez
        }
        
        console.log('✅ Kullanıcı görüntüleme yetkisi var');
        
        // Sayfa UI'ını ayarla
        setupPageUI();
        
        // Kullanıcıları yükle
        loadUsers();
        
        // Rolleri yükle
        loadRoles();
        
        // Event listener'ları ekle
        attachEventListeners();
        
        console.log('✅ Kullanıcı yönetimi sayfası hazır');
    }
    
    /**
     * Sayfa UI'ını izinlere göre ayarla
     */
    function setupPageUI() {
        console.log('🎨 Sayfa UI ayarlanıyor...');
        
        // Yeni Kullanıcı butonu
        const addUserBtn = document.getElementById('addUserBtn');
        if (addUserBtn) {
            if (window.authHelpers.hasPermission('users', 'create')) {
                addUserBtn.style.display = '';
                console.log('✅ "Yeni Kullanıcı" butonu gösteriliyor');
            } else {
                addUserBtn.style.display = 'none';
                console.log('❌ "Yeni Kullanıcı" butonu gizlendi (yetki yok)');
            }
        }
        
        // Diğer UI elementleri için yetki kontrolü
        window.authHelpers.updatePermissionElements();
    }
    
    /**
     * Kullanıcıları API'den yükle
     */
    async function loadUsers() {
        console.log('📥 Kullanıcılar yükleniyor...');
        
        try {
            const response = await fetch('/api/users?page=1&limit=100&search=');
            const data = await response.json();
            
            if (data.success) {
                allUsers = data.data.users;
                console.log(`✅ ${allUsers.length} kullanıcı yüklendi`);
                renderUsersTable(allUsers);
            } else {
                console.error('❌ Kullanıcılar yüklenemedi:', data.message);
                showAlert('danger', data.message || 'Kullanıcılar yüklenemedi');
            }
        } catch (error) {
            console.error('❌ Kullanıcı yükleme hatası:', error);
            showAlert('danger', 'Sunucu hatası! Kullanıcılar yüklenemedi.');
        }
    }
    
    /**
     * Rolleri API'den yükle
     */
    async function loadRoles() {
        console.log('📥 Roller yükleniyor...');
        
        try {
            const response = await fetch('/api/roles');
            const data = await response.json();
            
            if (data.success) {
                allRoles = data.data.roles;
                console.log(`✅ ${allRoles.length} rol yüklendi`);
                
                // Role select'i doldur
                const roleSelect = document.getElementById('userRole');
                if (roleSelect) {
                    roleSelect.innerHTML = '<option value="">Rol seçin</option>';
                    allRoles.forEach(role => {
                        const option = document.createElement('option');
                        option.value = role.id;
                        option.textContent = role.name;
                        roleSelect.appendChild(option);
                    });
                }
            }
        } catch (error) {
            console.error('❌ Rol yükleme hatası:', error);
        }
    }
    
    /**
     * Kullanıcı tablosunu oluştur
     * @param {Array} users - Kullanıcı listesi
     */
    function renderUsersTable(users) {
        console.log(`📊 ${users.length} kullanıcı için tablo oluşturuluyor...`);
        
        const tableBody = document.getElementById('usersTableBody');
        if (!tableBody) {
            console.error('❌ usersTableBody elementi bulunamadı!');
            return;
        }
        
        // Yetki kontrolü
        const canEdit = window.authHelpers.hasPermission('users', 'edit');
        const canDelete = window.authHelpers.hasPermission('users', 'delete');
        const currentUserId = window.authHelpers.getCurrentUserId();
        
        console.log(`🔍 Düzenleme yetkisi: ${canEdit ? 'VAR' : 'YOK'}`);
        console.log(`🔍 Silme yetkisi: ${canDelete ? 'VAR' : 'YOK'}`);
        
        // Tabloyu temizle
        tableBody.innerHTML = '';
        
        // Her kullanıcı için satır oluştur
        users.forEach(user => {
            const row = document.createElement('tr');
            
            // Kendi kaydını silememe kontrolü
            const canDeleteThisUser = canDelete && user.id !== currentUserId;
            
            row.innerHTML = `
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
                            <li>
                                <a class="dropdown-item view-user-btn" href="#" data-user-id="${user.id}">
                                    <i class="ri-eye-fill align-bottom me-2 text-muted"></i> Görüntüle
                                </a>
                            </li>
                            ${canEdit ? `
                            <li>
                                <a class="dropdown-item edit-user-btn" href="#" data-user-id="${user.id}">
                                    <i class="ri-pencil-fill align-bottom me-2 text-muted"></i> Düzenle
                                </a>
                            </li>
                            ` : ''}
                            ${canEdit ? `
                            <li>
                                <a class="dropdown-item toggle-status-btn" href="#" data-user-id="${user.id}" data-current-status="${user.is_active}">
                                    <i class="ri-toggle-fill align-bottom me-2 text-muted"></i> 
                                    ${user.is_active ? 'Pasifleştir' : 'Aktifleştir'}
                                </a>
                            </li>
                            ` : ''}
                            ${canEdit && window.authHelpers.hasPermission('roles', 'view') ? `
                            <li>
                                <a class="dropdown-item change-role-btn" href="#" data-user-id="${user.id}">
                                    <i class="ri-shield-user-fill align-bottom me-2 text-muted"></i> Rol Değiştir
                                </a>
                            </li>
                            ` : ''}
                            ${canDeleteThisUser ? `
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <a class="dropdown-item text-danger delete-user-btn" href="#" data-user-id="${user.id}">
                                    <i class="ri-delete-bin-fill align-bottom me-2"></i> Sil
                                </a>
                            </li>
                            ` : ''}
                            ${!canDeleteThisUser && user.id === currentUserId ? `
                            <li><hr class="dropdown-divider"></li>
                            <li>
                                <span class="dropdown-item text-muted disabled">
                                    <i class="ri-information-fill align-bottom me-2"></i> Kendi kaydınızı silemezsiniz
                                </span>
                            </li>
                            ` : ''}
                        </ul>
                    </div>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        console.log('✅ Tablo oluşturuldu');
    }
    
    /**
     * Event listener'ları ekle
     */
    function attachEventListeners() {
        console.log('🎯 Event listener\'lar ekleniyor...');
        
        // Arama kutusu
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', function(e) {
                const searchTerm = e.target.value.toLowerCase();
                const filteredUsers = allUsers.filter(user => 
                    user.name.toLowerCase().includes(searchTerm) ||
                    user.email.toLowerCase().includes(searchTerm) ||
                    (user.role_name && user.role_name.toLowerCase().includes(searchTerm))
                );
                renderUsersTable(filteredUsers);
            });
        }
        
        // Event delegation ile buton click'leri
        document.addEventListener('click', function(e) {
            // Görüntüle butonu
            if (e.target.closest('.view-user-btn')) {
                e.preventDefault();
                const userId = e.target.closest('.view-user-btn').dataset.userId;
                console.log(`👁️ Kullanıcı görüntüleniyor: ${userId}`);
                viewUser(userId);
            }
            
            // Düzenle butonu
            if (e.target.closest('.edit-user-btn')) {
                e.preventDefault();
                const userId = e.target.closest('.edit-user-btn').dataset.userId;
                console.log(`✏️ Kullanıcı düzenleniyor: ${userId}`);
                
                // Yetki kontrolü
                if (!window.authHelpers.hasPermission('users', 'edit')) {
                    showAlert('danger', 'Kullanıcı düzenleme yetkiniz yok!');
                    return;
                }
                
                editUser(userId);
            }
            
            // Sil butonu
            if (e.target.closest('.delete-user-btn')) {
                e.preventDefault();
                const userId = parseInt(e.target.closest('.delete-user-btn').dataset.userId);
                console.log(`🗑️ Kullanıcı siliniyor: ${userId}`);
                
                // Yetki kontrolü
                if (!window.authHelpers.hasPermission('users', 'delete')) {
                    showAlert('danger', 'Kullanıcı silme yetkiniz yok!');
                    return;
                }
                
                // Kendi kaydını silememe kontrolü
                if (userId === window.authHelpers.getCurrentUserId()) {
                    showAlert('warning', 'Kendi kullanıcı kaydınızı silemezsiniz!');
                    return;
                }
                
                deleteUser(userId);
            }
            
            // Durum değiştir butonu
            if (e.target.closest('.toggle-status-btn')) {
                e.preventDefault();
                const btn = e.target.closest('.toggle-status-btn');
                const userId = btn.dataset.userId;
                const currentStatus = btn.dataset.currentStatus === 'true';
                console.log(`🔄 Kullanıcı durumu değiştiriliyor: ${userId}`);
                
                // Yetki kontrolü
                if (!window.authHelpers.hasPermission('users', 'edit')) {
                    showAlert('danger', 'Kullanıcı düzenleme yetkiniz yok!');
                    return;
                }
                
                toggleUserStatus(userId, currentStatus);
            }
            
            // Rol değiştir butonu
            if (e.target.closest('.change-role-btn')) {
                e.preventDefault();
                const userId = e.target.closest('.change-role-btn').dataset.userId;
                console.log(`👑 Kullanıcı rolü değiştiriliyor: ${userId}`);
                
                // Yetki kontrolü
                if (!window.authHelpers.hasPermission('users', 'edit')) {
                    showAlert('danger', 'Kullanıcı düzenleme yetkiniz yok!');
                    return;
                }
                
                changeUserRole(userId);
            }
            
            // Yeni kullanıcı butonu
            if (e.target.closest('#addUserBtn')) {
                e.preventDefault();
                console.log('➕ Yeni kullanıcı ekleniyor');
                
                // Yetki kontrolü
                if (!window.authHelpers.hasPermission('users', 'create')) {
                    showAlert('danger', 'Kullanıcı ekleme yetkiniz yok!');
                    return;
                }
                
                showUserModal();
            }
        });
        
        console.log('✅ Event listener\'lar eklendi');
    }
    
    /**
     * Kullanıcı görüntüleme
     * @param {number} userId - Kullanıcı ID
     */
    function viewUser(userId) {
        const user = allUsers.find(u => u.id == userId);
        if (!user) {
            console.error('❌ Kullanıcı bulunamadı:', userId);
            return;
        }
        
        console.log('👁️ Kullanıcı detayları:', user);
        
        // Modal veya alert ile kullanıcı bilgilerini göster
        const userInfo = `
            Ad: ${user.name}
            E-posta: ${user.email}
            Rol: ${user.role_name}
            Durum: ${user.is_active ? 'Aktif' : 'Pasif'}
            Son Giriş: ${user.last_login ? new Date(user.last_login).toLocaleString('tr-TR') : 'Hiç giriş yapmamış'}
        `;
        
        alert(userInfo);
    }
    
    /**
     * Kullanıcı düzenleme
     * @param {number} userId - Kullanıcı ID
     */
    async function editUser(userId) {
        console.log(`✏️ Kullanıcı düzenleme modalı açılıyor: ${userId}`);
        
        try {
            const response = await fetch(`/api/users/${userId}`);
            const data = await response.json();
            
            if (data.success) {
                const user = data.data.user;
                console.log('✅ Kullanıcı bilgileri yüklendi:', user);
                
                // Modal'ı doldur ve göster
                currentUserId = userId;
                document.getElementById('userName').value = user.name;
                document.getElementById('userEmail').value = user.email;
                document.getElementById('userRole').value = user.role_id;
                document.getElementById('userStatus').checked = user.is_active;
                document.getElementById('userPassword').required = false;
                
                // Modal göster
                const modal = new bootstrap.Modal(document.getElementById('userModal'));
                document.getElementById('userModalLabel').textContent = 'Kullanıcı Düzenle';
                document.getElementById('userStatusRow').style.display = 'block';
                modal.show();
            } else {
                showAlert('danger', data.message || 'Kullanıcı bilgileri yüklenemedi');
            }
        } catch (error) {
            console.error('❌ Kullanıcı düzenleme hatası:', error);
            showAlert('danger', 'Sunucu hatası! Kullanıcı bilgileri yüklenemedi.');
        }
    }
    
    /**
     * Kullanıcı silme
     * @param {number} userId - Kullanıcı ID
     */
    async function deleteUser(userId) {
        const user = allUsers.find(u => u.id == userId);
        if (!user) {
            console.error('❌ Kullanıcı bulunamadı:', userId);
            return;
        }
        
        const confirmMessage = `"${user.name}" kullanıcısını silmek istediğinizden emin misiniz?`;
        
        if (!confirm(confirmMessage)) {
            console.log('⏹️ Kullanıcı silme işlemi iptal edildi');
            return;
        }
        
        console.log(`🗑️ Kullanıcı siliniyor: ${userId}`);
        
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'DELETE'
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Kullanıcı silindi');
                showAlert('success', data.message || 'Kullanıcı başarıyla silindi');
                loadUsers(); // Listeyi yenile
            } else {
                console.error('❌ Kullanıcı silinemedi:', data.message);
                showAlert('danger', data.message || 'Kullanıcı silinemedi');
            }
        } catch (error) {
            console.error('❌ Kullanıcı silme hatası:', error);
            showAlert('danger', 'Sunucu hatası! Kullanıcı silinemedi.');
        }
    }
    
    /**
     * Kullanıcı durumu değiştir
     * @param {number} userId - Kullanıcı ID
     * @param {boolean} currentStatus - Mevcut durum
     */
    async function toggleUserStatus(userId, currentStatus) {
        const newStatus = !currentStatus;
        const statusText = newStatus ? 'aktifleştirilecek' : 'pasifleştirilecek';
        
        const user = allUsers.find(u => u.id == userId);
        const confirmMessage = `"${user.name}" kullanıcısı ${statusText}. Onaylıyor musunuz?`;
        
        if (!confirm(confirmMessage)) {
            console.log('⏹️ Durum değiştirme işlemi iptal edildi');
            return;
        }
        
        console.log(`🔄 Kullanıcı durumu değiştiriliyor: ${userId} -> ${newStatus}`);
        
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_active: newStatus })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Kullanıcı durumu değiştirildi');
                showAlert('success', `Kullanıcı ${newStatus ? 'aktifleştirildi' : 'pasifleştirildi'}`);
                loadUsers(); // Listeyi yenile
            } else {
                console.error('❌ Durum değiştirilemedi:', data.message);
                showAlert('danger', data.message || 'Durum değiştirilemedi');
            }
        } catch (error) {
            console.error('❌ Durum değiştirme hatası:', error);
            showAlert('danger', 'Sunucu hatası! Durum değiştirilemedi.');
        }
    }
    
    /**
     * Kullanıcı rolü değiştir
     * @param {number} userId - Kullanıcı ID
     */
    async function changeUserRole(userId) {
        const user = allUsers.find(u => u.id == userId);
        if (!user) {
            console.error('❌ Kullanıcı bulunamadı:', userId);
            return;
        }
        
        // Basit prompt ile rol seçimi (production'da modal kullanılmalı)
        let roleOptions = 'Mevcut Roller:\n';
        allRoles.forEach((role, index) => {
            roleOptions += `${index + 1}. ${role.name}\n`;
        });
        
        const selection = prompt(`${user.name} için yeni rol seçin:\n\n${roleOptions}\n\nRol numarasını girin:`);
        
        if (!selection) {
            console.log('⏹️ Rol değiştirme iptal edildi');
            return;
        }
        
        const roleIndex = parseInt(selection) - 1;
        if (roleIndex < 0 || roleIndex >= allRoles.length) {
            showAlert('danger', 'Geçersiz rol seçimi!');
            return;
        }
        
        const newRole = allRoles[roleIndex];
        console.log(`👑 Rol değiştiriliyor: ${userId} -> ${newRole.name}`);
        
        try {
            const response = await fetch(`/api/users/${userId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role_id: newRole.id })
            });
            
            const data = await response.json();
            
            if (data.success) {
                console.log('✅ Rol değiştirildi');
                showAlert('success', `Kullanıcının rolü "${newRole.name}" olarak değiştirildi`);
                loadUsers(); // Listeyi yenile
            } else {
                console.error('❌ Rol değiştirilemedi:', data.message);
                showAlert('danger', data.message || 'Rol değiştirilemedi');
            }
        } catch (error) {
            console.error('❌ Rol değiştirme hatası:', error);
            showAlert('danger', 'Sunucu hatası! Rol değiştirilemedi.');
        }
    }
    
    /**
     * Kullanıcı modalını göster
     */
    function showUserModal() {
        console.log('📋 Yeni kullanıcı modalı açılıyor');
        
        currentUserId = null;
        document.getElementById('userForm').reset();
        document.getElementById('userModalLabel').textContent = 'Yeni Kullanıcı';
        document.getElementById('userStatusRow').style.display = 'none';
        document.getElementById('userPassword').required = true;
        
        const modal = new bootstrap.Modal(document.getElementById('userModal'));
        modal.show();
    }
    
    /**
     * Alert göster
     * @param {string} type - Alert tipi (success, danger, warning, info)
     * @param {string} message - Mesaj
     */
    function showAlert(type, message) {
        console.log(`📢 Alert: [${type}] ${message}`);
        
        // Mevcut alert'leri temizle
        const existingAlerts = document.querySelectorAll('.alert.fixed-alert');
        existingAlerts.forEach(alert => alert.remove());
        
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show fixed-alert`;
        alertDiv.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; min-width: 300px; max-width: 400px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); border-radius: 8px;';
        alertDiv.innerHTML = `
            <div class="d-flex align-items-center">
                <div class="flex-grow-1">
                    <strong>${type === 'success' ? '✅ Başarılı!' : type === 'danger' ? '❌ Hata!' : type === 'warning' ? '⚠️ Uyarı!' : 'ℹ️ Bilgi!'}</strong><br>
                    <small>${message}</small>
                </div>
                <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
        
        document.body.appendChild(alertDiv);
        
        // 5 saniye sonra kaldır
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
    
    // Sayfa yüklendiğinde başlat
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initUsersPage);
    } else {
        initUsersPage();
    }
    
    // Export (opsiyonel - başka dosyalardan erişim için)
    window.usersPage = {
        init: initUsersPage,
        loadUsers: loadUsers,
        showUserModal: showUserModal
    };
    
})();
