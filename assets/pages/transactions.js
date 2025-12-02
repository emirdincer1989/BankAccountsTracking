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
    // For now, let's keep it simple and show up to5 pages around current
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
