/**
 * Header Bildirimleri Yönetimi
 * Header'daki bildirim dropdown'unu yönetir ve real-time günceller.
 */

let notificationSocket = null;
let unreadCount = 0;

/**
 * Header bildirimlerini yükle
 */
async function loadHeaderNotifications() {
    try {
        const response = await fetch('/api/notification-management/my-notifications?limit=10&offset=0', {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            unreadCount = result.data.unreadCount || 0;
            updateNotificationBadge();
            displayHeaderNotifications(result.data.notifications);
        }

    } catch (error) {
        console.error('Header bildirimleri yükleme hatası:', error);
    }
}

/**
 * Header bildirimlerini göster
 */
function displayHeaderNotifications(notifications) {
    const container = document.getElementById('headerNotificationsList');
    if (!container) return;

    if (notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center py-4">
                <i class="ri-inbox-line fs-32 text-muted mb-2"></i>
                <p class="text-muted mb-0">Henüz bildirim yok</p>
            </div>
        `;
        return;
    }

    const typeConfig = {
        info: { class: 'info', icon: 'ri-information-line', color: '#299cdb' },
        success: { class: 'success', icon: 'ri-checkbox-circle-line', color: '#0ab39c' },
        warning: { class: 'warning', icon: 'ri-alert-line', color: '#f7b84b' },
        error: { class: 'danger', icon: 'ri-error-warning-line', color: '#f06548' }
    };

    container.innerHTML = notifications.map(notification => {
        const config = typeConfig[notification.type] || typeConfig.info;
        const timeAgo = getTimeAgo(new Date(notification.created_at));
        const link = notification.link || '/notifications';

        return `
            <div class="text-reset notification-item d-block dropdown-item position-relative ${notification.is_read ? '' : 'bg-light'}" 
                 data-notification-id="${notification.id}"
                 style="cursor: pointer;">
                <div class="d-flex">
                    <div class="avatar-xs me-3">
                        <span class="avatar-title rounded-circle fs-16" 
                              style="background-color: ${config.color}20; color: ${config.color};">
                            <i class="${config.icon}"></i>
                        </span>
                    </div>
                    <div class="flex-1">
                        <a href="${link}" class="stretched-link notification-link" data-notification-id="${notification.id}">
                            <h6 class="mt-0 mb-1 lh-base ${notification.is_read ? '' : 'fw-semibold'}">
                                ${escapeHtml(notification.title)}
                                ${!notification.is_read ? '<span class="badge bg-primary ms-1">Yeni</span>' : ''}
                            </h6>
                        </a>
                        <p class="mb-0 fs-13 text-muted">${escapeHtml(notification.message)}</p>
                        <p class="mb-0 fs-11 fw-medium text-uppercase text-muted mt-1">
                            <span><i class="mdi mdi-clock-outline"></i> ${timeAgo}</span>
                        </p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Click event listeners
    container.querySelectorAll('.notification-link').forEach(link => {
        link.addEventListener('click', async (e) => {
            const notificationId = parseInt(link.dataset.notificationId);
            const notificationItem = link.closest('.notification-item');
            
            // Okunmamış bildirimleri işaretle
            if (notificationItem && notificationItem.classList.contains('bg-light')) {
                await markNotificationAsRead(notificationId);
            }
        });
    });

    // "Tümünü Gör" linki ekle
    if (notifications.length >= 10) {
        container.innerHTML += `
            <div class="dropdown-item text-center py-2 border-top">
                <a href="/notifications" class="text-primary fw-semibold">
                    <i class="ri-arrow-right-line me-1"></i>
                    Tüm Bildirimleri Gör
                </a>
            </div>
        `;
    }
}

/**
 * Bildirim badge'ini güncelle
 */
function updateNotificationBadge() {
    const badge = document.querySelector('#page-header-notifications-dropdown .topbar-badge');
    const badgeText = document.querySelector('#page-header-notifications-dropdown .topbar-badge span');
    
    if (badge) {
        if (unreadCount > 0) {
            if (badgeText) {
                badgeText.textContent = unreadCount;
            } else {
                badge.innerHTML = `${unreadCount}<span class="visually-hidden">unread messages</span>`;
            }
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }
    }

    // Dropdown header'daki badge'i de güncelle
    const headerBadge = document.getElementById('headerNotificationBadge');
    if (headerBadge) {
        if (unreadCount > 0) {
            headerBadge.textContent = `${unreadCount} Yeni`;
            headerBadge.style.display = 'inline-block';
        } else {
            headerBadge.style.display = 'none';
        }
    }
}

/**
 * Bildirimi okundu olarak işaretle
 */
async function markNotificationAsRead(notificationId) {
    try {
        await fetch(`/api/notification-management/mark-read/${notificationId}`, {
            method: 'POST',
            credentials: 'include'
        });

        // Bildirimleri yeniden yükle
        loadHeaderNotifications();

    } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
    }
}

/**
 * Okunmamış bildirim sayısını güncelle
 */
async function updateUnreadCount() {
    try {
        const response = await fetch('/api/notification-management/unread-count', {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            unreadCount = result.data.unreadCount || 0;
            updateNotificationBadge();
        }

    } catch (error) {
        console.error('Okunmamış bildirim sayısı güncelleme hatası:', error);
    }
}

/**
 * Socket.io ile real-time bildirim dinle
 */
function initNotificationSocket() {
    // Socket.io script'i yüklü mü kontrol et
    if (typeof io === 'undefined') {
        console.warn('Socket.io yüklü değil, real-time bildirimler devre dışı');
        return;
    }

    try {
        // Cookie'den token al
        function getCookie(name) {
            const value = `; ${document.cookie}`;
            const parts = value.split(`; ${name}=`);
            if (parts.length === 2) return parts.pop().split(';').shift();
            return null;
        }

        const token = getCookie('auth_token');

        notificationSocket = io({
            auth: {
                token: token
            },
            withCredentials: true
        });

        // Bağlantı kurulduğunda
        notificationSocket.on('connect', () => {
            console.log('Socket.io bağlantısı kuruldu');
            // Kullanıcı otomatik olarak room'una katıldı (server-side)
        });

        // Yeni bildirim geldiğinde
        notificationSocket.on('notification', (notification) => {
            // Bildirimleri yeniden yükle
            loadHeaderNotifications();
            updateUnreadCount();
            
            // Toast bildirimi göster
            if (window.showInfo) {
                window.showInfo(notification.message, notification.title);
            }
        });

        notificationSocket.on('disconnect', () => {
            console.log('Socket.io bağlantısı kesildi');
        });

        notificationSocket.on('connect_error', (error) => {
            console.error('Socket.io bağlantı hatası:', error);
        });

    } catch (error) {
        console.error('Socket.io bağlantı hatası:', error);
    }
}

/**
 * Zaman farkını hesapla
 */
function getTimeAgo(date) {
    const now = new Date();
    const diff = now - date;
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
        return `${days} gün önce`;
    } else if (hours > 0) {
        return `${hours} saat önce`;
    } else if (minutes > 0) {
        return `${minutes} dakika önce`;
    } else {
        return 'Az önce';
    }
}

/**
 * HTML escape
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Sayfa yüklendiğinde başlat
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        loadHeaderNotifications();
        initNotificationSocket();
        
        // Her 30 saniyede bir güncelle
        setInterval(() => {
            updateUnreadCount();
        }, 30000);
    });
} else {
    loadHeaderNotifications();
    initNotificationSocket();
    
    // Her 30 saniyede bir güncelle
    setInterval(() => {
        updateUnreadCount();
    }, 30000);
}

// Export functions
window.loadHeaderNotifications = loadHeaderNotifications;
window.updateUnreadCount = updateUnreadCount;

