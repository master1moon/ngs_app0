// إدارة المحلات
function renderStoresList() {
  const list = document.getElementById('storesList'); if (!list) return;
  list.innerHTML = '';
  data.stores.forEach(store => {
    const item = document.createElement('a'); item.href = '#'; item.className = 'list-group-item list-group-item-action'; item.dataset.id = store.id;
    item.innerHTML = `<div>${store.name}</div><small class="text-muted">نوع السعر: ${getPriceTypeName(store.priceType)}</small>`;
    item.addEventListener('click', () => showStoreDetails(store.id));
    list.appendChild(item);
  });
}

function showStoreDetails(storeId) {
  const store = data.stores.find(s => s.id === storeId); if (!store) return;
  document.getElementById('storeHeader').textContent = `تفاصيل المحل: ${store.name}`;
  const details = document.getElementById('storeDetails');
  const sales = data.sales.filter(s => s.storeId === storeId);
  const payments = data.payments.filter(p => p.storeId === storeId);
  const totalSales = sales.reduce((sum, sale) => sum + sale.total, 0);
  const totalPayments = payments.reduce((sum, payment) => sum + payment.amount, 0);
  const balance = totalSales - totalPayments;
  details.innerHTML = `
    <div class="d-flex justify-content-between mb-4">
      <div><h5>الرصيد الحالي:</h5><p class="h4 ${balance >= 0 ? 'text-success' : 'text-danger'} currency">${formatNumber(Math.abs(balance))}</p></div>
      <div><h5>نوع السعر:</h5><p class="h5">${getPriceTypeName(store.priceType)}</p></div>
      <div>
        <button class="btn btn-success" id="addSaleBtn" data-store="${storeId}"><i class="fas fa-plus me-2"></i>إضافة بيع</button>
        <button class="btn btn-info" id="addPaymentBtn" data-store="${storeId}"><i class="fas fa-money-bill me-2"></i>تسديد دفعة</button>
        <button class="btn btn-warning edit-store" data-id="${storeId}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-danger delete-store" data-id="${storeId}"><i class="fas fa-trash"></i></button>
      </div>
    </div>
    <h5>عمليات البيع</h5>
    <div class="table-responsive mb-4">
      <table class="data-table"><thead><tr><th>التاريخ</th><th>السبب/الباقة</th><th>الكمية/المبلغ</th><th>الإجمالي</th><th>الإجراءات</th></tr></thead><tbody id="storeSalesTable"></tbody></table>
    </div>
    <h5>عمليات التسديد</h5>
    <div class="table-responsive">
      <table class="data-table"><thead><tr><th>التاريخ</th><th>المبلغ</th><th>ملاحظات</th><th>الإجراءات</th></tr></thead><tbody id="storePaymentsTable"></tbody></table>
    </div>
    <div class="card mb-3"><div class="card-body"><div class="row g-2 align-items-end">
      <div class="col-md-4"><label class="form-label">من تاريخ</label><input type="date" id="storeFromDate" class="form-control"></div>
      <div class="col-md-4"><label class="form-label">إلى تاريخ</label><input type="date" id="storeToDate" class="form-control"></div>
      <div class="col-md-4"><button class="btn btn-primary w-100" id="storeApplyFilterBtn">تطبيق الفترة للتصدير</button></div>
    </div></div></div>
    <div class="export-options mt-2">
      <button type="button" class="btn btn-outline-success export-btn" data-type="store" data-store="${storeId}" data-format="excel"><i class="fas fa-file-excel me-2"></i>تصدير Excel</button>
      <button type="button" class="btn btn-outline-secondary export-btn" data-type="store" data-store="${storeId}" data-format="txt"><i class="fas fa-file-alt me-2"></i>تصدير TXT</button>
      <button type="button" class="btn btn-outline-dark export-btn" data-type="store" data-store="${storeId}" data-format="json"><i class="fas fa-file-code me-2"></i>تصدير JSON</button>
      <button type="button" class="btn btn-outline-danger export-btn" data-type="store" data-store="${storeId}" data-format="pdf"><i class="fas fa-file-pdf me-2"></i>تصدير PDF</button>
      <button type="button" class="btn btn-outline-primary export-btn" data-type="store" data-store="${storeId}" data-format="printpage"><i class="fas fa-file-alt me-2"></i>فتح صفحة التقرير</button>
    </div>`;
  const salesTable = document.getElementById('storeSalesTable'); salesTable.innerHTML = '';
  sales.forEach(sale => {
    const pkg = sale.packageId ? data.packages.find(p => p.id === sale.packageId) : null;
    const isCustom = sale.packageId === 'custom';
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${sale.date}</td>
      <td>${sale.reason || (pkg ? pkg.name : 'غير معروف')}</td>
      <td>${isCustom ? ('<span class="currency">' + formatNumber(sale.amount) + '</span>') : sale.quantity}</td>
      <td class="currency">${formatNumber(sale.total)}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-sale" data-id="${sale.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-sale" data-id="${sale.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    salesTable.appendChild(row);
  });
  const paymentsTable = document.getElementById('storePaymentsTable'); paymentsTable.innerHTML = '';
  payments.forEach(payment => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${payment.date}</td>
      <td class="currency">${formatNumber(payment.amount)}</td>
      <td>${payment.notes || ''}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-payment" data-id="${payment.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-payment" data-id="${payment.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    paymentsTable.appendChild(row);
  });
  document.getElementById('addSaleBtn').addEventListener('click', () => addSale(storeId));
  document.getElementById('addPaymentBtn').addEventListener('click', () => addPayment(storeId));
  document.querySelector('.edit-store').addEventListener('click', () => editStore(storeId));
  document.querySelector('.delete-store').addEventListener('click', () => deleteStore(storeId));
  document.querySelectorAll('.edit-sale').forEach(btn => { btn.addEventListener('click', () => editSale(btn.dataset.id)); });
  document.querySelectorAll('.delete-sale').forEach(btn => { btn.addEventListener('click', () => deleteSale(btn.dataset.id)); });
  document.querySelectorAll('.edit-payment').forEach(btn => { btn.addEventListener('click', () => editPayment(btn.dataset.id)); });
  document.querySelectorAll('.delete-payment').forEach(btn => { btn.addEventListener('click', () => deletePayment(btn.dataset.id)); });
}

function addStore() {
  document.getElementById('storeModalTitle').textContent = 'إضافة محل جديد';
  document.getElementById('storeId').value = '';
  document.getElementById('storeName').value = '';
  document.getElementById('storePriceType').value = 'retail';
  document.getElementById('storeDate').value = today;
  const modal = new bootstrap.Modal(document.getElementById('storeModal')); modal.show();
}

function editStore(id) {
  const store = data.stores.find(s => s.id === id); if (!store) return;
  document.getElementById('storeModalTitle').textContent = 'تعديل المحل';
  document.getElementById('storeId').value = store.id;
  document.getElementById('storeName').value = store.name;
  document.getElementById('storePriceType').value = store.priceType;
  document.getElementById('storeDate').value = store.createdAt || today;
  const modal = new bootstrap.Modal(document.getElementById('storeModal')); modal.show();
}

function deleteStore(id) {
  if (!confirm('هل أنت متأكد من حذف هذا المحل؟')) return;
  const store = data.stores.find(s => s.id === id);
  data.stores = data.stores.filter(s => s.id !== id);
  saveData();
  (async()=>{ try{ if (store && typeof addToTrash==='function') await addToTrash('stores', store); }catch{}; renderStoresList(); updateDashboard(); updateProfitReport(); })();
  showNotification('تم حذف المحل بنجاح', 'success');
}

function saveStore() {
  const id = document.getElementById('storeId').value;
  const name = document.getElementById('storeName').value;
  const priceType = document.getElementById('storePriceType').value;
  const date = document.getElementById('storeDate').value || today;
  if (!name) { showNotification('يرجى إدخال اسم المحل', 'error'); return; }
  if (id) {
    const store = data.stores.find(s => s.id === id);
    if (store) { store.name = name; store.priceType = priceType; store.createdAt = date; }
    showNotification('تم تحديث المحل بنجاح', 'success');
  } else {
    const newId = 'store_' + Date.now();
    data.stores.push({ id: newId, name, priceType, createdAt: date });
    showNotification('تم إضافة المحل بنجاح', 'success');
  }
  saveData();
  renderStoresList();
  updateDashboard();
  updateReportStores();
  generateDebtReport();
  const modal = bootstrap.Modal.getInstance(document.getElementById('storeModal')); modal.hide();
}

// تم نقل دالة exportStoreData إلى reports.js لتجنب التكرار

// اختصارات سريعة لانتقاء المحل قبل البيع/التسديد
(function () {
  let nextAction = null; // 'sale' | 'payment'
  const selectStoreModalEl = document.getElementById('selectStoreModal');
  const selectStoreModal = selectStoreModalEl ? new bootstrap.Modal(selectStoreModalEl) : null;
  function openSelectStore(actionType) {
    if (!selectStoreModal) return;
    nextAction = actionType;
    const sel = document.getElementById('selectStoreSelect'); sel.innerHTML = '';
    if (data.stores.length === 0) { const opt = document.createElement('option'); opt.value = ''; opt.textContent = 'لا توجد محلات، أضف محلًا أولاً'; sel.appendChild(opt); }
    else { data.stores.forEach(s => { const opt = document.createElement('option'); opt.value = s.id; opt.textContent = s.name; sel.appendChild(opt); }); }
    selectStoreModal.show();
  }
  const confirmBtn = document.getElementById('confirmSelectStoreBtn');
  if (confirmBtn) confirmBtn.addEventListener('click', () => {
    const sel = document.getElementById('selectStoreSelect'); const storeId = sel.value;
    if (!storeId) { showNotification('يرجى اختيار محل', 'error'); return; }
    selectStoreModal.hide();
    if (nextAction === 'sale') addSale(storeId); else if (nextAction === 'payment') addPayment(storeId);
    nextAction = null;
  });
  const qa = { sale: document.getElementById('qaAddSale'), payment: document.getElementById('qaAddPayment'), inventory: document.getElementById('qaAddInventory'), expense: document.getElementById('qaAddExpense'), store: document.getElementById('qaAddStore'), pkg: document.getElementById('qaAddPackage') };
  if (qa.sale) qa.sale.addEventListener('click', () => openSelectStore('sale'));
  if (qa.payment) qa.payment.addEventListener('click', () => openSelectStore('payment'));
  if (qa.inventory) qa.inventory.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="inventory"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('inventory').style.display = 'block';
    document.querySelector('.page-title').textContent = 'كمية الكروت';
    addInventory();
  });
  if (qa.expense) qa.expense.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="expenses"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('expenses').style.display = 'block';
    document.querySelector('.page-title').textContent = 'المصروفات';
    addExpense();
  });
  if (qa.store) qa.store.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="stores"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('stores').style.display = 'block';
    document.querySelector('.page-title').textContent = 'البقالات والمحلات';
    addStore();
  });
  if (qa.pkg) qa.pkg.addEventListener('click', () => {
    document.querySelectorAll('.sidebar .nav-link').forEach(l => l.classList.remove('active'));
    document.querySelector('[data-section="packages"]').classList.add('active');
    document.querySelectorAll('.section').forEach(s => s.style.display = 'none');
    document.getElementById('packages').style.display = 'block';
    document.querySelector('.page-title').textContent = 'الباقات والأسعار';
    addPackage();
  });
})();