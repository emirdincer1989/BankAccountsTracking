/**
 * Banka Hesapları İzleme Sayfası (Kullanıcılar için)
 */

let accounts = [];
let autoRefreshInterval = null;
let isAutoRefreshActive = false;
let currentSearchTerm = '';

export async function loadContent() {
    const html = `
        <!-- Özet İstatistik Kartları -->
        <div class="row mb-3" id="summaryCards">
            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0">Kurum Sayısı</p>
                                <h2 class="mt-4 ff-secondary fw-semibold" id="institutionCount">0</h2>
                                <p class="mb-0 text-muted">
                                    <span class="badge bg-light text-primary mb-0">
                                        <i class="ri-building-line align-middle"></i> Toplam Kurum
                                    </span>
                                </p>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-primary-subtle rounded-circle fs-2">
                                        <i class="ri-building-4-line text-primary"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0">Banka Hesap Sayısı</p>
                                <h2 class="mt-4 ff-secondary fw-semibold" id="accountCount">0</h2>
                                <p class="mb-0 text-muted">
                                    <span class="badge bg-light text-success mb-0">
                                        <i class="ri-bank-card-line align-middle"></i> Aktif Hesaplar
                                    </span>
                                </p>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-success-subtle rounded-circle fs-2">
                                        <i class="ri-bank-line text-success"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="col-xl-4 col-md-6">
                <div class="card card-animate">
                    <div class="card-body">
                        <div class="d-flex justify-content-between">
                            <div>
                                <p class="fw-medium text-muted mb-0">Toplam Bakiye</p>
                                <h2 class="mt-4 ff-secondary fw-semibold" id="totalBalance">₺0,00</h2>
                                <p class="mb-0 text-muted">
                                    <span class="badge bg-light text-info mb-0">
                                        <i class="ri-wallet-3-line align-middle"></i> Tüm Hesaplar
                                    </span>
                                </p>
                            </div>
                            <div>
                                <div class="avatar-sm flex-shrink-0">
                                    <span class="avatar-title bg-info-subtle rounded-circle fs-2">
                                        <i class="ri-money-dollar-circle-line text-info"></i>
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="row mb-3">
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

    // İlk yükleme
    loadAccounts();

    // Arama fonksiyonu
    document.addEventListener('keyup', function (e) {
        if (e.target && e.target.id === 'searchAccount') {
            currentSearchTerm = e.target.value.toLowerCase();
            filterAccounts(currentSearchTerm);
        }
    });

    // Otomatik güncelleme başlat (her 60 saniyede bir)
    // İlk yükleme tamamlandıktan sonra interval'i başlat
    setTimeout(() => {
        startAutoRefresh();
    }, 1000); // 1 saniye bekle, sayfa tamamen yüklensin

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
    
    console.log(`[Auto Refresh] Otomatik güncelleme başlatıldı. Her ${REFRESH_INTERVAL / 1000} saniyede bir veriler güncellenecek.`);
    
    // Periyodik güncelleme
    autoRefreshInterval = setInterval(() => {
        // Sayfa görünür değilse güncelleme yapma
        if (document.hidden) {
            console.log('[Auto Refresh] Sayfa görünür değil, güncelleme atlandı.');
            return;
        }

        console.log('[Auto Refresh] Otomatik güncelleme başlatılıyor...');
        // Sessiz güncelleme (loading göstergesi olmadan)
        loadAccounts(false, true);
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
        // Sayfa gizlendiğinde güncellemeyi durdur (performans için)
        // Interval'i temizleme, sadece güncelleme yapmama yeterli
    } else {
        // Sayfa görünür olduğunda hemen güncelle ve interval'i başlat
        if (!isAutoRefreshActive) {
            startAutoRefresh();
        }
        // Sayfa tekrar görünür olduğunda verileri güncelle
        loadAccounts(false, true);
    }
}

/**
 * Sayfa değiştiğinde temizlik yapmak için export edilen fonksiyon
 */
export function destroy() {
    stopAutoRefresh();
    document.removeEventListener('visibilitychange', handleVisibilityChange);
}

function filterAccounts(searchTerm) {
    currentSearchTerm = searchTerm;
    const filtered = accounts.filter(acc =>
        (acc.institution_name || '').toLowerCase().includes(searchTerm) ||
        (acc.bank_name || '').toLowerCase().includes(searchTerm) ||
        (acc.account_name || '').toLowerCase().includes(searchTerm) ||
        (acc.account_number || '').includes(searchTerm)
    );
    // Arama yapıldığında özet kartları güncelle (filtrelenmiş verilerle)
    updateSummaryCards(filtered);
    renderGroupedAccounts(filtered);
}

/**
 * Hesapları yükler
 * @param {boolean} showLoading - Loading göstergesi gösterilsin mi?
 * @param {boolean} silent - Sessiz güncelleme (loading göstermeden)
 */
async function loadAccounts(showLoading = true, silent = false) {
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

        // Loading göstergesi (sessiz güncelleme değilse)
        if (showLoading && !silent && container) {
            const currentContent = container.innerHTML;
            container.innerHTML = `
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status">
                        <span class="visually-hidden">Yükleniyor...</span>
                    </div>
                </div>
            `;
        }

        console.log('[Load Accounts] API çağrısı yapılıyor: /api/accounts');
        const response = await fetch('/api/accounts');
        console.log('[Load Accounts] API yanıtı alındı:', response.status, response.statusText);
        const data = await response.json();
        console.log('[Load Accounts] Veri güncellendi:', data.success ? `${data.data?.length || 0} hesap` : data.message);

        if (data.success) {
            accounts = data.data || [];

            // Özet kartları güncelle
            updateSummaryCards(accounts);

            // Eğer arama yapılmışsa filtreyi uygula, değilse tüm hesapları göster
            if (currentSearchTerm) {
                filterAccounts(currentSearchTerm);
            } else {
                renderGroupedAccounts(accounts);
            }
        } else {
            if (!silent) {
                container.innerHTML = `
                    <div class="alert alert-danger">
                        Veri yüklenirken hata oluştu: ${data.message}
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('API Hatası:', error);
        if (!silent) {
            container.innerHTML = `
                <div class="alert alert-danger">Sunucu hatası!</div>
            `;
        }
    }
}

function updateSummaryCards(accountList) {
    // Kurum sayısını hesapla
    const uniqueInstitutions = new Set();
    accountList.forEach(acc => {
        if (acc.institution_name) {
            uniqueInstitutions.add(acc.institution_name);
        }
    });
    const institutionCount = uniqueInstitutions.size;

    // Aktif hesap sayısını hesapla
    const activeAccountCount = accountList.filter(acc => acc.is_active === true).length;

    // Toplam bakiyeyi hesapla
    const totalBalance = accountList.reduce((sum, acc) => {
        return sum + parseFloat(acc.last_balance || 0);
    }, 0);

    // DOM'u güncelle
    const institutionCountEl = document.getElementById('institutionCount');
    const accountCountEl = document.getElementById('accountCount');
    const totalBalanceEl = document.getElementById('totalBalance');

    if (institutionCountEl) {
        institutionCountEl.textContent = institutionCount;
    }
    if (accountCountEl) {
        accountCountEl.textContent = activeAccountCount;
    }
    if (totalBalanceEl) {
        totalBalanceEl.textContent = new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(totalBalance);
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

    // Banka Renk ve İsim Tanımları (hesap hareketleri sayfası ile aynı)
    const bankConfig = {
        'vakif': { name: 'Vakıfbank', color: '#FFC107', bg: 'rgba(255, 193, 7, 0.1)', badgeClass: 'bg-warning text-dark', borderColor: '#FFC107' }, // Sarı
        'ziraat': { name: 'Ziraat Bankası', color: '#E30613', bg: 'rgba(227, 6, 19, 0.1)', badgeClass: 'bg-danger text-white', borderColor: '#E30613' }, // Kırmızı
        'halk': { name: 'Halkbank', color: '#005596', bg: 'rgba(0, 85, 150, 0.1)', badgeClass: 'bg-info text-white', borderColor: '#005596' } // Mavi
    };

    // Banka bilgisini belirle
    let bankKey = (acc.bank_name || '').toLowerCase();
    if (bankKey.includes('vakif')) bankKey = 'vakif';
    else if (bankKey.includes('ziraat')) bankKey = 'ziraat';
    else if (bankKey.includes('halk')) bankKey = 'halk';

    const bankInfo = bankConfig[bankKey] || { 
        name: acc.bank_name, 
        color: '#6c757d', 
        bg: 'rgba(108, 117, 125, 0.1)', 
        badgeClass: 'bg-secondary text-white',
        borderColor: '#6c757d'
    };

    // Kart stilini banka rengine göre ayarla
    const cardStyle = `border-left: 4px solid ${bankInfo.borderColor}; background-color: ${bankInfo.bg}; cursor: pointer;`;
    const bankBadgeClass = bankInfo.badgeClass;

    return `
        <div class="col-xl-4 col-md-6">
            <div class="card border h-100 shadow-none hover-shadow transition-all" style="${cardStyle}" onclick="viewTransactions(${acc.id})">
                <div class="card-body p-4">
                    <div class="d-flex justify-content-between mb-4">
                        <div>
                            <span class="badge ${bankBadgeClass} mb-2">${bankInfo.name}</span>
                            <h5 class="fs-16 fw-bold text-dark mb-1 mt-2">${acc.account_name}</h5>
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
