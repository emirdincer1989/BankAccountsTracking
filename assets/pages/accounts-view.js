/**
 * Banka Hesapları İzleme Sayfası (Kullanıcılar için)
/**
 * Banka Hesapları İzleme Sayfası (Kullanıcılar için)
 */

let accounts = [];

export async function loadContent() {
    const html = `
        <div class="row mb-4">
            <div class="col-12 d-flex justify-content-between align-items-center">
                <h4 class="mb-0 fw-bold">Hesaplara Genel Bakış</h4>
                <button class="btn btn-light" onclick="loadAccounts()">
                    <i class="ri-refresh-line align-bottom me-1"></i> Verileri Yenile
                </button>
            </div>
        </div>

        <div class="row mb-4">
            <div class="col-12">
                <div class="search-box">
                    <input type="text" class="form-control form-control-lg bg-light border-light" id="searchAccount" placeholder="Kurum veya hesap ara...">
                    <i class="ri-search-line search-icon"></i>
                </div>
            </div>
        </div>

        <div id="accountsContainer">
            <div class="text-center py-5">
                <div class="spinner-border text-primary" role="status">
                    <span class="visually-hidden">Yükleniyor...</span>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Banka Hesapları'
    };
}

export function init() {
    // Global fonksiyon
    window.loadAccounts = loadAccounts;
    window.viewTransactions = viewTransactions;

    loadAccounts();

    // Arama fonksiyonu
    document.addEventListener('keyup', function (e) {
        if (e.target && e.target.id === 'searchAccount') {
            const searchTerm = e.target.value.toLowerCase();
            filterAccounts(searchTerm);
        }
    });
}

function filterAccounts(searchTerm) {
    const filtered = accounts.filter(acc =>
        (acc.institution_name || '').toLowerCase().includes(searchTerm) ||
        (acc.bank_name || '').toLowerCase().includes(searchTerm) ||
        (acc.account_name || '').toLowerCase().includes(searchTerm) ||
        (acc.account_number || '').includes(searchTerm)
    );
    renderGroupedAccounts(filtered);
}

async function loadAccounts() {
    const container = document.getElementById('accountsContainer');

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

        if (!isSuperAdmin && userInstitutionIds.length === 0) {
            container.innerHTML = `
                <div class="alert alert-warning">
                    Herhangi bir kuruma yetkiniz bulunamadı. Lütfen yönetici ile iletişime geçin.
                </div>
            `;
            return;
        }

        const response = await fetch('/api/accounts');
        const data = await response.json();

        if (data.success) {
            accounts = data.data || [];
            renderGroupedAccounts(accounts);
        } else {
            container.innerHTML = `
                <div class="alert alert-danger">
                    Veri yüklenirken hata oluştu: ${data.message}
                </div>
            `;
        }
    } catch (error) {
        console.error('API Hatası:', error);
        container.innerHTML = `
            <div class="alert alert-danger">Sunucu hatası!</div>
        `;
    }
}

function renderGroupedAccounts(accountList) {
    const container = document.getElementById('accountsContainer');

    if (accountList.length === 0) {
        container.innerHTML = `
            <div class="card">
                <div class="card-body text-center py-5">
                    <i class="ri-bank-card-line fs-1 text-muted"></i>
                    <p class="mt-3 mb-0">Hesap bulunamadı.</p>
                </div>
            </div>
        `;
        return;
    }

    // Hesapları kurumlara göre grupla
    const grouped = {};
    accountList.forEach(acc => {
        const instName = acc.institution_name || 'Diğer Kurumlar';
        if (!grouped[instName]) {
            grouped[instName] = {
                totalBalance: 0,
                accounts: []
            };
        }
        grouped[instName].accounts.push(acc);
        grouped[instName].totalBalance += parseFloat(acc.last_balance || 0);
    });

    let html = '';

    for (const [instName, data] of Object.entries(grouped)) {
        const totalBalanceFormatted = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(data.totalBalance);

        html += `
            <div class="card mb-4 border shadow-sm">
                <div class="card-header bg-white border-bottom p-4">
                    <div class="d-flex justify-content-between align-items-center">
                        <div class="d-flex align-items-center">
                            <div class="avatar-sm me-3">
                                <span class="avatar-title bg-success-subtle text-success rounded-circle fs-3">
                                    ${instName.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <h4 class="card-title mb-0 fs-18 fw-bold text-dark">${instName}</h4>
                        </div>
                        <div class="text-end">
                            <span class="text-muted d-block fs-12 mb-1">Toplam Bakiye</span>
                            <h4 class="mb-0 fw-bold text-success">${totalBalanceFormatted}</h4>
                        </div>
                    </div>
                </div>
                <div class="card-body p-4 bg-light-subtle">
                    <div class="row g-4">
                        ${data.accounts.map(acc => renderAccountCard(acc)).join('')}
                    </div>
                </div>
            </div>
        `;
    }

    container.innerHTML = html;
}

function renderAccountCard(acc) {
    const balance = new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY'
    }).format(acc.last_balance || 0);

    let statusBadge = '';
    let statusClass = '';

    if (acc.is_active) {
        statusBadge = '<i class="ri-checkbox-circle-fill me-1"></i> Aktif';
        statusClass = 'text-success';
    } else {
        statusBadge = '<i class="ri-error-warning-fill me-1"></i> Pasif';
        statusClass = 'text-danger';
    }

    // Hesap numarasını maskele (son 4 hane hariç)
    const maskedAccount = acc.account_number ? `•••• ${acc.account_number.slice(-4)}` : '••••';

    return `
        <div class="col-xl-4 col-md-6">
            <div class="card border h-100 shadow-none bg-white hover-shadow transition-all" style="cursor: pointer;" onclick="viewTransactions(${acc.id})">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between mb-4">
                        <div>
                            <h5 class="fs-16 fw-bold text-dark mb-1">${acc.bank_name} - ${acc.account_name}</h5>
                            <p class="text-muted mb-0 fs-13">${maskedAccount}</p>
                        </div>
                        <div class="${statusClass} fs-13 fw-medium bg-light px-2 py-1 rounded h-100 d-flex align-items-center">
                            ${statusBadge}
                        </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-end mt-4 pt-2 border-top border-light">
                        <div>
                            <span class="text-muted fs-12">Mevcut Bakiye</span>
                        </div>
                        <h3 class="fw-bold text-dark mb-0">${balance}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function viewTransactions(accountId) {
    // SPA yönlendirmesi
    window.history.pushState({}, '', `/transactions?account=${accountId}`);
    // PageLoader ile sayfayı yükle (Global fonksiyon varsa)
    if (window.loadPage) {
        window.loadPage('transactions');
    }
}
