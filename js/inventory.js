// إدارة المخزون
function getTotalInventoryForPackage(packageId) {
  return data.inventory
    .filter(item => item.packageId === packageId)
    .reduce((sum, item) => sum + (item.quantity || 0), 0);
}

function deductFromInventory(packageId, quantity) {
  const totalAvailable = getTotalInventoryForPackage(packageId);
  if (totalAvailable < quantity) return false;
  let remaining = quantity;
  for (const item of data.inventory) {
    if (item.packageId !== packageId) continue;
    const available = item.quantity || 0; if (available <= 0) continue;
    const toDeduct = Math.min(available, remaining);
    item.quantity = available - toDeduct;
    remaining -= toDeduct;
    if (remaining === 0) break;
  }
  return true;
}

function addToInventory(packageId, quantity) {
  const existing = data.inventory.find(i => i.packageId === packageId);
  if (existing) { existing.quantity = (existing.quantity || 0) + quantity; }
  else { data.inventory.push({ id: 'inv_' + Date.now(), packageId, quantity, createdAt: today }); }
}

function checkLowStockForPackage(packageId) {
  const total = getTotalInventoryForPackage(packageId);
  if (total < 200) {
    const pkg = data.packages.find(p => p.id === packageId);
    const name = pkg ? pkg.name : packageId;
    showNotification(`تحذير: مخزون الباقة "${name}" أقل من 200 كرت`, 'error');
  }
}

function renderInventoryTable() {
  const table = document.getElementById('inventoryTable');
  if (!table) return; table.innerHTML = '';
  data.inventory.forEach(item => {
    const pkg = data.packages.find(p => p.id === item.packageId); if (!pkg) return;
    const retailValue = item.quantity * (pkg.retailPrice || 0);
    const wholesaleValue = item.quantity * (pkg.wholesalePrice || 0);
    const distributorValue = item.quantity * (pkg.distributorPrice || 0);
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pkg.name}</td>
      <td>${formatNumber(item.quantity)}</td>
      <td class="currency">${formatNumber(retailValue)}</td>
      <td class="currency">${formatNumber(wholesaleValue)}</td>
      <td class="currency">${formatNumber(distributorValue)}</td>
      <td>${item.createdAt}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-inventory" data-id="${item.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-inventory" data-id="${item.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    table.appendChild(row);
  });
  document.querySelectorAll('.edit-inventory').forEach(btn => { btn.addEventListener('click', () => editInventory(btn.dataset.id)); });
  document.querySelectorAll('.delete-inventory').forEach(btn => { btn.addEventListener('click', () => deleteInventory(btn.dataset.id)); });
}

function addInventory() {
  const select = document.getElementById('inventoryPackage'); if (!select) return;
  select.innerHTML = '';
  data.packages.forEach(pkg => { const option = document.createElement('option'); option.value = pkg.id; option.textContent = pkg.name; select.appendChild(option); });
  document.getElementById('inventoryModalTitle').textContent = 'إضافة كمية جديدة';
  document.getElementById('inventoryId').value = '';
  document.getElementById('inventoryQuantity').value = '';
  document.getElementById('inventoryDate').value = today;
  const modal = new bootstrap.Modal(document.getElementById('inventoryModal')); modal.show();
}

function editInventory(id) {
  const item = data.inventory.find(i => i.id === id); if (!item) return;
  const select = document.getElementById('inventoryPackage'); if (!select) return;
  select.innerHTML = '';
  data.packages.forEach(pkg => { const option = document.createElement('option'); option.value = pkg.id; option.textContent = pkg.name; option.selected = pkg.id === item.packageId; select.appendChild(option); });
  document.getElementById('inventoryModalTitle').textContent = 'تعديل الكمية';
  document.getElementById('inventoryId').value = item.id;
  document.getElementById('inventoryQuantity').value = formatNumber(item.quantity);
  document.getElementById('inventoryDate').value = item.createdAt || today;
  const modal = new bootstrap.Modal(document.getElementById('inventoryModal')); modal.show();
}

function deleteInventory(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الكمية؟')) return;
  const inv = data.inventory.find(i => i.id === id);
  data.inventory = data.inventory.filter(i => i.id !== id);
  saveData();
  (async()=>{ try{ if (inv && typeof addToTrash==='function') await addToTrash('inventory', inv); }catch{}; renderInventoryTable(); updateDashboard(); })();
  showNotification('تم حذف الكمية بنجاح', 'success');
}

function saveInventory() {
  const id = document.getElementById('inventoryId').value;
  const packageId = document.getElementById('inventoryPackage').value;
  const quantity = parseFormattedNumber(document.getElementById('inventoryQuantity').value);
  const date = document.getElementById('inventoryDate').value || today;
  if (!packageId || isNaN(quantity) || quantity <= 0) { showNotification('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
  if (id) {
    const item = data.inventory.find(i => i.id === id);
    if (item) { item.packageId = packageId; item.quantity = quantity; item.createdAt = date; }
    showNotification('تم تحديث الكمية بنجاح', 'success');
  } else {
    const newId = 'inv_' + Date.now();
    data.inventory.push({ id: newId, packageId, quantity, createdAt: date });
    showNotification('تم إضافة الكمية بنجاح', 'success');
  }
  saveData();
  renderInventoryTable();
  updateDashboard();
  const modal = bootstrap.Modal.getInstance(document.getElementById('inventoryModal')); modal.hide();
}