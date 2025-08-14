// إدارة الباقات
function renderPackagesTable() {
  const table = document.getElementById('packagesTable');
  if (!table) return; table.innerHTML = '';
  data.packages.forEach(pkg => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${pkg.name}</td>
      <td class="currency">${pkg.retailPrice ? formatNumber(pkg.retailPrice) : '-'}</td>
      <td class="currency">${pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '-'}</td>
      <td class="currency">${pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '-'}</td>
      <td>${pkg.createdAt}</td>
      <td class="action-buttons">
        <button class="btn btn-sm btn-warning edit-package" data-id="${pkg.id}"><i class="fas fa-edit"></i></button>
        <button class="btn btn-sm btn-danger delete-package" data-id="${pkg.id}"><i class="fas fa-trash"></i></button>
      </td>`;
    table.appendChild(row);
  });
  document.querySelectorAll('.edit-package').forEach(btn => { btn.addEventListener('click', () => editPackage(btn.dataset.id)); });
  document.querySelectorAll('.delete-package').forEach(btn => { btn.addEventListener('click', () => deletePackage(btn.dataset.id)); });
}

function addPackage() {
  document.getElementById('packageModalTitle').textContent = 'إضافة باقة جديدة';
  document.getElementById('packageId').value = '';
  document.getElementById('packageName').value = '';
  document.getElementById('retailPrice').value = '';
  document.getElementById('wholesalePrice').value = '';
  document.getElementById('distributorPrice').value = '';
  document.getElementById('packageDate').value = today;
  const modal = new bootstrap.Modal(document.getElementById('packageModal')); modal.show();
}

function editPackage(id) {
  const pkg = data.packages.find(p => p.id === id); if (!pkg) return;
  document.getElementById('packageModalTitle').textContent = 'تعديل الباقة';
  document.getElementById('packageId').value = pkg.id;
  document.getElementById('packageName').value = pkg.name;
  document.getElementById('retailPrice').value = pkg.retailPrice ? formatNumber(pkg.retailPrice) : '';
  document.getElementById('wholesalePrice').value = pkg.wholesalePrice ? formatNumber(pkg.wholesalePrice) : '';
  document.getElementById('distributorPrice').value = pkg.distributorPrice ? formatNumber(pkg.distributorPrice) : '';
  document.getElementById('packageDate').value = pkg.createdAt || today;
  const modal = new bootstrap.Modal(document.getElementById('packageModal')); modal.show();
}

function deletePackage(id) {
  if (!confirm('هل أنت متأكد من حذف هذه الباقة؟')) return;
  const pkg = data.packages.find(p => p.id === id);
  data.packages = data.packages.filter(p => p.id !== id);
  saveData();
  (async()=>{ try{ if (pkg && typeof addToTrash==='function') await addToTrash('packages', pkg); }catch{}; renderPackagesTable(); updateDashboard(); })();
  showNotification('تم حذف الباقة بنجاح', 'success');
}

function savePackage() {
  const id = document.getElementById('packageId').value;
  const name = document.getElementById('packageName').value;
  const retailPrice = parseFormattedNumber(document.getElementById('retailPrice').value) || null;
  const wholesalePrice = parseFormattedNumber(document.getElementById('wholesalePrice').value) || null;
  const distributorPrice = parseFormattedNumber(document.getElementById('distributorPrice').value) || null;
  const date = document.getElementById('packageDate').value || today;
  if (!name) { showNotification('يرجى إدخال اسم الباقة', 'error'); return; }
  if (id) {
    const pkg = data.packages.find(p => p.id === id);
    if (pkg) {
      pkg.name = name; pkg.retailPrice = retailPrice; pkg.wholesalePrice = wholesalePrice; pkg.distributorPrice = distributorPrice; pkg.createdAt = date;
    }
    showNotification('تم تحديث الباقة بنجاح', 'success');
  } else {
    const newId = 'pkg_' + Date.now();
    data.packages.push({ id: newId, name, retailPrice, wholesalePrice, distributorPrice, createdAt: date });
    showNotification('تم إضافة الباقة بنجاح', 'success');
  }
  saveData();
  renderPackagesTable();
  updateDashboard();
  const modal = bootstrap.Modal.getInstance(document.getElementById('packageModal')); modal.hide();
}