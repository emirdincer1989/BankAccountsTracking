/**
 * Modal Yönetim Utility
 *
 * Tüm sayfalarda kullanılabilecek standart modal fonksiyonları
 * Promise-based yaklaşım ile async/await desteği
 */

class ModalManager {
    constructor() {
        this.activeModals = new Map();
        this.modalCounter = 0;
    }

    /**
     * Onay modalı göster (Evet/Hayır)
     * @param {Object} options - Modal ayarları
     * @param {string} options.title - Modal başlığı
     * @param {string} options.message - Modal mesajı
     * @param {string} options.confirmText - Onay butonu metni (varsayılan: "Evet, Onayla")
     * @param {string} options.cancelText - İptal butonu metni (varsayılan: "İptal")
     * @param {string} options.icon - İkon sınıfı (varsayılan: "ri-error-warning-line")
     * @param {string} options.iconColor - İkon rengi (success, danger, warning, info)
     * @param {string} options.confirmBtnClass - Onay butonu sınıfı (varsayılan: "btn-primary")
     * @returns {Promise<boolean>} - Kullanıcı onaylarsa true, iptal ederse false
     */
    confirm(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Onay Gerekli',
                message = 'Bu işlemi yapmak istediğinizden emin misiniz?',
                confirmText = 'Evet, Onayla',
                cancelText = 'İptal',
                icon = 'ri-error-warning-line',
                iconColor = 'warning',
                confirmBtnClass = 'btn-primary'
            } = options;

            const modalId = `confirmModal_${++this.modalCounter}`;
            const confirmBtnId = `confirmBtn_${this.modalCounter}`;

            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header border-0 pb-0">
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body text-center py-4">
                                <div class="mb-4">
                                    <div class="avatar-lg mx-auto mb-4">
                                        <div class="avatar-title bg-${iconColor}-subtle text-${iconColor} rounded-circle fs-20">
                                            <i class="${icon}"></i>
                                        </div>
                                    </div>
                                    <h5 class="mb-2">${title}</h5>
                                    <p class="text-muted mb-4">${message}</p>
                                </div>
                                <div class="d-flex gap-2 justify-content-center">
                                    <button type="button" class="btn btn-light" data-bs-dismiss="modal">
                                        <i class="ri-close-line me-1"></i> ${cancelText}
                                    </button>
                                    <button type="button" class="btn ${confirmBtnClass}" id="${confirmBtnId}">
                                        <i class="ri-check-line me-1"></i> ${confirmText}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Modal'ı DOM'a ekle
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Modal instance oluştur
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);

            // Modal'ı map'e ekle
            this.activeModals.set(modalId, modal);

            // Confirmation flag
            let isConfirmed = false;

            // Onay butonuna event listener
            document.getElementById(confirmBtnId).addEventListener('click', () => {
                isConfirmed = true;
                modal.hide();
            });

            // Modal kapandığında temizlik yap ve sonucu döndür
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.activeModals.delete(modalId);
                modalElement.remove();
                resolve(isConfirmed);
            });

            // Modal'ı göster
            modal.show();
        });
    }

    /**
     * Silme onay modalı (confirm'in özelleştirilmiş hali)
     * @param {Object} options - Modal ayarları
     * @param {string} options.message - Silinecek öğe mesajı
     * @param {string} options.title - Modal başlığı (varsayılan: "Silme Onayı")
     * @returns {Promise<boolean>}
     */
    confirmDelete(options = {}) {
        const {
            message = 'Bu öğeyi silmek istediğinizden emin misiniz?',
            title = 'Silme Onayı'
        } = options;

        return this.confirm({
            title,
            message,
            confirmText: 'Evet, Sil',
            cancelText: 'İptal',
            icon: 'ri-delete-bin-6-line',
            iconColor: 'danger',
            confirmBtnClass: 'btn-danger'
        });
    }

    /**
     * Bilgilendirme modalı
     * @param {Object} options - Modal ayarları
     * @param {string} options.title - Modal başlığı
     * @param {string} options.message - Modal mesajı
     * @param {string} options.buttonText - Buton metni (varsayılan: "Tamam")
     * @param {string} options.icon - İkon sınıfı
     * @param {string} options.iconColor - İkon rengi (success, danger, warning, info)
     * @returns {Promise<void>}
     */
    alert(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Bilgi',
                message = '',
                buttonText = 'Tamam',
                icon = 'ri-information-line',
                iconColor = 'info'
            } = options;

            const modalId = `alertModal_${++this.modalCounter}`;
            const okBtnId = `okBtn_${this.modalCounter}`;

            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header border-0 pb-0">
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body text-center py-4">
                                <div class="mb-4">
                                    <div class="avatar-lg mx-auto mb-4">
                                        <div class="avatar-title bg-${iconColor}-subtle text-${iconColor} rounded-circle fs-20">
                                            <i class="${icon}"></i>
                                        </div>
                                    </div>
                                    <h5 class="mb-2">${title}</h5>
                                    <p class="text-muted mb-4">${message}</p>
                                </div>
                                <button type="button" class="btn btn-primary" id="${okBtnId}">
                                    ${buttonText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Modal'ı DOM'a ekle
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Modal instance oluştur
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);

            // Modal'ı map'e ekle
            this.activeModals.set(modalId, modal);

            // Tamam butonuna event listener
            document.getElementById(okBtnId).addEventListener('click', () => {
                modal.hide();
                resolve();
            });

            // Modal kapandığında temizlik yap
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.activeModals.delete(modalId);
                modalElement.remove();
                resolve();
            });

            // Modal'ı göster
            modal.show();
        });
    }

    /**
     * Kullanıcıdan input alan modal
     * @param {Object} options - Modal ayarları
     * @param {string} options.title - Modal başlığı
     * @param {string} options.message - Modal mesajı
     * @param {string} options.placeholder - Input placeholder
     * @param {string} options.defaultValue - Varsayılan değer
     * @param {string} options.inputType - Input tipi (text, password, email, number)
     * @param {string} options.confirmText - Onay butonu metni
     * @param {string} options.cancelText - İptal butonu metni
     * @param {boolean} options.required - Zorunlu alan mı?
     * @returns {Promise<string|null>} - Kullanıcının girdiği değer veya null (iptal)
     */
    prompt(options = {}) {
        return new Promise((resolve) => {
            const {
                title = 'Bilgi Girin',
                message = '',
                placeholder = '',
                defaultValue = '',
                inputType = 'text',
                confirmText = 'Tamam',
                cancelText = 'İptal',
                required = false
            } = options;

            const modalId = `promptModal_${++this.modalCounter}`;
            const confirmBtnId = `confirmBtn_${this.modalCounter}`;
            const inputId = `promptInput_${this.modalCounter}`;

            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true" data-bs-backdrop="static">
                    <div class="modal-dialog modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                                <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                            </div>
                            <div class="modal-body">
                                ${message ? `<p class="text-muted mb-3">${message}</p>` : ''}
                                <input type="${inputType}" class="form-control" id="${inputId}"
                                       placeholder="${placeholder}" value="${defaultValue}"
                                       ${required ? 'required' : ''}>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-light" data-bs-dismiss="modal">
                                    ${cancelText}
                                </button>
                                <button type="button" class="btn btn-primary" id="${confirmBtnId}">
                                    ${confirmText}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // Modal'ı DOM'a ekle
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Modal instance oluştur
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);
            const inputElement = document.getElementById(inputId);

            // Modal'ı map'e ekle
            this.activeModals.set(modalId, modal);

            // Result holder
            let result = null;

            // Input'a focus ver
            modalElement.addEventListener('shown.bs.modal', () => {
                inputElement.focus();
            });

            // Enter tuşu ile onay
            inputElement.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    document.getElementById(confirmBtnId).click();
                }
            });

            // Onay butonuna event listener
            document.getElementById(confirmBtnId).addEventListener('click', () => {
                const value = inputElement.value.trim();
                if (required && !value) {
                    inputElement.classList.add('is-invalid');
                    return;
                }
                result = value;
                modal.hide();
            });

            // Modal kapandığında temizlik yap ve sonucu döndür
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.activeModals.delete(modalId);
                modalElement.remove();
                resolve(result);
            });

            // Modal'ı göster
            modal.show();
        });
    }

    /**
     * Özel içerikli modal
     * @param {Object} options - Modal ayarları
     * @param {string} options.title - Modal başlığı
     * @param {string} options.content - Modal içeriği (HTML)
     * @param {string} options.size - Modal boyutu (sm, lg, xl)
     * @param {boolean} options.centered - Ortala
     * @param {boolean} options.scrollable - İçeriği scrollable yap
     * @param {Array} options.buttons - Buton listesi [{text, class, onClick}]
     * @returns {Promise<void>}
     */
    custom(options = {}) {
        return new Promise((resolve) => {
            const {
                title = '',
                content = '',
                size = '',
                centered = true,
                scrollable = false,
                buttons = []
            } = options;

            const modalId = `customModal_${++this.modalCounter}`;
            const sizeClass = size ? `modal-${size}` : '';
            const centeredClass = centered ? 'modal-dialog-centered' : '';
            const scrollableClass = scrollable ? 'modal-dialog-scrollable' : '';

            const buttonsHtml = buttons.length > 0
                ? buttons.map((btn, index) => {
                    const btnId = `customBtn_${this.modalCounter}_${index}`;
                    return `<button type="button" class="btn ${btn.class || 'btn-secondary'}" id="${btnId}">${btn.text || 'Button'}</button>`;
                }).join('')
                : '<button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Kapat</button>';

            const modalHtml = `
                <div class="modal fade" id="${modalId}" tabindex="-1" aria-labelledby="${modalId}Label" aria-hidden="true">
                    <div class="modal-dialog ${sizeClass} ${centeredClass} ${scrollableClass}">
                        <div class="modal-content">
                            ${title ? `
                                <div class="modal-header">
                                    <h5 class="modal-title" id="${modalId}Label">${title}</h5>
                                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                                </div>
                            ` : ''}
                            <div class="modal-body">
                                ${content}
                            </div>
                            ${buttons.length > 0 || !title ? `
                                <div class="modal-footer">
                                    ${buttonsHtml}
                                </div>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;

            // Modal'ı DOM'a ekle
            document.body.insertAdjacentHTML('beforeend', modalHtml);

            // Modal instance oluştur
            const modalElement = document.getElementById(modalId);
            const modal = new bootstrap.Modal(modalElement);

            // Modal'ı map'e ekle
            this.activeModals.set(modalId, modal);

            // Butonlara event listener ekle
            buttons.forEach((btn, index) => {
                const btnId = `customBtn_${this.modalCounter}_${index}`;
                const btnElement = document.getElementById(btnId);
                if (btnElement && btn.onClick) {
                    btnElement.addEventListener('click', () => {
                        btn.onClick(modal, modalElement);
                    });
                }
            });

            // Modal kapandığında temizlik yap
            modalElement.addEventListener('hidden.bs.modal', () => {
                this.activeModals.delete(modalId);
                modalElement.remove();
                resolve();
            });

            // Modal'ı göster
            modal.show();
        });
    }

    /**
     * Tüm açık modalları kapat
     */
    closeAll() {
        this.activeModals.forEach((modal, modalId) => {
            modal.hide();
        });
    }

    /**
     * Belirli bir modalı kapat
     * @param {string} modalId - Modal ID
     */
    close(modalId) {
        const modal = this.activeModals.get(modalId);
        if (modal) {
            modal.hide();
        }
    }
}

// Global instance oluştur
window.Modal = new ModalManager();

// Kısa yollar (opsiyonel)
window.showConfirm = (options) => window.Modal.confirm(options);
window.showConfirmDelete = (options) => window.Modal.confirmDelete(options);
window.showAlert = (options) => window.Modal.alert(options);
window.showPrompt = (options) => window.Modal.prompt(options);
window.showCustomModal = (options) => window.Modal.custom(options);
