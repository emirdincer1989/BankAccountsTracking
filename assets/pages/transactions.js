/**
 * Hesap Hareketleri Sayfası
 */

let transactions = [];
let accounts = [];
let currentFilters = {
    limit: 25,
    offset: 0
};
let paginationData = null;
let autoRefreshInterval = null;
let isAutoRefreshActive = false;

export async function loadContent() {
    const html = `
        <div class="row">
            <div class="col-lg-12">
                <div class="card" id="contactList">
                    <div class="card-header">
                        <div class="row align-items-center g-3">
                            <div class="col-md-3">
                                <h5 class="card-title mb-0">Hesap Hareketleri</h5>
                            </div>
                            <div class="col-md-auto ms-auto">
                                <div class="d-flex gap-2">
                                    <div class="search-box">
                                        <input type="text" class="form-control search" id="searchTransaction" placeholder="Açıklama ara...">
                                        <i class="ri-search-line search-icon"></i>
                                    </div>
                                    <div class="d-flex gap-2">
                                        <select class="form-select w-auto" id="filterAccount">
                                            <option value="">Tüm Hesaplar</option>
                                        </select>
                                        <select class="form-select w-auto" id="filterType">
                                            <option value="">Tüm İşlemler</option>
                                            <option value="income">Gelir</option>
                                            <option value="expense">Gider</option>
                                        </select>
                                        <input type="date" class="form-control w-auto" id="filterStartDate">
                                        <input type="date" class="form-control w-auto" id="filterEndDate">
                                        <button type="button" class="btn btn-primary" onclick="applyFilters()">
                                            <i class="ri-filter-2-line align-bottom me-1"></i> Filtrele
                                        </button>
                                        <button type="button" class="btn btn-soft-secondary" onclick="resetFilters()">
                                            <i class="ri-refresh-line align-bottom"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive table-card">
                            <table class="table align-middle table-nowrap" id="transactionTable">
                                <thead class="table-light text-muted">
                                    <tr>
                                        <th class="sort" data-sort="date" scope="col">Tarih</th>
                                        <th class="sort" data-sort="institution" scope="col">Kurum</th>
                                        <th class="sort" data-sort="bank" scope="col">Banka / Hesap</th>
                                        <th class="sort" data-sort="counterparty" scope="col">Karşı Taraf</th>
                                        <th class="sort" data-sort="description" scope="col">Açıklama</th>
                                        <th class="sort" data-sort="amount" scope="col">Tutar</th>
                                    </tr>
                                </thead>
                                <tbody class="list form-check-all" id="transactionTableBody">
                                    <tr>
                                        <td colspan="7" class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Yükleniyor...</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-3 flex-wrap gap-2">
                            <div class="d-flex align-items-center gap-2">
                                <label class="text-muted mb-0">Sayfa başına:</label>
                                <select class="form-select form-select-sm" id="pageSizeSelect" style="width: auto;" onchange="changePageSize()">
                                    <option value="10">10</option>
                                    <option value="25" selected>25</option>
                                    <option value="50">50</option>
                                </select>
                                <span class="text-muted small" id="paginationInfo"></span>
                            </div>
                            <div class="pagination-wrap hstack gap-2">
                                <button class="btn btn-sm btn-outline-secondary" id="firstPageBtn" onclick="goToFirstPage()" title="İlk Sayfa">
                                    <i class="ri-skip-back-line"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="prevPageBtn" onclick="changePage(-1)" title="Önceki Sayfa">
                                    <i class="ri-arrow-left-s-line"></i>
                                </button>
                                <ul class="pagination listjs-pagination mb-0"></ul>
                                <button class="btn btn-sm btn-outline-secondary" id="nextPageBtn" onclick="changePage(1)" title="Sonraki Sayfa">
                                    <i class="ri-arrow-right-s-line"></i>
                                </button>
                                <button class="btn btn-sm btn-outline-secondary" id="lastPageBtn" onclick="goToLastPage()" title="Son Sayfa">
                                    <i class="ri-skip-forward-line"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Hesap Hareketleri'
    };
}

export function init() {
    window.applyFilters = applyFilters;
    window.resetFilters = resetFilters;
    window.changePage = changePage;
    window.goToPage = goToPage;
    window.goToFirstPage = goToFirstPage;
    window.goToLastPage = goToLastPage;
    window.changePageSize = changePageSize;

    // URL'den parametreleri al (örn: accounts-view'den gelen account_id)
    const urlParams = new URLSearchParams(window.location.search);
    const accountId = urlParams.get('account');

    loadAccounts(accountId);

    if (accountId) {
        currentFilters.account_id = accountId;
    }

    // İlk yükleme
    loadTransactions();

    // Otomatik güncelleme başlat (her 60 saniyede bir)
    setTimeout(() => {
        startAutoRefresh();
    }, 1000);

    // Page Visibility API ile performans optimizasyonu
    document.addEventListener('visibilitychange', handleVisibilityChange);
}

/**
 * Otomatik güncellemeyi başlatır
 */
function startAutoRefresh() {
    // Eğer zaten aktifse, önce temizle
    stopAutoRefresh();

    isAutoRefreshActive = true;
    
    // Her 60 saniyede bir otomatik güncelleme
    const REFRESH_INTERVAL = 60000; // 60 saniye
    
    console.log(`[Transactions Auto Refresh] Otomatik güncelleme başlatıldı. Her ${REFRESH_INTERVAL / 1000} saniyede bir veriler güncellenecek.`);
    
    // Periyodik güncelleme
    autoRefreshInterval = setInterval(() => {
        // Sayfa görünür değilse güncelleme yapma
        if (document.hidden) {
            console.log('[Transactions Auto Refresh] Sayfa görünür değil, güncelleme atlandı.');
            return;
        }

        console.log('[Transactions Auto Refresh] Otomatik güncelleme başlatılıyor...');
        // Sessiz güncelleme (loading göstergesi olmadan, mevcut filtreleri ve sayfayı koruyarak)
        loadTransactions(true);
    }, REFRESH_INTERVAL);
}

/**
 * Otomatik güncellemeyi durdurur
 */
function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
    isAutoRefreshActive = false;
}

/**
 * Sayfa görünürlük değişikliğini yönetir
 */
function handleVisibilityChange() {
    if (document.hidden) {
        // Sayfa gizlendiğinde güncelleme yapma
    } else {
        // Sayfa görünür olduğunda hemen güncelle ve interval'i başlat
        if (!isAutoRefreshActive) {
            startAutoRefresh();
        }
        // Sayfa tekrar görünür olduğunda verileri güncelle
        loadTransactions(true);
    }
}

/**
 * Sayfa değiştiğinde temizlik yapmak için export edilen fonksiyon
 */
export function destroy() {
    stopAutoRefresh();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

async function loadAccounts(selectedId) {
    try {
        // currentUser global değişkeninden alalım
        // Eğer currentUser henüz yüklenmediyse bekleyelim
        if (!window.currentUser) {
            await new Promise(resolve => {
                const checkUser = setInterval(() => {
                    if (window.currentUser) {
                        clearInterval(checkUser);
                        resolve();
                    }
                }, 100);
                setTimeout(() => { clearInterval(checkUser); resolve(); }, 5000);
            });
        }

        const userInstitutionIds = window.currentUser?.institution_ids || [];
        const isSuperAdmin = window.currentUser?.role_name === 'super_admin';

        // Eğer normal kullanıcı ise ve kurum yetkisi yoksa
        if (!isSuperAdmin && userInstitutionIds.length === 0) {
            console.warn('Kullanıcının kurum yetkisi yok.');
            return;
        }

        // Tüm yetkili hesapları çek
        const response = await fetch('/api/accounts');
        const data = await response.json();

        if (data.success) {
            accounts = data.data;
            const select = document.getElementById('filterAccount');

            // Önce temizle (Tüm Hesaplar seçeneği kalsın)
            select.innerHTML = '<option value="">Tüm Hesaplar</option>';

            accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                // Kurum adını da ekleyelim ki karışıklık olmasın
                const institutionPrefix = acc.institution_name ? `[${acc.institution_name}] ` : '';
                option.textContent = `${institutionPrefix}${acc.bank_name} - ${acc.account_name}`;
                if (selectedId && acc.id == selectedId) option.selected = true;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Hesaplar yüklenemedi:', error);
    }
}

/**
 * Hareketleri yükler
 * @param {boolean} silent - Sessiz güncelleme (loading göstermeden)
 */
async function loadTransactions(silent = false) {
    const tbody = document.getElementById('transactionTableBody');
    
    // Loading göstergesi (sessiz güncelleme değilse)
    if (!silent && tbody) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';
    }

    try {
        // Query string oluştur
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(currentFilters)) {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        }

        console.log('[Load Transactions] API çağrısı yapılıyor: /api/transactions?' + params.toString());
        const response = await fetch(`/api/transactions?${params.toString()}`);
        console.log('[Load Transactions] API yanıtı alındı:', response.status, response.statusText);
        const data = await response.json();
        console.log('[Load Transactions] Veri güncellendi:', data.success ? `${data.data?.length || 0} hareket` : data.message);

        if (data.success) {
            transactions = data.data;
            paginationData = data.pagination;
            renderTable();
            updatePagination(data.pagination);
        } else {
            if (!silent && tbody) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${data.message}</td></tr>`;
            }
        }
    } catch (error) {
        console.error('API Hatası:', error);
        if (!silent && tbody) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Bağlantı hatası.</td></tr>';
        }
    }
}

function renderTable() {
    const tbody = document.getElementById('transactionTableBody');

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Kayıt bulunamadı.</td></tr>';
        return;
    }

    // Banka Renk ve İsim Tanımları
    const bankConfig = {
        'vakif': { name: 'Vakıfbank', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.05)', badgeClass: 'bg-warning text-dark' }, // Sarı
        'ziraat': { name: 'Ziraat Bankası', color: '#E30613', bg: 'rgba(227, 6, 19, 0.05)', badgeClass: 'bg-danger text-white' }, // Kırmızı
        'halk': { name: 'Halkbank', color: '#005596', bg: 'rgba(0, 85, 150, 0.05)', badgeClass: 'bg-info text-white' } // Mavi
    };

    tbody.innerHTML = transactions.map(tx => {
        const dateObj = new Date(tx.date);
        const date = dateObj.toLocaleDateString('tr-TR');
        const time = dateObj.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' });

        const amount = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(tx.amount);

        const isPositive = tx.amount > 0;
        const amountClass = isPositive ? 'text-success' : 'text-danger';
        const amountIcon = isPositive ? 'ri-arrow-left-down-fill' : 'ri-arrow-right-up-fill';

        // Kurum adı
        const institutionName = tx.institution_name || '-';

        // Banka Bilgisi
        let bankKey = (tx.bank_name || '').toLowerCase();
        if (bankKey.includes('vakif')) bankKey = 'vakif';
        else if (bankKey.includes('ziraat')) bankKey = 'ziraat';
        else if (bankKey.includes('halk')) bankKey = 'halk';

        const bankInfo = bankConfig[bankKey] || { name: tx.bank_name, color: '#6c757d', bg: '', badgeClass: 'bg-secondary text-white' };
        const rowStyle = bankInfo.bg ? `style="background-color: ${bankInfo.bg}"` : '';

        // Metadata'dan verileri al
        const senderReceiver = tx.metadata?.sender_receiver || tx.sender_receiver || '-';
        const transactionType = tx.metadata?.transaction_type || '';

        return `
        <tr ${rowStyle}>
            <td class="date">
                <div class="fw-medium">${date}</div>
                <div class="text-muted small">${time}</div>
            </td>
            <td class="institution">${institutionName}</td>
            <td class="bank_account">
                <div class="d-flex align-items-center">
                    <div class="flex-grow-1">
                        <span class="badge ${bankInfo.badgeClass} mb-1">${bankInfo.name}</span>
                        <div class="small text-muted">${tx.account_name}</div>
                    </div>
                </div>
            </td>
            <td class="counterparty fw-bold">${senderReceiver}</td>
            <td class="description" style="max-width: 300px;">
                ${transactionType ? `<span class="badge bg-light text-dark border mb-1">${transactionType}</span><br>` : ''}
                <div class="text-truncate" style="max-width: 100%;" title="${tx.description}">
                    ${tx.description}
                </div>
            </td>
            <td class="amount ${amountClass} fw-bold text-end">
                <i class="${amountIcon} me-1"></i> ${amount}
            </td>
        </tr>
    `}).join('');
}

function updatePagination(pagination) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const firstBtn = document.getElementById('firstPageBtn');
    const lastBtn = document.getElementById('lastPageBtn');
    const paginationList = document.querySelector('.pagination.listjs-pagination');
    const paginationInfo = document.getElementById('paginationInfo');
    const pageSizeSelect = document.getElementById('pageSizeSelect');

    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;
    const total = pagination.total;
    const limit = pagination.limit;
    const startRecord = pagination.offset + 1;
    const endRecord = Math.min(pagination.offset + limit, total);

    // Buton durumlarını güncelle
    if (currentPage <= 1) {
        firstBtn.classList.add('disabled');
        prevBtn.classList.add('disabled');
    } else {
        firstBtn.classList.remove('disabled');
        prevBtn.classList.remove('disabled');
    }

    if (currentPage >= totalPages) {
        nextBtn.classList.add('disabled');
        lastBtn.classList.add('disabled');
    } else {
        nextBtn.classList.remove('disabled');
        lastBtn.classList.remove('disabled');
    }

    // Sayfa başına kayıt sayısı seçimini güncelle
    if (pageSizeSelect) {
        pageSizeSelect.value = limit;
    }

    // Pagination bilgisini göster
    if (paginationInfo) {
        if (total > 0) {
            paginationInfo.textContent = `${startRecord}-${endRecord} / ${total} kayıt`;
        } else {
            paginationInfo.textContent = '0 kayıt';
        }
    }

    // Sayfa numaralarını render et
    paginationList.innerHTML = '';

    if (totalPages === 0) {
        return;
    }

    // Akıllı sayfa numarası gösterimi
    let startPage, endPage;

    if (totalPages <= 7) {
        // 7 veya daha az sayfa varsa hepsini göster
        startPage = 1;
        endPage = totalPages;
    } else {
        // Çok sayfa varsa akıllı gösterim
        if (currentPage <= 3) {
            // İlk sayfalardayız
            startPage = 1;
            endPage = 5;
        } else if (currentPage >= totalPages - 2) {
            // Son sayfalardayız
            startPage = totalPages - 4;
            endPage = totalPages;
        } else {
            // Ortada bir yerdeyiz
            startPage = currentPage - 2;
            endPage = currentPage + 2;
        }
    }

    // İlk sayfa ve "..." ekle
    if (startPage > 1) {
        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerHTML = `<a class="page-link" href="javascript:void(0);" onclick="goToPage(1)">1</a>`;
        paginationList.appendChild(li);

        if (startPage > 2) {
            const liEllipsis = document.createElement('li');
            liEllipsis.className = 'page-item disabled';
            liEllipsis.innerHTML = `<span class="page-link">...</span>`;
            paginationList.appendChild(liEllipsis);
        }
    }

    // Sayfa numaralarını göster
    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="javascript:void(0);" onclick="goToPage(${i})">${i}</a>`;
        paginationList.appendChild(li);
    }

    // Son sayfa ve "..." ekle
    if (endPage < totalPages) {
        if (endPage < totalPages - 1) {
            const liEllipsis = document.createElement('li');
            liEllipsis.className = 'page-item disabled';
            liEllipsis.innerHTML = `<span class="page-link">...</span>`;
            paginationList.appendChild(liEllipsis);
        }

        const li = document.createElement('li');
        li.className = 'page-item';
        li.innerHTML = `<a class="page-link" href="javascript:void(0);" onclick="goToPage(${totalPages})">${totalPages}</a>`;
        paginationList.appendChild(li);
    }
}

function goToPage(page) {
    if (paginationData && (page < 1 || page > paginationData.totalPages)) {
        return;
    }
    currentFilters.offset = (page - 1) * currentFilters.limit;
    loadTransactions();
    // Sayfayı yukarı kaydır
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function goToFirstPage() {
    goToPage(1);
}

function goToLastPage() {
    if (paginationData && paginationData.totalPages > 0) {
        goToPage(paginationData.totalPages);
    }
}

function changePage(direction) {
    if (!paginationData) return;
    
    const newPage = paginationData.page + direction;
    if (newPage < 1 || newPage > paginationData.totalPages) {
        return;
    }
    goToPage(newPage);
}

function changePageSize() {
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    const newLimit = parseInt(pageSizeSelect.value);
    
    // Mevcut sayfadaki ilk kaydın index'ini koru
    const currentOffset = currentFilters.offset;
    const currentPage = Math.floor(currentOffset / currentFilters.limit) + 1;
    
    currentFilters.limit = newLimit;
    currentFilters.offset = (currentPage - 1) * newLimit;
    
    loadTransactions();
}

function applyFilters() {
    currentFilters.account_id = document.getElementById('filterAccount').value;
    currentFilters.type = document.getElementById('filterType').value;
    currentFilters.start_date = document.getElementById('filterStartDate').value;
    currentFilters.end_date = document.getElementById('filterEndDate').value;
    currentFilters.search_text = document.getElementById('searchTransaction').value;
    currentFilters.offset = 0; // Başa dön
    loadTransactions();
}

function resetFilters() {
    document.getElementById('filterAccount').value = '';
    document.getElementById('filterType').value = '';
    document.getElementById('filterStartDate').value = '';
    document.getElementById('filterEndDate').value = '';
    document.getElementById('searchTransaction').value = '';
    
    const pageSizeSelect = document.getElementById('pageSizeSelect');
    if (pageSizeSelect) {
        pageSizeSelect.value = '25';
    }

    currentFilters = {
        limit: 25,
        offset: 0
    };
    loadTransactions();
}
