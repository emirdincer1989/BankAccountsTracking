/**
 * Auth Helpers - Yetkilendirme ve Kimlik Doğrulama Yardımcı Fonksiyonları
 * 
 * Bu dosya kullanıcı yetkilerini kontrol etmek ve UI elementlerini yönetmek için
 * kullanılan yardımcı fonksiyonları içerir.
 * 
 * @requires currentUser - common.js tarafından yüklenen global kullanıcı objesi
 */

(function(window) {
    'use strict';
    
    // Permission cache
    const permissionCache = new Map();
    
    /**
     * İzin cache'ini temizle
     */
    function clearPermissionCache() {
        permissionCache.clear();
        console.log('🗑️ İzin cache\'i temizlendi');
    }
    
    // ==================== TEK İZİN KONTROLÜ ====================
    
    /**
     * Kullanıcının belirli bir modül ve aksiyon için izni var mı kontrol eder
     * @param {string} module - Modül adı (örn: 'users', 'roles')
     * @param {string} action - Aksiyon adı (örn: 'view', 'create', 'edit', 'delete')
     * @returns {boolean} İzin varsa true, yoksa false
     */
    function hasPermission(module, action) {
        if (!currentUser) {
            console.warn('⚠️ currentUser tanımlı değil');
            return false;
        }
        
        // Super admin her şeye erişebilir
        if (currentUser.role_name === 'Super Admin') {
            return true;
        }
        
        if (!currentUser.permissions || typeof currentUser.permissions !== 'object') {
            console.warn('⚠️ Kullanıcı izinleri bulunamadı');
            return false;
        }
        
        // İzin kontrolü
        const modulePermissions = currentUser.permissions[module];
        if (!modulePermissions) {
            return false;
        }
        
        return modulePermissions[action] === true;
    }
    
    /**
     * Cache'li izin kontrolü - Performans için
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     * @returns {boolean} İzin varsa true, yoksa false
     */
    function hasPermissionCached(module, action) {
        const cacheKey = `${module}.${action}`;
        
        if (permissionCache.has(cacheKey)) {
            return permissionCache.get(cacheKey);
        }
        
        const result = hasPermission(module, action);
        permissionCache.set(cacheKey, result);
        return result;
    }
    
    // ==================== ÇOKLU İZİN KONTROLÜ ====================
    
    /**
     * Kullanıcının tüm belirtilen izinlere sahip olup olmadığını kontrol eder
     * @param {...string} permissions - İzin çiftleri (module.action formatında)
     * @returns {boolean} Tüm izinler varsa true
     * @example hasAllPermissions('users.view', 'users.edit')
     */
    function hasAllPermissions(...permissions) {
        if (!currentUser) {
            return false;
        }
        
        return permissions.every(permission => {
            const [module, action] = permission.split('.');
            return hasPermission(module, action);
        });
    }
    
    /**
     * Kullanıcının belirtilen izinlerden en az birine sahip olup olmadığını kontrol eder
     * @param {...string} permissions - İzin çiftleri (module.action formatında)
     * @returns {boolean} En az bir izin varsa true
     * @example hasAnyPermission('users.view', 'roles.view')
     */
    function hasAnyPermission(...permissions) {
        if (!currentUser) {
            return false;
        }
        
        return permissions.some(permission => {
            const [module, action] = permission.split('.');
            return hasPermission(module, action);
        });
    }
    
    /**
     * Belirli bir modüle erişim yetkisi var mı kontrol eder
     * @param {string} module - Modül adı
     * @returns {boolean} Modüle herhangi bir yetki varsa true
     */
    function hasModulePermission(module) {
        if (!currentUser || !currentUser.permissions) {
            return false;
        }
        
        // Super admin kontrolü
        if (currentUser.role_name === 'Super Admin') {
            return true;
        }
        
        const modulePermissions = currentUser.permissions[module];
        if (!modulePermissions) {
            return false;
        }
        
        // En az bir aksiyon yetkisi varsa true döner
        return Object.values(modulePermissions).some(value => value === true);
    }
    
    /**
     * Bir modülün tüm yetkilerini döndürür
     * @param {string} module - Modül adı
     * @returns {Object} İzinler objesi
     */
    function getModulePermissions(module) {
        if (!currentUser || !currentUser.permissions) {
            return {};
        }
        
        return currentUser.permissions[module] || {};
    }
    
    /**
     * Toplu izin kontrolü yapar
     * @param {Array<{module: string, action: string}>} permissions - Kontrol edilecek izinler
     * @returns {Object} Her izin için sonuç içeren obje
     * @example checkMultiplePermissions([{module: 'users', action: 'view'}, {module: 'roles', action: 'edit'}])
     */
    function checkMultiplePermissions(permissions) {
        const results = {};
        
        permissions.forEach(permission => {
            const key = `${permission.module}.${permission.action}`;
            results[key] = hasPermission(permission.module, permission.action);
        });
        
        return results;
    }
    
    // ==================== ROL KONTROLÜ ====================
    
    /**
     * Kullanıcının belirli bir rolü var mı kontrol eder
     * @param {string} roleName - Rol adı (örn: 'Admin', 'Super Admin')
     * @returns {boolean} Rol eşleşirse true
     */
    function isRole(roleName) {
        if (!currentUser || !currentUser.role_name) {
            return false;
        }
        
        return currentUser.role_name.toLowerCase() === roleName.toLowerCase();
    }
    
    /**
     * Kullanıcı Super Admin mi kontrol eder
     * @returns {boolean} Super Admin ise true
     */
    function isSuperAdmin() {
        return isRole('Super Admin');
    }
    
    /**
     * Kullanıcının belirtilen rollerden herhangi birine sahip olup olmadığını kontrol eder
     * @param {...string} roleNames - Rol adları
     * @returns {boolean} Rollerden biri eşleşirse true
     * @example isAnyRole('Admin', 'Super Admin')
     */
    function isAnyRole(...roleNames) {
        if (!currentUser || !currentUser.role_name) {
            return false;
        }
        
        return roleNames.some(roleName => 
            currentUser.role_name.toLowerCase() === roleName.toLowerCase()
        );
    }
    
    // ==================== KULLANICI BİLGİSİ ====================
    
    /**
     * Kullanıcının oturum açıp açmadığını kontrol eder
     * @returns {boolean} Oturum açıksa true
     */
    function isLoggedIn() {
        return currentUser !== null && typeof currentUser === 'object';
    }
    
    /**
     * Mevcut kullanıcının ID'sini döndürür
     * @returns {number|null} Kullanıcı ID'si veya null
     */
    function getCurrentUserId() {
        return currentUser ? currentUser.id : null;
    }
    
    /**
     * Mevcut kullanıcının adını döndürür
     * @returns {string|null} Kullanıcı adı veya null
     */
    function getCurrentUserName() {
        return currentUser ? currentUser.name : null;
    }
    
    /**
     * Mevcut kullanıcının e-posta adresini döndürür
     * @returns {string|null} E-posta adresi veya null
     */
    function getCurrentUserEmail() {
        return currentUser ? currentUser.email : null;
    }
    
    /**
     * Mevcut kullanıcının rolünü döndürür
     * @returns {string|null} Rol adı veya null
     */
    function getCurrentUserRole() {
        return currentUser ? currentUser.role_name : null;
    }
    
    /**
     * Mevcut kullanıcının tüm bilgilerini döndürür
     * @returns {Object|null} Kullanıcı objesi veya null
     */
    function getCurrentUser() {
        return currentUser ? {...currentUser} : null;
    }
    
    // ==================== UI ELEMENT YÖNETİMİ ====================
    
    /**
     * Bir elementi izne göre gösterir veya gizler
     * @param {string} elementId - Element ID'si
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     */
    function showIfPermission(elementId, module, action) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Element bulunamadı: ${elementId}`);
            return;
        }
        
        if (hasPermission(module, action)) {
            element.style.display = '';
            element.removeAttribute('disabled');
        } else {
            element.style.display = 'none';
        }
    }
    
    /**
     * Bir elementi role göre gösterir veya gizler
     * @param {string} elementId - Element ID'si
     * @param {string} roleName - Rol adı
     */
    function showIfRole(elementId, roleName) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Element bulunamadı: ${elementId}`);
            return;
        }
        
        if (isRole(roleName)) {
            element.style.display = '';
            element.removeAttribute('disabled');
        } else {
            element.style.display = 'none';
        }
    }
    
    /**
     * Selector ile seçilen tüm elementleri izne göre gösterir/gizler
     * @param {string} selector - CSS selector
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     */
    function showElementsByPermission(selector, module, action) {
        const elements = document.querySelectorAll(selector);
        const hasAccess = hasPermission(module, action);
        
        elements.forEach(element => {
            if (hasAccess) {
                element.style.display = '';
                element.removeAttribute('disabled');
            } else {
                element.style.display = 'none';
            }
        });
        
        console.log(`🔍 ${elements.length} element ${module}.${action} için ${hasAccess ? 'gösterildi' : 'gizlendi'}`);
    }
    
    /**
     * Selector ile seçilen tüm elementleri role göre gösterir/gizler
     * @param {string} selector - CSS selector
     * @param {string} roleName - Rol adı
     */
    function showElementsByRole(selector, roleName) {
        const elements = document.querySelectorAll(selector);
        const hasAccess = isRole(roleName);
        
        elements.forEach(element => {
            if (hasAccess) {
                element.style.display = '';
                element.removeAttribute('disabled');
            } else {
                element.style.display = 'none';
            }
        });
        
        console.log(`🔍 ${elements.length} element ${roleName} rolü için ${hasAccess ? 'gösterildi' : 'gizlendi'}`);
    }
    
    /**
     * Bir elementi izne göre aktif/pasif yapar
     * @param {string} elementId - Element ID'si
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     */
    function enableIfPermission(elementId, module, action) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Element bulunamadı: ${elementId}`);
            return;
        }
        
        if (hasPermission(module, action)) {
            element.removeAttribute('disabled');
            element.classList.remove('disabled');
        } else {
            element.setAttribute('disabled', 'disabled');
            element.classList.add('disabled');
        }
    }
    
    /**
     * Selector ile seçilen tüm elementleri izne göre aktif/pasif yapar
     * @param {string} selector - CSS selector
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     */
    function enableElementsByPermission(selector, module, action) {
        const elements = document.querySelectorAll(selector);
        const hasAccess = hasPermission(module, action);
        
        elements.forEach(element => {
            if (hasAccess) {
                element.removeAttribute('disabled');
                element.classList.remove('disabled');
            } else {
                element.setAttribute('disabled', 'disabled');
                element.classList.add('disabled');
            }
        });
    }
    
    /**
     * Bir elemente izne göre CSS class ekler/çıkarır
     * @param {string} elementId - Element ID'si
     * @param {string} className - Class adı
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     */
    function addClassIfPermission(elementId, className, module, action) {
        const element = document.getElementById(elementId);
        if (!element) {
            console.warn(`⚠️ Element bulunamadı: ${elementId}`);
            return;
        }
        
        if (hasPermission(module, action)) {
            element.classList.add(className);
        } else {
            element.classList.remove(className);
        }
    }
    
    // ==================== SAYFA ERİŞİM KONTROLÜ ====================
    
    /**
     * Sayfa erişim kontrolü - İzin yoksa yönlendirir
     * @param {string} module - Modül adı
     * @param {string} action - Aksiyon adı
     * @param {string} redirectUrl - Yönlendirme URL'i (opsiyonel, varsayılan: /dashboard)
     */
    function requirePermission(module, action, redirectUrl = '/dashboard') {
        if (!hasPermission(module, action)) {
            console.warn(`❌ Erişim reddedildi: ${module}.${action}`);
            alert('Bu sayfayı görüntüleme yetkiniz yok!');
            window.location.href = redirectUrl;
            return false;
        }
        
        console.log(`✅ Erişim izni verildi: ${module}.${action}`);
        return true;
    }
    
    /**
     * Rol tabanlı sayfa erişim kontrolü
     * @param {...string|Object} args - Rol adları veya son parametre olarak options objesi
     * @example requireRole('Admin', 'Super Admin', {redirectUrl: '/dashboard'})
     */
    function requireRole(...args) {
        // Son parametre obje mi kontrol et (options için)
        let redirectUrl = '/dashboard';
        let roleNames = args;
        
        if (args.length > 0 && typeof args[args.length - 1] === 'object') {
            const options = args[args.length - 1];
            redirectUrl = options.redirectUrl || '/dashboard';
            roleNames = args.slice(0, -1);
        }
        
        if (!isAnyRole(...roleNames)) {
            console.warn(`❌ Rol erişimi reddedildi. İzin verilen roller: ${roleNames.join(', ')}`);
            alert('Bu sayfayı görüntüleme yetkiniz yok!');
            window.location.href = redirectUrl;
            return false;
        }
        
        console.log(`✅ Rol erişimi verildi: ${getCurrentUserRole()}`);
        return true;
    }
    
    // ==================== OTOMATIK GÜNCELLEME ====================
    
    /**
     * data-permission attribute'una sahip tüm elementleri günceller
     * Kullanım: <button data-permission="users.edit">Düzenle</button>
     */
    function updatePermissionElements() {
        // data-permission ile işaretlenmiş elementler
        const permissionElements = document.querySelectorAll('[data-permission]');
        
        permissionElements.forEach(element => {
            const permission = element.getAttribute('data-permission');
            const [module, action] = permission.split('.');
            
            if (module && action) {
                if (hasPermission(module, action)) {
                    element.style.display = '';
                    element.removeAttribute('disabled');
                } else {
                    element.style.display = 'none';
                }
            }
        });
        
        // data-role ile işaretlenmiş elementler
        const roleElements = document.querySelectorAll('[data-role]');
        
        roleElements.forEach(element => {
            const roleName = element.getAttribute('data-role');
            
            if (isRole(roleName)) {
                element.style.display = '';
                element.removeAttribute('disabled');
            } else {
                element.style.display = 'none';
            }
        });
        
        console.log(`🔄 ${permissionElements.length} izin elementi ve ${roleElements.length} rol elementi güncellendi`);
    }
    
    // ==================== EXPORT ====================
    
    // Window objesine ekle
    window.authHelpers = {
        // İzin kontrolü
        hasPermission,
        hasPermissionCached,
        hasAllPermissions,
        hasAnyPermission,
        hasModulePermission,
        getModulePermissions,
        checkMultiplePermissions,
        
        // Rol kontrolü
        isRole,
        isSuperAdmin,
        isAnyRole,
        
        // Kullanıcı bilgisi
        isLoggedIn,
        getCurrentUserId,
        getCurrentUserName,
        getCurrentUserEmail,
        getCurrentUserRole,
        getCurrentUser,
        
        // UI element yönetimi
        showIfPermission,
        showIfRole,
        showElementsByPermission,
        showElementsByRole,
        enableIfPermission,
        enableElementsByPermission,
        addClassIfPermission,
        
        // Sayfa erişim kontrolü
        requirePermission,
        requireRole,
        
        // Cache yönetimi
        clearPermissionCache,
        
        // Otomatik güncelleme
        updatePermissionElements
    };
    
    // Sayfa yüklendiğinde cache'i temizle
    document.addEventListener('DOMContentLoaded', function() {
        clearPermissionCache();
        console.log('✅ Auth Helpers yüklendi ve hazır');
        console.log('📢 Kullanım: window.authHelpers.hasPermission("users", "view")');
    });
    
})(window);
