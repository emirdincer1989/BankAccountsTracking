// Ortak JavaScript fonksiyonları
let currentUser = null;

// Kullanıcı bilgilerini yükle
async function loadUserInfo() {
    try {
        const response = await fetch('/api/auth/me');
        const data = await response.json();
        
        if (data.success) {
            currentUser = data.data.user;
            
            // User dropdown'daki bilgileri güncelle
            const userNameText = document.querySelector('.user-name-text');
            const userNameSubText = document.querySelector('.user-name-sub-text');
            if (userNameText) userNameText.textContent = currentUser.name;
            if (userNameSubText) userNameSubText.textContent = currentUser.role_name;
            
            return currentUser;
        } else {
            const base = (window.APP_CONFIG && window.APP_CONFIG.BASE_PATH) || '';
            window.location.href = `${base}/`;
            return null;
        }
    } catch (error) {
        console.error('User info load error:', error);
        const base = (window.APP_CONFIG && window.APP_CONFIG.BASE_PATH) || '';
        window.location.href = `${base}/`;
        return null;
    }
}

// Menü cache'i
let menuCache = null;
let menuCacheTimestamp = null;
const MENU_CACHE_DURATION = 5 * 60 * 1000; // 5 dakika

// DEBUG: Cache'i kapat (geçici)
// menuCache = null;
// menuCacheTimestamp = null;

// Menüleri yükle (cache'li)
async function loadMenus() {
    try {
        console.log('Menüler yükleniyor...');
        
        // Not: Finans admin redirect kaldırıldı (şablonla ilgili değil)
        
        // Farklı sayfalarda farklı sidebar yapıları olabilir, hepsini dene
        const navbar = document.getElementById('navbar-nav') || 
                      document.querySelector('.navbar-nav') ||
                      document.querySelector('#sidebar-menu') ||
                      document.querySelector('.sidebar-menu');
        
        if (!navbar) {
            console.error('Sidebar menü container bulunamadı!');
            return;
        }
        
        // Cache kontrolü
        const now = Date.now();
        if (menuCache && menuCacheTimestamp && (now - menuCacheTimestamp) < MENU_CACHE_DURATION) {
            console.log('Menüler cache\'den yükleniyor...');
            renderMenus(navbar, menuCache);
            return;
        }
        
        // Loading state göster (sadece cache yoksa)
        navbar.innerHTML = `
            <li class="nav-item">
                <div class="nav-link d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status" style="width: 1rem; height: 1rem;">
                        <span class="visually-hidden">Yükleniyor...</span>
                    </div>
                    <span class="text-muted">Menüler yükleniyor...</span>
                </div>
            </li>
        `;
        navbar.style.display = 'block';
        
        const response = await fetch('/api/dashboard/user-menu');
        const data = await response.json();
        
        console.log('Menü API yanıtı:', data);
        console.log('API yanıtı detayları:', {
            success: data.success,
            hasData: !!data.data,
            dataKeys: data.data ? Object.keys(data.data) : 'data yok',
            menus: data.data?.menus,
            menusType: typeof data.data?.menus,
            isArray: Array.isArray(data.data?.menus)
        });
        
        if (data.success) {
            // Cache'e kaydet
            menuCache = data.data?.menus;
            menuCacheTimestamp = now;
            
            console.log('Menüler cache\'e kaydedildi:', menuCache);
            renderMenus(navbar, data.data?.menus);
        } else {
            throw new Error('API yanıtı başarısız: ' + (data.message || 'Bilinmeyen hata'));
        }
    } catch (error) {
        console.error('Menu load error:', error);
        
        // Hata durumunda da loading state'i kaldır
        const navbar = document.getElementById('navbar-nav') || 
                      document.querySelector('.navbar-nav') ||
                      document.querySelector('#sidebar-menu') ||
                      document.querySelector('.sidebar-menu');
        
        if (navbar) {
            let errorMessage = 'Menü yüklenemedi';
            let errorIcon = 'ri-error-warning-line';
            let errorClass = 'text-danger';
            
            // Hata türüne göre farklı mesajlar
            if (error.message.includes('API yanıtı başarısız')) {
                errorMessage = 'Sunucu hatası - menüler yüklenemedi';
                errorIcon = 'ri-server-line';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Bağlantı hatası - internet bağlantınızı kontrol edin';
                errorIcon = 'ri-wifi-off-line';
            } else if (error.message.includes('401') || error.message.includes('403')) {
                errorMessage = 'Yetki hatası - lütfen tekrar giriş yapın';
                errorIcon = 'ri-shield-cross-line';
                errorClass = 'text-warning';
            }
            
            navbar.innerHTML = `
                <li class="nav-item">
                    <div class="nav-link ${errorClass}">
                        <i class="${errorIcon} me-2"></i>
                        <span>${errorMessage}</span>
                    </div>
                </li>
                <li class="nav-item">
                    <div class="nav-link">
                        <button class="btn btn-sm btn-outline-primary" onclick="window.loadMenus()">
                            <i class="ri-refresh-line me-1"></i>
                            Tekrar Dene
                        </button>
                    </div>
                </li>
            `;
        }
    }
}

// Menüleri render et
function renderMenus(navbar, menus) {
    navbar.innerHTML = '';
    navbar.style.display = 'block';
    
    console.log('Menüler işleniyor:', menus);
    
    // Menüler undefined veya array değilse hata göster
    if (!menus || !Array.isArray(menus)) {
        console.error('Menüler undefined veya array değil:', menus);
        navbar.innerHTML = `
            <li class="nav-item">
                <div class="nav-link text-warning">
                    <i class="ri-error-warning-line me-2"></i>
                    <span>Menü verisi bulunamadı</span>
                </div>
            </li>
        `;
        return;
    }
    
    // Boş menü listesi kontrolü
    if (menus.length === 0) {
        console.log('Menü listesi boş');
        navbar.innerHTML = `
            <li class="nav-item">
                <div class="nav-link text-muted">
                    <i class="ri-menu-line me-2"></i>
                    <span>Menü bulunamadı</span>
                </div>
            </li>
        `;
        return;
    }
    
    // Kategorilere göre grupla
    const categories = {};
    menus.forEach(menu => {
        if (!categories[menu.category]) {
            categories[menu.category] = [];
        }
        categories[menu.category].push(menu);
    });
    
    // Kategorileri order_index'e göre sırala
    const sortedCategoryNames = Object.keys(categories).sort((a, b) => {
        // Kategori adına göre sabit sıralama (Ana Menu -> Admin Islemleri -> Finansal Islemler)
        const categoryOrder = {
            'Ana Menu': 0,
            'Admin Islemleri': 1, 
            'Finansal Islemler': 2
        };
        
        const orderA = categoryOrder[a] !== undefined ? categoryOrder[a] : 999;
        const orderB = categoryOrder[b] !== undefined ? categoryOrder[b] : 999;
        
        return orderA - orderB;
    });
    
    // Her kategori için menüleri render et
    sortedCategoryNames.forEach(categoryName => {
        const categoryMenus = categories[categoryName];
        
        // Kategori başlığı (eğer kategori adı varsa)
        if (categoryName && categoryName !== 'null' && categoryName !== 'undefined') {
            const categoryLi = document.createElement('li');
            categoryLi.className = 'menu-title';
            categoryLi.innerHTML = `<span data-key="t-${categoryName.toLowerCase()}">${categoryName}</span>`;
            navbar.appendChild(categoryLi);
        }
        
        // Kategori altındaki menüleri sıralı olarak göster
        categoryMenus
            .sort((a, b) => a.order_index - b.order_index)
            .forEach(menu => {
                if (!menu.is_category) { // Sadece normal menüleri göster
                    const li = document.createElement('li');
                    li.className = 'nav-item';

                    const a = document.createElement('a');
                    a.className = 'nav-link menu-link';
                    // URL'in başında / varsa ekleme, yoksa ekle
                    a.href = menu.url.startsWith('/') ? menu.url : '/' + menu.url;
                    a.innerHTML = `<i class="${menu.icon}"></i> <span data-key="t-${menu.title.toLowerCase()}">${menu.title}</span>`;

                    li.appendChild(a);
                    navbar.appendChild(li);
                }
            });
    });
    
    console.log('Menüler başarıyla render edildi. Toplam menü sayısı:', navbar.children.length);
}

// Cache'i temizle (menü değişikliklerinde kullanılacak)
function clearMenuCache() {
    menuCache = null;
    menuCacheTimestamp = null;
    console.log('Menü cache temizlendi');
}

// Çıkış yap
async function logout() {
    try {
        // Önce tarayıcı tarafı kalıntılarını temizle
        try {
            localStorage.removeItem('auth_token');
            sessionStorage.removeItem('auth_token');
            
            // Tüm cookie'leri silmeye çalış (yalnızca current domain ve path için)
            document.cookie.split(';').forEach(function(c) {
                const [name] = c.trim().split('=');
                if (!name) return;
                document.cookie = name + '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/';
            });
        } catch (e) {
            console.warn('Client-side token temizleme hatası:', e);
        }
        
        // Backend'e logout isteği gönder
        const response = await fetch('/api/auth/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        // Çıkış başarılı olsun ya da olmasın, login sayfasına yönlendir
        const base = (window.APP_CONFIG && window.APP_CONFIG.BASE_PATH) || '';
        window.location.href = `${base}/`;
    } catch (error) {
        console.error('Logout error:', error);
        const base = (window.APP_CONFIG && window.APP_CONFIG.BASE_PATH) || '';
        window.location.href = `${base}/`;
    }
}

// Sayfa yüklendiğinde ortak işlemleri yap
document.addEventListener('DOMContentLoaded', function() {
    loadUserInfo();
    loadMenus();
});

// Logout butonuna tıklama event listener'ı
document.addEventListener('click', function(e) {
    const target = e.target.closest('[data-logout]');
    if (target) {
        e.preventDefault();
        logout();
    }
});

// Global fonksiyonları window objesine ekle
window.loadUserInfo = loadUserInfo;
window.loadMenus = loadMenus;
window.logout = logout;
