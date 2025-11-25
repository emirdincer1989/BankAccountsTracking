/**
 * Bildirimler Sayfası
 * Kullanıcının bildirimlerini görüntüleme ve yönetme sayfası.
 */

export async function loadContent() {
    const html = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h4 class="card-title mb-0">
                                    <i class="ri-notification-line me-2"></i>
                                    Bildirimlerim
                                </h4>
                                <p class="text-muted mb-0">Tüm bildirimlerinizi buradan görüntüleyebilirsiniz</p>
                            </div>
                            <div>
                                <button type="button" class="btn btn-outline-primary" id="markAllReadBtn">
                                    <i class="ri-check-double-line me-1"></i>
                                    Tümünü Okundu İşaretle
                                </button>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <!-- Filtreler -->
                        <div class="mb-3">
                            <div class="btn-group" role="group">
                                <input type="radio" class="btn-check" name="filterType" id="filterAll" value="all" checked>
                                <label class="btn btn-outline-primary" for="filterAll">
                                    Tümü (<span id="countAll">0</span>)
                                </label>

                                <input type="radio" class="btn-check" name="filterType" id="filterUnread" value="unread">
                                <label class="btn btn-outline-primary" for="filterUnread">
                                    Okunmamış (<span id="countUnread">0</span>)
                                </label>

                                <input type="radio" class="btn-check" name="filterType" id="filterRead" value="read">
                                <label class="btn btn-outline-primary" for="filterRead">
                                    Okunmuş (<span id="countRead">0</span>)
                                </label>
                            </div>
                        </div>

                        <!-- Bildirimler Listesi -->
                        <div id="notificationsList">
                            <div class="text-center py-5">
                                <div class="spinner-border text-primary" role="status">
                                    <span class="visually-hidden">Yükleniyor...</span>
                                </div>
                            </div>
                        </div>

                        <!-- Pagination -->
                        <div id="paginationContainer" class="mt-3 d-none">
                            <nav>
                                <ul class="pagination justify-content-center" id="pagination">
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Bildirimlerim'
    };
}

export function init() {
    setupEventListeners();
    loadNotifications();
    updateUnreadCount();
}

let currentPage = 1;
let currentFilter = 'all';
const pageSize = 20;

function setupEventListeners() {
    // Filter change
    document.querySelectorAll('input[name="filterType"]').forEach(radio => {
        if (!radio.dataset.listenerAdded) {
            radio.dataset.listenerAdded = 'true';
            radio.addEventListener('change', (e) => {
                currentFilter = e.target.value;
                currentPage = 1;
                loadNotifications();
            });
        }
    });

    // Mark all as read
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn && !markAllReadBtn.dataset.listenerAdded) {
        markAllReadBtn.dataset.listenerAdded = 'true';
        markAllReadBtn.addEventListener('click', async () => {
            await markAllAsRead();
        });
    }
}

async function loadNotifications() {
    const listContainer = document.getElementById('notificationsList');
    const isRead = currentFilter === 'all' ? null : currentFilter === 'read';

    listContainer.innerHTML = `
        <div class="text-center py-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Yükleniyor...</span>
            </div>
        </div>
    `;

    try {
        const offset = (currentPage - 1) * pageSize;
        const response = await fetch(
            `/api/notification-management/my-notifications?limit=${pageSize}&offset=${offset}&is_read=${isRead === null ? '' : isRead}`,
            {
                credentials: 'include'
            }
        );

        const result = await response.json();

        if (result.success) {
            displayNotifications(result.data.notifications, result.data.pagination);
            updateCounts(result.data);
        } else {
            listContainer.innerHTML = `
                <div class="alert alert-danger">
                    <i class="ri-error-warning-line me-2"></i>
                    Bildirimler yüklenirken hata oluştu: ${result.message}
                </div>
            `;
        }

    } catch (error) {
        listContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="ri-error-warning-line me-2"></i>
                Bildirimler yüklenirken hata oluştu: ${error.message}
            </div>
        `;
    }
}

function displayNotifications(notifications, pagination) {
    const listContainer = document.getElementById('notificationsList');

    if (notifications.length === 0) {
        listContainer.innerHTML = `
            <div class="text-center py-5">
                <i class="ri-inbox-line fs-48 text-muted mb-3"></i>
                <p class="text-muted">Henüz bildirim bulunmamaktadır</p>
            </div>
        `;
        document.getElementById('paginationContainer').classList.add('d-none');
        return;
    }

    const typeConfig = {
        info: { class: 'info', icon: 'ri-information-line', color: '#299cdb' },
        success: { class: 'success', icon: 'ri-checkbox-circle-line', color: '#0ab39c' },
        warning: { class: 'warning', icon: 'ri-alert-line', color: '#f7b84b' },
        error: { class: 'danger', icon: 'ri-error-warning-line', color: '#f06548' }
    };

    listContainer.innerHTML = notifications.map(notification => {
        const config = typeConfig[notification.type] || typeConfig.info;
        const createdDate = new Date(notification.created_at);
        const timeAgo = getTimeAgo(createdDate);

        return `
            <div class="notification-item border-bottom p-3 ${notification.is_read ? '' : 'bg-light'}" 
                 data-notification-id="${notification.id}"
                 style="cursor: pointer; transition: background-color 0.2s;"
                 onmouseover="this.style.backgroundColor='var(--vz-gray-100)'"
                 onmouseout="this.style.backgroundColor='${notification.is_read ? '' : 'var(--vz-gray-50)'}'">
                <div class="d-flex align-items-start">
                    <div class="flex-shrink-0 me-3">
                        <div class="avatar-xs">
                            <span class="avatar-title rounded-circle fs-16" 
                                  style="background-color: ${config.color}20; color: ${config.color};">
                                <i class="${config.icon}"></i>
                            </span>
                        </div>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0 ${notification.is_read ? '' : 'fw-semibold'}">
                                ${escapeHtml(notification.title)}
                                ${!notification.is_read ? '<span class="badge bg-primary ms-2">Yeni</span>' : ''}
                            </h6>
                            <small class="text-muted">${timeAgo}</small>
                        </div>
                        <p class="mb-2 text-muted">${escapeHtml(notification.message)}</p>
                        ${notification.link ? `
                            <a href="${notification.link}" class="btn btn-sm btn-outline-primary">
                                <i class="ri-arrow-right-line me-1"></i>
                                Detayı Gör
                            </a>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;
    }).join('');

    // Click event listeners
    document.querySelectorAll('.notification-item').forEach(item => {
        item.addEventListener('click', async () => {
            const notificationId = parseInt(item.dataset.notificationId);
            await markAsRead(notificationId);
            
            // Eğer link varsa yönlendir
            const link = item.querySelector('a');
            if (link) {
                window.location.href = link.href;
            }
        });
    });

    // Pagination
    if (pagination.total > pageSize) {
        displayPagination(pagination);
    } else {
        document.getElementById('paginationContainer').classList.add('d-none');
    }
}

function displayPagination(pagination) {
    const paginationContainer = document.getElementById('paginationContainer');
    const paginationUl = document.getElementById('pagination');
    
    paginationContainer.classList.remove('d-none');

    const totalPages = Math.ceil(pagination.total / pageSize);
    let paginationHtml = '';

    // Previous button
    paginationHtml += `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}">Önceki</a>
        </li>
    `;

    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHtml += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHtml += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }

    // Next button
    paginationHtml += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Sonraki</a>
        </li>
    `;

    paginationUl.innerHTML = paginationHtml;

    // Pagination click handlers
    paginationUl.querySelectorAll('a[data-page]').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            if (page >= 1 && page <= totalPages && page !== currentPage) {
                currentPage = page;
                loadNotifications();
            }
        });
    });
}

function updateCounts(data) {
    const unreadCount = data.unreadCount || 0;
    const totalCount = data.pagination.total;
    const readCount = totalCount - unreadCount;

    document.getElementById('countAll').textContent = totalCount;
    document.getElementById('countUnread').textContent = unreadCount;
    document.getElementById('countRead').textContent = readCount;
}

async function markAsRead(notificationId) {
    try {
        const response = await fetch(`/api/notification-management/mark-read/${notificationId}`, {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Bildirimi yeniden yükle
            loadNotifications();
            updateUnreadCount();
        }

    } catch (error) {
        console.error('Bildirim okundu işaretleme hatası:', error);
    }
}

async function markAllAsRead() {
    const confirmed = await showConfirmDelete({
        title: 'Tümünü Okundu İşaretle',
        message: 'Tüm bildirimler okundu olarak işaretlenecek. Devam etmek istiyor musunuz?'
    });

    if (!confirmed) {
        return;
    }

    const loadingId = showLoading('İşleniyor...');

    try {
        const response = await fetch('/api/notification-management/mark-all-read', {
            method: 'POST',
            credentials: 'include'
        });

        const result = await response.json();

        Notification.remove(loadingId);

        if (result.success) {
            showSuccess(`${result.data.count} bildirim okundu olarak işaretlendi`);
            loadNotifications();
            updateUnreadCount();
        } else {
            showError(result.message || 'İşlem başarısız');
        }

    } catch (error) {
        Notification.remove(loadingId);
        showError('İşlem sırasında hata oluştu: ' + error.message);
    }
}

async function updateUnreadCount() {
    try {
        const response = await fetch('/api/notification-management/unread-count', {
            credentials: 'include'
        });

        const result = await response.json();

        if (result.success) {
            // Header'daki badge'i güncelle
            const badge = document.querySelector('#page-header-notifications-dropdown .topbar-badge');
            if (badge) {
                const count = result.data.unreadCount;
                if (count > 0) {
                    badge.textContent = count;
                    badge.style.display = 'inline-block';
                } else {
                    badge.style.display = 'none';
                }
            }
        }

    } catch (error) {
        console.error('Okunmamış bildirim sayısı güncelleme hatası:', error);
    }
}

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

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

