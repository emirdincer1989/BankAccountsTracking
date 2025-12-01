/**
 * Hesap Hareketleri Sayfası
 */

let transactions = [];
let accounts = [];
let currentFilters = {
    limit: 20,
    offset: 0
};

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
                                        <th class="sort" data-sort="status" scope="col" style="width: 50px;">Drm</th>
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
                        <div class="d-flex justify-content-end mt-3">
                            <div class="pagination-wrap hstack gap-2">
                                <button class="page-item pagination-prev disabled" id="prevPageBtn" onclick="changePage(-1)">
                                    Önceki
                                </button>
                                <ul class="pagination listjs-pagination mb-0"></ul>
                                <button class="page-item pagination-next disabled" id="nextPageBtn" onclick="changePage(1)">
                                    Sonraki
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

    // URL'den parametreleri al (örn: accounts-view'den gelen account_id)
    const urlParams = new URLSearchParams(window.location.search);
    const accountId = urlParams.get('account');

    loadAccounts(accountId);

    if (accountId) {
        currentFilters.account_id = accountId;
    }

    loadTransactions();
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

async function loadTransactions() {
    const tbody = document.getElementById('transactionTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

    try {
        // Query string oluştur
        const params = new URLSearchParams();
        for (const [key, value] of Object.entries(currentFilters)) {
            if (value !== null && value !== undefined && value !== '') {
                params.append(key, value);
            }
        }

        const response = await fetch(`/api/transactions?${params.toString()}`);
        const data = await response.json();

        if (data.success) {
            transactions = data.data;
            renderTable();
            updatePagination(data.pagination);
        } else {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('API Hatası:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Bağlantı hatası.</td></tr>';
    }
}

function renderTable() {
    const tbody = document.getElementById('transactionTableBody');

    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="text-center">Kayıt bulunamadı.</td></tr>';
        return;
    }

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
        // Icons from the theme example: 
        // Income: ri-arrow-left-down-fill (Green)
        // Expense: ri-arrow-right-up-fill (Red)
        const amountIcon = isPositive ? 'ri-arrow-left-down-fill' : 'ri-arrow-right-up-fill';
        const iconBgClass = isPositive ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger';

        // Kurum adı (veritabanından geliyorsa)
        const institutionName = tx.institution_name || '-';

        return `
        <tr>
            <td class="date">${date} <small class="text-muted">${time}</small></td>
            <td>
                <div class="avatar-xs">
                    <div class="avatar-title ${iconBgClass} rounded-circle fs-16">
                        <i class="${amountIcon}"></i>
                    </div>
                </div>
            </td>
            <td class="institution">${institutionName}</td>
            <td class="bank_account">
                <div class="d-flex align-items-center">
                    <div class="flex-grow-1">
                        <h6 class="mb-0">${tx.bank_name}</h6>
                        <small class="text-muted">${tx.account_name}</small>
                    </div>
                </div>
            </td>
            <td class="counterparty">${tx.sender_receiver || '-'}</td>
            <td class="description" style="max-width: 300px; white-space: normal; word-wrap: break-word;">
                ${tx.description}
            </td>
            <td class="amount ${amountClass} fw-bold">
                ${amount}
            </td>
        </tr>
    `}).join('');
}

function updatePagination(pagination) {
    const prevBtn = document.getElementById('prevPageBtn');
    const nextBtn = document.getElementById('nextPageBtn');
    const paginationList = document.querySelector('.pagination.listjs-pagination');

    if (pagination.page <= 1) prevBtn.classList.add('disabled');
    else prevBtn.classList.remove('disabled');

    if (pagination.page >= pagination.totalPages) nextBtn.classList.add('disabled');
    else nextBtn.classList.remove('disabled');

    // Render page numbers
    paginationList.innerHTML = '';

    const totalPages = pagination.totalPages;
    const currentPage = pagination.page;

    // Simple pagination logic: show all if <= 7 pages, otherwise show range
    // For now, let's keep it simple and show up to 5 pages around current
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    if (endPage - startPage < 4) {
        startPage = Math.max(1, endPage - 4);
    }

    for (let i = startPage; i <= endPage; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="javascript:void(0);" onclick="goToPage(${i})">${i}</a>`;
        paginationList.appendChild(li);
    }
}

window.goToPage = function (page) {
    currentFilters.offset = (page - 1) * currentFilters.limit;
    loadTransactions();
}

function changePage(direction) {
    currentFilters.offset += direction * currentFilters.limit;
    if (currentFilters.offset < 0) currentFilters.offset = 0;
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

    currentFilters = {
        limit: 20,
        offset: 0
    };
    loadTransactions();
}
