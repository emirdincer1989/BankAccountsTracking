/**
 * Bildirim (Notification/Toast) Yönetim Utility
 *
 * Tüm sayfalarda kullanılabilecek standart bildirim fonksiyonları
 * Toast-style, position-aware, stackable notifications
 */

class NotificationManager {
    constructor() {
        this.notifications = [];
        this.container = null;
        this.notificationCounter = 0;
        this.defaultDuration = 5000; // 5 saniye
        this.maxNotifications = 5; // Aynı anda max 5 bildirim
        this.init();
    }

    /**
     * Bildirim container'ı oluştur
     */
    init() {
        // Container zaten varsa çık
        if (this.container) return;

        // Container oluştur
        this.container = document.createElement('div');
        this.container.id = 'notificationContainer';
        this.container.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
            max-width: 400px;
        `;
        document.body.appendChild(this.container);
    }

    /**
     * Bildirim göster
     * @param {Object} options - Bildirim ayarları
     * @param {string} options.type - Bildirim tipi (success, error, warning, info)
     * @param {string} options.title - Bildirim başlığı
     * @param {string} options.message - Bildirim mesajı
     * @param {number} options.duration - Süre (ms, 0 = otomatik kapanmaz)
     * @param {boolean} options.closable - Kapatma butonu göster
     * @param {string} options.icon - Özel ikon sınıfı
     * @param {string} options.position - Pozisyon (top-right, top-left, bottom-right, bottom-left)
     * @returns {string} - Bildirim ID
     */
    show(options = {}) {
        const {
            type = 'info',
            title = '',
            message = '',
            duration = this.defaultDuration,
            closable = true,
            icon = null,
            position = 'bottom-right'
        } = options;

        // Container pozisyonunu ayarla
        this.updateContainerPosition(position);

        // Max bildirim limitini kontrol et
        if (this.notifications.length >= this.maxNotifications) {
            // En eski bildirimi kaldır
            const oldestId = this.notifications[0];
            this.remove(oldestId);
        }

        // Bildirim ID'si oluştur
        const notificationId = `notification_${++this.notificationCounter}`;

        // Tip bazlı ayarlar
        const typeConfig = this.getTypeConfig(type);
        const iconClass = icon || typeConfig.icon;

        // Bildirim HTML'i oluştur
        const notificationHtml = `
            <div class="alert alert-${typeConfig.alertClass} alert-dismissible fade show"
                 id="${notificationId}"
                 role="alert"
                 style="
                     min-width: 300px;
                     max-width: 400px;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                     border-radius: 8px;
                     border-left: 4px solid ${typeConfig.borderColor};
                     animation: slideInRight 0.3s ease-out;
                 ">
                <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                        <i class="${iconClass} fs-20 me-2" style="color: ${typeConfig.iconColor};"></i>
                    </div>
                    <div class="flex-grow-1">
                        ${title ? `<strong class="d-block mb-1">${title}</strong>` : ''}
                        ${message ? `<div class="small">${message}</div>` : ''}
                    </div>
                    ${closable ? `
                        <button type="button" class="btn-close ms-2" data-bs-dismiss="alert" aria-label="Close"></button>
                    ` : ''}
                </div>
            </div>
        `;

        // Bildirim ekle
        this.container.insertAdjacentHTML('beforeend', notificationHtml);
        const notificationElement = document.getElementById(notificationId);

        // Liste'ye ekle
        this.notifications.push(notificationId);

        // Kapanma event listener'ı
        notificationElement.addEventListener('closed.bs.alert', () => {
            this.notifications = this.notifications.filter(id => id !== notificationId);
            notificationElement.remove();
        });

        // Otomatik kapanma
        if (duration > 0) {
            setTimeout(() => {
                if (notificationElement) {
                    const alert = bootstrap.Alert.getOrCreateInstance(notificationElement);
                    alert.close();
                }
            }, duration);
        }

        return notificationId;
    }

    /**
     * Başarı bildirimi
     * @param {string|Object} messageOrOptions - Mesaj veya ayarlar objesi
     * @param {string} title - Başlık (messageOrOptions string ise)
     * @returns {string} - Bildirim ID
     */
    success(messageOrOptions, title = 'Başarılı!') {
        if (typeof messageOrOptions === 'string') {
            return this.show({
                type: 'success',
                title,
                message: messageOrOptions
            });
        }
        return this.show({ ...messageOrOptions, type: 'success' });
    }

    /**
     * Hata bildirimi
     * @param {string|Object} messageOrOptions - Mesaj veya ayarlar objesi
     * @param {string} title - Başlık (messageOrOptions string ise)
     * @returns {string} - Bildirim ID
     */
    error(messageOrOptions, title = 'Hata!') {
        if (typeof messageOrOptions === 'string') {
            return this.show({
                type: 'error',
                title,
                message: messageOrOptions
            });
        }
        return this.show({ ...messageOrOptions, type: 'error' });
    }

    /**
     * Uyarı bildirimi
     * @param {string|Object} messageOrOptions - Mesaj veya ayarlar objesi
     * @param {string} title - Başlık (messageOrOptions string ise)
     * @returns {string} - Bildirim ID
     */
    warning(messageOrOptions, title = 'Uyarı!') {
        if (typeof messageOrOptions === 'string') {
            return this.show({
                type: 'warning',
                title,
                message: messageOrOptions
            });
        }
        return this.show({ ...messageOrOptions, type: 'warning' });
    }

    /**
     * Bilgi bildirimi
     * @param {string|Object} messageOrOptions - Mesaj veya ayarlar objesi
     * @param {string} title - Başlık (messageOrOptions string ise)
     * @returns {string} - Bildirim ID
     */
    info(messageOrOptions, title = 'Bilgi') {
        if (typeof messageOrOptions === 'string') {
            return this.show({
                type: 'info',
                title,
                message: messageOrOptions
            });
        }
        return this.show({ ...messageOrOptions, type: 'info' });
    }

    /**
     * Belirli bir bildirimi kaldır
     * @param {string} notificationId - Bildirim ID
     */
    remove(notificationId) {
        const notification = document.getElementById(notificationId);
        if (notification) {
            const alert = bootstrap.Alert.getOrCreateInstance(notification);
            alert.close();
        }
    }

    /**
     * Tüm bildirimleri kaldır
     */
    removeAll() {
        this.notifications.forEach(id => {
            this.remove(id);
        });
        this.notifications = [];
    }

    /**
     * Tip bazlı ayarlar
     * @param {string} type - Bildirim tipi
     * @returns {Object} - Tip ayarları
     */
    getTypeConfig(type) {
        const configs = {
            success: {
                alertClass: 'success',
                icon: 'ri-checkbox-circle-line',
                iconColor: '#0ab39c',
                borderColor: '#0ab39c'
            },
            error: {
                alertClass: 'danger',
                icon: 'ri-error-warning-line',
                iconColor: '#f06548',
                borderColor: '#f06548'
            },
            warning: {
                alertClass: 'warning',
                icon: 'ri-alert-line',
                iconColor: '#f7b84b',
                borderColor: '#f7b84b'
            },
            info: {
                alertClass: 'info',
                icon: 'ri-information-line',
                iconColor: '#299cdb',
                borderColor: '#299cdb'
            }
        };

        return configs[type] || configs.info;
    }

    /**
     * Container pozisyonunu güncelle
     * @param {string} position - Pozisyon (top-right, top-left, bottom-right, bottom-left)
     */
    updateContainerPosition(position) {
        // Pozisyon stilleri temizle
        this.container.style.top = '';
        this.container.style.bottom = '';
        this.container.style.left = '';
        this.container.style.right = '';

        // Yeni pozisyon ayarla
        switch (position) {
            case 'top-right':
                this.container.style.top = '20px';
                this.container.style.right = '20px';
                break;
            case 'top-left':
                this.container.style.top = '20px';
                this.container.style.left = '20px';
                break;
            case 'bottom-left':
                this.container.style.bottom = '20px';
                this.container.style.left = '20px';
                break;
            case 'bottom-right':
            default:
                this.container.style.bottom = '20px';
                this.container.style.right = '20px';
                break;
        }
    }

    /**
     * Loading bildirimi (otomatik kapanmaz)
     * @param {string} message - Mesaj
     * @param {string} title - Başlık
     * @returns {string} - Bildirim ID
     */
    loading(message = 'İşlem yapılıyor...', title = '') {
        return this.show({
            type: 'info',
            title,
            message: `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">Loading...</span>
                    </div>
                    <span>${message}</span>
                </div>
            `,
            duration: 0,
            closable: false
        });
    }

    /**
     * Progress bildirimi
     * @param {string} message - Mesaj
     * @param {number} progress - İlerleme (0-100)
     * @returns {string} - Bildirim ID
     */
    progress(message = 'İşlem yapılıyor...', progress = 0) {
        const notificationId = `notification_${++this.notificationCounter}`;

        const notificationHtml = `
            <div class="alert alert-info fade show"
                 id="${notificationId}"
                 role="alert"
                 style="
                     min-width: 300px;
                     max-width: 400px;
                     box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                     border-radius: 8px;
                     animation: slideInRight 0.3s ease-out;
                 ">
                <div class="d-flex flex-column">
                    <div class="d-flex justify-content-between mb-2">
                        <span>${message}</span>
                        <span class="fw-bold">${progress}%</span>
                    </div>
                    <div class="progress" style="height: 4px;">
                        <div class="progress-bar" role="progressbar"
                             style="width: ${progress}%;"
                             aria-valuenow="${progress}"
                             aria-valuemin="0"
                             aria-valuemax="100"></div>
                    </div>
                </div>
            </div>
        `;

        this.container.insertAdjacentHTML('beforeend', notificationHtml);
        this.notifications.push(notificationId);

        return notificationId;
    }

    /**
     * Progress bildirimi güncelle
     * @param {string} notificationId - Bildirim ID
     * @param {number} progress - İlerleme (0-100)
     * @param {string} message - Mesaj (opsiyonel)
     */
    updateProgress(notificationId, progress, message = null) {
        const notification = document.getElementById(notificationId);
        if (!notification) return;

        const progressBar = notification.querySelector('.progress-bar');
        const progressText = notification.querySelector('.fw-bold');

        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }

        if (progressText) {
            progressText.textContent = `${progress}%`;
        }

        if (message) {
            const messageElement = notification.querySelector('.d-flex span:first-child');
            if (messageElement) {
                messageElement.textContent = message;
            }
        }

        // %100'de otomatik kapat
        if (progress >= 100) {
            setTimeout(() => {
                this.remove(notificationId);
            }, 1500);
        }
    }
}

// Slide-in animation ekle
if (!document.getElementById('notificationAnimations')) {
    const style = document.createElement('style');
    style.id = 'notificationAnimations';
    style.textContent = `
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
    `;
    document.head.appendChild(style);
}

// Global instance oluştur
window.Notification = new NotificationManager();

// Kısa yollar (opsiyonel)
window.showSuccess = (message, title) => window.Notification.success(message, title);
window.showError = (message, title) => window.Notification.error(message, title);
window.showWarning = (message, title) => window.Notification.warning(message, title);
window.showInfo = (message, title) => window.Notification.info(message, title);
window.showLoading = (message, title) => window.Notification.loading(message, title);
