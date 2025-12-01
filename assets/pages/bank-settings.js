/**
 * Banka Entegrasyon Yönetimi Sayfası
 */

let institutions = [];
let currentInstitutionId = null;
let accounts = [];
let bootstrapModal = null;

export async function loadContent() {
    const html = `
        <div class="row h-100">
            <!-- Sol Panel: Kurum Listesi -->
            <div class="col-md-4 col-lg-3">
                <div class="card h-100">
                    <div class="card-header border-bottom-0">
                        <h5 class="card-title mb-0">Kurum Seçimi</h5>
                    </div>
                    <div class="card-body p-0">
                        <div class="list-group list-group-flush" id="institutionList">
                            <div class="text-center py-4">
                                <div class="spinner-border spinner-border-sm text-primary" role="status"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Sağ Panel: Hesap Listesi -->
            <div class="col-md-8 col-lg-9">
                <div class="card h-100" id="accountsCard" style="display:none;">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h5 class="card-title mb-0" id="selectedInstitutionName">Kurum Hesapları</h5>
                        <button class="btn btn-primary btn-sm" onclick="openAccountModal()">
                            <i class="ri-add-line align-bottom me-1"></i> Yeni Hesap Ekle
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-nowrap align-middle">
                                <thead class="table-light">
                                    <tr>
                                        <th>Banka</th>
                                        <th>Hesap Adı</th>
                                        <th>Durum</th>
                                        <th>Son Senkronizasyon</th>
                                        <th style="width: 120px;">İşlem</th>
                                    </tr>
                                </thead>
                                <tbody id="accountsTableBody">
                                    <!-- Hesaplar buraya gelecek -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Boş Durum -->
                <div class="card h-100 d-flex align-items-center justify-content-center" id="emptyState">
                    <div class="text-center">
                        <i class="ri-bank-line display-1 text-muted"></i>
                        <p class="mt-3 fs-16 text-muted">İşlem yapmak için soldan bir kurum seçin.</p>
                    </div>
                </div>
            </div>
        </div>

        <!-- Hesap Ekleme Modal -->
        <div class="modal fade" id="accountModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Yeni Banka Hesabı Ekle</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="accountForm">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="bankName" class="form-label">Banka <span class="text-danger">*</span></label>
                                <select class="form-select" id="bankName" required onchange="updateBankFields()">
                                    <option value="">Seçiniz</option>
                                    <option value="ziraat">Ziraat Bankası</option>
                                    <option value="vakif">Vakıfbank</option>
                                    <option value="halk">Halkbank</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="accountName" class="form-label">Hesap Tanımı (Adı) <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="accountName" placeholder="Örn: Ana Hesap" required>
                            </div>
                            
                            <hr>
                            <h6 class="mb-3">Banka Bilgileri</h6>
                            <div id="dynamicFields">
                                <div class="alert alert-info small">
                                    Lütfen önce banka seçiniz.
                                </div>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="submit" class="btn btn-primary" id="saveAccountBtn">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Banka Entegrasyon Yönetimi'
    };
}

export function init() {
    loadInstitutions();

    window.selectInstitution = selectInstitution;
    window.openAccountModal = openAccountModal;
    window.syncAccount = syncAccount;
    window.deleteAccount = deleteAccount;
    window.editAccount = editAccount;
    window.updateBankFields = updateBankFields;

    const form = document.getElementById('accountForm');
    if (form) {
        form.addEventListener('submit', handleAccountSubmit);
    }
}

async function loadInstitutions() {
    try {
        const response = await fetch('/api/institutions');
        const data = await response.json();

        if (data.success) {
            institutions = data.data;
            renderInstitutionList();
        } else {
            console.error('Kurumlar yüklenemedi');
        }
    } catch (error) {
        console.error('API Hatası:', error);
    }
}

function renderInstitutionList() {
    const list = document.getElementById('institutionList');

    if (institutions.length === 0) {
        list.innerHTML = '<div class="p-3 text-muted text-center">Kurum bulunamadı.</div>';
        return;
    }

    list.innerHTML = institutions.map(inst => `
        <button type="button" class="list-group-item list-group-item-action" 
                onclick="selectInstitution(${inst.id}, '${inst.name}', this)">
            <div class="d-flex w-100 justify-content-between align-items-center">
                <h6 class="mb-1">${inst.name}</h6>
                <i class="ri-arrow-right-s-line text-muted"></i>
            </div>
        </button>
    `).join('');
}

async function selectInstitution(id, name, element) {
    currentInstitutionId = id;

    // UI Update
    document.querySelectorAll('#institutionList .list-group-item').forEach(el => {
        el.classList.remove('active');
        // Reset colors for non-active items
        const h6 = el.querySelector('h6');
        const icon = el.querySelector('i');
        if (h6) h6.classList.remove('text-white');
        if (icon) {
            icon.classList.remove('text-white');
            icon.classList.add('text-muted');
        }
    });

    if (element) {
        element.classList.add('active');
        // Set white text for active item
        const h6 = element.querySelector('h6');
        const icon = element.querySelector('i');
        if (h6) h6.classList.add('text-white');
        if (icon) {
            icon.classList.remove('text-muted');
            icon.classList.add('text-white');
        }
    }

    document.getElementById('selectedInstitutionName').textContent = `${name} - Hesapları`;
    document.getElementById('emptyState').style.display = 'none';
    document.getElementById('accountsCard').style.display = 'block';

    // Load Accounts
    loadAccounts(id);
}

async function loadAccounts(institutionId) {
    const tbody = document.getElementById('accountsTableBody');
    tbody.innerHTML = '<tr><td colspan="5" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

    try {
        const response = await fetch(`/api/accounts/institution/${institutionId}`);
        const data = await response.json();

        if (data.success) {
            accounts = data.data || [];
            renderAccountsTable();
        } else {
            tbody.innerHTML = `<tr><td colspan="5" class="text-center text-danger">${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Hesaplar yüklenemedi:', error);
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Bağlantı hatası.</td></tr>';
    }
}

function renderAccountsTable() {
    const tbody = document.getElementById('accountsTableBody');

    if (accounts.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Bu kuruma ait hesap bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = accounts.map(acc => `
        <tr>
            <td><span class="badge bg-info-subtle text-info text-uppercase">${acc.bank_name}</span></td>
            <td>${acc.account_name}</td>
            <td>
                <span class="badge ${acc.is_active ? 'bg-success' : 'bg-danger'}">
                    ${acc.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>${acc.last_sync_at ? new Date(acc.last_sync_at).toLocaleString('tr-TR') : '-'}</td>
            <td>
                <button class="btn btn-sm btn-primary me-1" onclick="syncAccount(${acc.id})" title="Senkronize Et">
                    <i class="ri-refresh-line"></i>
                </button>
                <button class="btn btn-sm btn-info me-1" onclick="editAccount(${acc.id})" title="Düzenle">
                    <i class="ri-pencil-line text-white"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteAccount(${acc.id})" title="Sil">
                    <i class="ri-delete-bin-line"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

async function editAccount(id) {
    try {
        window.showLoading('Hesap bilgileri yükleniyor...');
        const response = await fetch(`/api/accounts/${id}`);
        const result = await response.json();
        window.Notification.removeAll();

        if (result.success) {
            const acc = result.data;

            // Formu resetle ve modalı aç
            document.getElementById('accountForm').reset();
            const modalEl = document.getElementById('accountModal');
            bootstrapModal = new bootstrap.Modal(modalEl);
            bootstrapModal.show();

            // Başlığı güncelle
            modalEl.querySelector('.modal-title').textContent = 'Hesap Düzenle';

            // ID'yi sakla (Edit modu için)
            modalEl.dataset.accountId = acc.id;

            // Alanları doldur
            document.getElementById('bankName').value = acc.bank_name.toLowerCase();
            document.getElementById('bankName').disabled = true; // Banka değiştirilemez
            document.getElementById('accountName').value = acc.account_name;

            // Dinamik alanları oluştur
            updateBankFields();

            // Dinamik alanları doldur
            const credentials = acc.credentials || {};
            const dynamicInputs = document.getElementById('dynamicFields').querySelectorAll('input');

            dynamicInputs.forEach(input => {
                if (credentials[input.name]) {
                    input.value = credentials[input.name];
                }
                // Şifre alanlarının placeholder'ını güncelle
                if (input.type === 'password') {
                    input.required = false; // Edit modunda şifre zorunlu değil
                    input.placeholder = 'Değiştirmek için doldurun';
                }
            });

        } else {
            window.showError(result.message, 'Hata');
        }
    } catch (error) {
        console.error('Edit hatası:', error);
        window.Notification.removeAll();
        window.showError('Bir hata oluştu.', 'Sistem Hatası');
    }
}

async function deleteAccount(accountId) {
    const confirmed = await window.showConfirmDelete({
        title: 'Hesap Silinecek',
        message: 'Bu banka hesabını ve tüm hareketlerini silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
    });

    if (!confirmed) return;

    try {
        window.showLoading('Hesap siliniyor...');
        const response = await fetch(`/api/accounts/${accountId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        window.Notification.removeAll();

        if (result.success) {
            window.showSuccess('Hesap başarıyla silindi.');
            loadAccounts(currentInstitutionId); // Listeyi yenile
        } else {
            window.showError(result.message, 'Silme Hatası');
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        window.Notification.removeAll();
        window.showError('Bir hata oluştu.', 'Sistem Hatası');
    }
}

function openAccountModal() {
    if (!currentInstitutionId) {
        window.showWarning('Lütfen önce bir kurum seçin.');
        return;
    }

    document.getElementById('accountForm').reset();
    document.getElementById('dynamicFields').innerHTML = '<div class="alert alert-info small">Lütfen önce banka seçiniz.</div>';

    // Reset edit mode
    const modalEl = document.getElementById('accountModal');
    delete modalEl.dataset.accountId;
    modalEl.querySelector('.modal-title').textContent = 'Yeni Banka Hesabı Ekle';
    document.getElementById('bankName').disabled = false;

    bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();
}

function updateBankFields() {
    const bank = document.getElementById('bankName').value;
    const container = document.getElementById('dynamicFields');

    if (!bank) {
        container.innerHTML = '<div class="alert alert-info small">Lütfen önce banka seçiniz.</div>';
        return;
    }

    let fields = '';

    if (bank === 'ziraat') {
        fields = `
            <div class="mb-3">
                <label class="form-label">Kullanıcı Kodu <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="user_code" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Şifre <span class="text-danger">*</span></label>
                <input type="password" class="form-control" name="password" required>
            </div>
            <div class="mb-3">
                <label class="form-label">IBAN <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="iban" placeholder="TR..." required>
            </div>
        `;
    } else if (bank === 'vakif') {
        fields = `
            <div class="mb-3">
                <label class="form-label">Müşteri No <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="customer_no" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Kurum Kullanıcısı <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="user_code" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Şifre <span class="text-danger">*</span></label>
                <input type="password" class="form-control" name="password" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Hesap No <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="account_no" required>
            </div>
        `;
    } else if (bank === 'halk') {
        fields = `
            <div class="mb-3">
                <label class="form-label">Kullanıcı Adı <span class="text-danger">*</span></label>
                <input type="text" class="form-control" name="username" required>
            </div>
            <div class="mb-3">
                <label class="form-label">Şifre <span class="text-danger">*</span></label>
                <input type="password" class="form-control" name="password" required>
            </div>
            <div class="row">
                <div class="col-md-6 mb-3">
                    <label class="form-label">Hesap No <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="account_no" required>
                </div>
                <div class="col-md-6 mb-3">
                    <label class="form-label">Şube Kodu <span class="text-danger">*</span></label>
                    <input type="text" class="form-control" name="branch_code" required>
                </div>
            </div>
        `;
    }

    container.innerHTML = fields;
}

async function handleAccountSubmit(e) {
    e.preventDefault();

    if (!currentInstitutionId) return;

    const modalEl = document.getElementById('accountModal');
    const accountId = modalEl.dataset.accountId; // Edit modundaysa ID burada olacak
    const isEdit = !!accountId;

    const bankSelect = document.getElementById('bankName');
    const selectedBank = bankSelect.value;
    const accountName = document.getElementById('accountName').value;

    const btn = document.getElementById('saveAccountBtn');

    // Collect dynamic fields
    const credentials = {};
    const dynamicInputs = document.getElementById('dynamicFields').querySelectorAll('input');
    dynamicInputs.forEach(input => {
        credentials[input.name] = input.value;
    });

    const payload = {
        institution_id: currentInstitutionId,
        bank_name: selectedBank,
        account_name: accountName,
        credentials: credentials
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Kaydediliyor...';

        const url = isEdit ? `/api/accounts/${accountId}` : '/api/accounts';
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            if (bootstrapModal) bootstrapModal.hide();
            loadAccounts(currentInstitutionId);
            window.showSuccess(isEdit ? 'Hesap güncellendi.' : 'Hesap başarıyla eklendi.');
        } else {
            window.showError(result.message, 'Hata');
        }
    } catch (error) {
        console.error('Hesap kaydetme hatası:', error);
        window.showError('Bir hata oluştu.', 'Sistem Hatası');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Kaydet';
    }
}

async function syncAccount(accountId) {
    try {
        window.showLoading('Senkronizasyon başlatılıyor...');

        const response = await fetch(`/api/accounts/${accountId}/sync`, {
            method: 'POST'
        });
        const result = await response.json();

        window.Notification.removeAll(); // Loading'i kaldır

        if (result.success) {
            window.showSuccess('Senkronizasyon başarıyla tamamlandı.');
            loadAccounts(currentInstitutionId);
        } else {
            window.showError(result.message, 'Senkronizasyon Hatası');
        }
    } catch (error) {
        console.error('Sync hatası:', error);
        window.Notification.removeAll();
        window.showError('Senkronizasyon sırasında bir hata oluştu.', 'Sistem Hatası');
    }
}
