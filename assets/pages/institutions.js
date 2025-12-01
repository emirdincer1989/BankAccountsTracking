
let institutions = [];
let bootstrapModal = null;

export async function loadContent() {
    const html = `
        <div class="row">
            <div class="col-12">
                <div class="card">
                    <div class="card-header d-flex justify-content-between align-items-center">
                        <h4 class="card-title mb-0">Kurum Listesi</h4>
                        <button class="btn btn-success" onclick="openInstitutionModal()">
                            <i class="ri-add-line align-bottom me-1"></i> Yeni Kurum Ekle
                        </button>
                    </div>
                    <div class="card-body">
                        <div class="table-responsive">
                            <table class="table table-bordered table-hover align-middle" id="institutionsTable">
                                <thead class="table-light">
                                    <tr>
                                        <th>Kurum Adı</th>
                                        <th>Vergi No</th>
                                        <th>Durum</th>
                                        <th style="width: 150px;">İşlemler</th>
                                    </tr>
                                </thead>
                                <tbody id="institutionsTableBody">
                                    <tr>
                                        <td colspan="4" class="text-center py-4">
                                            <div class="spinner-border text-primary" role="status">
                                                <span class="visually-hidden">Yükleniyor...</span>
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <!-- Modal -->
        <div class="modal fade" id="institutionModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title" id="institutionModalLabel">Yeni Kurum</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="institutionForm">
                        <input type="hidden" id="institutionId">
                        <div class="modal-body">
                            <div class="mb-3">
                                <label for="institutionName" class="form-label">Kurum Adı <span class="text-danger">*</span></label>
                                <input type="text" class="form-control" id="institutionName" required>
                            </div>
                            <div class="mb-3">
                                <label for="parentInstitution" class="form-label">Üst Kurum</label>
                                <select class="form-select" id="parentInstitution">
                                    <option value="">Yok (Ana Kurum)</option>
                                    <!-- Seçenekler JS ile doldurulacak -->
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="taxNumber" class="form-label">Vergi No</label>
                                <input type="text" class="form-control" id="taxNumber">
                            </div>
                            <div class="mb-3 form-check form-switch">
                                <input class="form-check-input" type="checkbox" id="isActive" checked>
                                <label class="form-check-label" for="isActive">Aktif</label>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                            <button type="submit" class="btn btn-primary" id="saveInstitutionBtn">Kaydet</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>

        <!-- Yetkilendirme Modal -->
        <div class="modal fade" id="authModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Kurum Yetkilileri</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body">
                        <input type="hidden" id="authInstitutionId">
                        <div class="alert alert-info small">
                            <i class="ri-information-line me-1"></i> 
                            Aşağıdaki listeden bu kuruma erişim yetkisi olacak kullanıcıları seçiniz. 
                            Listede sadece boşta olan veya zaten bu kuruma atanmış kullanıcılar görünür.
                        </div>
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-sm table-hover">
                                <thead>
                                    <tr>
                                        <th style="width: 40px;">
                                            <input type="checkbox" class="form-check-input" id="selectAllUsers">
                                        </th>
                                        <th>Kullanıcı Adı</th>
                                        <th>E-posta</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody id="usersTableBody">
                                    <!-- Kullanıcılar buraya gelecek -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="saveInstitutionUsers()">Kaydet</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Kurum Yönetimi'
    };
}

export function init() {
    loadInstitutions();

    window.openInstitutionModal = openInstitutionModal;
    window.editInstitution = editInstitution;
    window.deleteInstitution = deleteInstitution;
    window.openAuthModal = openAuthModal;
    window.saveInstitutionUsers = saveInstitutionUsers;

    const form = document.getElementById('institutionForm');
    if (form) {
        form.addEventListener('submit', handleFormSubmit);
    }

    // Select All checkbox logic
    document.addEventListener('change', function (e) {
        if (e.target && e.target.id === 'selectAllUsers') {
            const checkboxes = document.querySelectorAll('.user-checkbox');
            checkboxes.forEach(cb => cb.checked = e.target.checked);
        }
    });
}

async function loadInstitutions() {
    try {
        const response = await fetch('/api/institutions');
        const data = await response.json();

        if (data.success) {
            institutions = data.data;
            renderTable();
        } else {
            console.error('Kurumlar yüklenemedi:', data.message);
            document.getElementById('institutionsTableBody').innerHTML = `
                <tr><td colspan="4" class="text-center text-danger">Veri yüklenirken hata oluştu: ${data.message}</td></tr>
            `;
        }
    } catch (error) {
        console.error('API Hatası:', error);
        document.getElementById('institutionsTableBody').innerHTML = `
            <tr><td colspan="4" class="text-center text-danger">Sunucu hatası!</td></tr>
        `;
    }
}

function renderTable() {
    const tbody = document.getElementById('institutionsTableBody');

    if (!tbody) return;

    if (institutions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Kayıt bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = institutions.map(inst => {
        // Hiyerarşik gösterim için girinti
        const indent = '&nbsp;'.repeat(inst.level * 4);
        const icon = inst.level > 0 ? '<i class="ri-corner-down-right-line text-muted"></i> ' : '';

        return `
        <tr>
            <td>
                <div class="d-flex align-items-center">
                    ${indent}${icon}
                    <span class="${inst.level === 0 ? 'fw-bold' : ''}">${inst.name}</span>
                </div>
            </td>
            <td>${inst.tax_number || '-'}</td>
            <td>
                <span class="badge ${inst.is_active ? 'bg-success' : 'bg-danger'}">
                    ${inst.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                <button class="btn btn-sm btn-warning me-1" onclick="openAuthModal(${inst.id})" title="Yetkililer">
                    <i class="ri-shield-user-line text-white"></i>
                </button>
                <button class="btn btn-sm btn-info me-1" onclick="editInstitution(${inst.id})" title="Düzenle">
                    <i class="ri-pencil-line text-white"></i>
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteInstitution(${inst.id})" title="Sil">
                    <i class="ri-delete-bin-line text-white"></i>
                </button>
            </td>
        </tr>
    `}).join('');
}

function populateParentSelect(excludeId = null) {
    const select = document.getElementById('parentInstitution');
    select.innerHTML = '<option value="">Yok (Ana Kurum)</option>';

    institutions.forEach(inst => {
        // Kendisini ve altlarını parent olarak seçememeli (döngüsel referans önleme - basitçe kendisini engelle)
        if (inst.id === excludeId) return;

        // Hiyerarşik görünüm
        const indent = '- '.repeat(inst.level);
        select.innerHTML += `<option value="${inst.id}">${indent}${inst.name}</option>`;
    });
}

function openInstitutionModal() {
    document.getElementById('institutionForm').reset();
    document.getElementById('institutionId').value = '';
    document.getElementById('isActive').checked = true;
    document.getElementById('institutionModalLabel').textContent = 'Yeni Kurum';

    populateParentSelect();

    const modalEl = document.getElementById('institutionModal');
    bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();
}

function editInstitution(id) {
    const inst = institutions.find(i => i.id === id);
    if (!inst) return;

    document.getElementById('institutionId').value = inst.id;
    document.getElementById('institutionName').value = inst.name;
    document.getElementById('taxNumber').value = inst.tax_number || '';
    document.getElementById('isActive').checked = inst.is_active;
    document.getElementById('institutionModalLabel').textContent = 'Kurum Düzenle';

    populateParentSelect(inst.id);
    document.getElementById('parentInstitution').value = inst.parent_id || '';

    const modalEl = document.getElementById('institutionModal');
    bootstrapModal = new bootstrap.Modal(modalEl);
    bootstrapModal.show();
}

async function handleFormSubmit(e) {
    e.preventDefault();

    const id = document.getElementById('institutionId').value;
    const name = document.getElementById('institutionName').value;
    const parentId = document.getElementById('parentInstitution').value || null;
    const taxNumber = document.getElementById('taxNumber').value;
    const isActive = document.getElementById('isActive').checked;

    const btn = document.getElementById('saveInstitutionBtn');

    const url = id ? `/api/institutions/${id}` : '/api/institutions';
    const method = id ? 'PUT' : 'POST';

    const payload = {
        name,
        parent_id: parentId,
        tax_number: taxNumber,
        is_active: isActive
    };

    try {
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Kaydediliyor...';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            if (bootstrapModal) bootstrapModal.hide();
            loadInstitutions();
            window.showSuccess('Kurum başarıyla kaydedildi.');
        } else {
            window.showError(result.message, 'Kaydetme Hatası');
        }
    } catch (error) {
        console.error('Kaydetme hatası:', error);
        window.showError('Bir hata oluştu!', 'Sistem Hatası');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Kaydet';
    }
}

async function deleteInstitution(id) {
    const confirmed = await window.showConfirmDelete({
        title: 'Kurum Silinecek',
        message: 'Bu kurumu silmek istediğinize emin misiniz? Alt kurumları varsa silinemez.'
    });

    if (!confirmed) return;

    try {
        const response = await fetch(`/api/institutions/${id}`, {
            method: 'DELETE'
        });
        const result = await response.json();

        if (result.success) {
            loadInstitutions();
            window.showSuccess('Kurum silindi.');
        } else {
            window.showError(result.message, 'Silme Hatası');
        }
    } catch (error) {
        console.error('Silme hatası:', error);
        window.showError('Bir hata oluştu!', 'Sistem Hatası');
    }
}

// --- Yetkilendirme İşlemleri ---

async function openAuthModal(institutionId) {
    document.getElementById('authInstitutionId').value = institutionId;
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = '<tr><td colspan="4" class="text-center"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>';

    const modalEl = document.getElementById('authModal');
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    try {
        const response = await fetch(`/api/institutions/${institutionId}/users`);
        const data = await response.json();

        if (data.success) {
            renderUsersTable(data.data, institutionId);
        } else {
            tbody.innerHTML = `<tr><td colspan="4" class="text-center text-danger">${data.message}</td></tr>`;
        }
    } catch (error) {
        console.error('Kullanıcı yükleme hatası:', error);
        tbody.innerHTML = '<tr><td colspan="4" class="text-center text-danger">Kullanıcılar yüklenemedi.</td></tr>';
    }
}

function renderUsersTable(users, institutionId) {
    const tbody = document.getElementById('usersTableBody');

    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">Uygun kullanıcı bulunamadı.</td></tr>';
        return;
    }

    tbody.innerHTML = users.map(user => {
        const isAssigned = user.is_assigned; // Backend'den gelen doğru flag
        return `
            <tr>
                <td>
                    <input type="checkbox" class="form-check-input user-checkbox" value="${user.id}" ${isAssigned ? 'checked' : ''}>
                </td>
                <td>${user.name}</td>
                <td>${user.email}</td>
                <td>
                    ${isAssigned
                ? '<span class="badge bg-success">Yetkili</span>'
                : '<span class="badge bg-secondary">Yetkisiz</span>'}
                </td>
            </tr>
        `;
    }).join('');
}

async function saveInstitutionUsers() {
    const institutionId = document.getElementById('authInstitutionId').value;
    const checkboxes = document.querySelectorAll('.user-checkbox:checked');
    const userIds = Array.from(checkboxes).map(cb => parseInt(cb.value));

    try {
        window.showLoading('Yetkiler güncelleniyor...');

        const response = await fetch(`/api/institutions/${institutionId}/users`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds })
        });

        const result = await response.json();
        window.Notification.removeAll();

        if (result.success) {
            window.showSuccess('Yetkiler başarıyla güncellendi.');
            const modalEl = document.getElementById('authModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            modal.hide();
        } else {
            window.showError(result.message, 'Hata');
        }
    } catch (error) {
        console.error('Yetki güncelleme hatası:', error);
        window.Notification.removeAll();
        window.showError('Bir hata oluştu.', 'Sistem Hatası');
    }
}
