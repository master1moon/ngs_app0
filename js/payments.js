// إدارة التسديدات
function addPayment(storeId) {
  document.getElementById('paymentModalTitle').textContent = 'إضافة تسديد';
  document.getElementById('paymentId').value = '';
  document.getElementById('paymentStoreId').value = storeId;
  document.getElementById('paymentAmount').value = '';
  document.getElementById('paymentNotes').value = '';
  document.getElementById('paymentDate').value = today;
  const modal = new bootstrap.Modal(document.getElementById('paymentModal')); modal.show();
}

function savePayment() {
  const id = document.getElementById('paymentId').value;
  const storeId = document.getElementById('paymentStoreId').value;
  const amount = parseFormattedNumber(document.getElementById('paymentAmount').value);
  const notes = document.getElementById('paymentNotes').value;
  const date = document.getElementById('paymentDate').value || today;
  if (!storeId || isNaN(amount) || amount <= 0) { showNotification('يرجى ملء جميع الحقول المطلوبة', 'error'); return; }
  if (id) {
    const payment = data.payments.find(p => p.id === id);
    if (payment) { payment.amount = amount; payment.notes = notes; payment.date = date; }
    showNotification('تم تحديث التسديد بنجاح', 'success');
  } else {
    const newId = 'payment_' + Date.now();
    data.payments.push({ id: newId, storeId, amount, notes, date });
    showNotification('تم إضافة التسديد بنجاح', 'success');
  }
  saveData();
  showStoreDetails(storeId);
  updateDashboard();
  updateProfitReport();
  generateDebtReport();
  const modal = bootstrap.Modal.getInstance(document.getElementById('paymentModal')); modal.hide();
}

function editPayment(id) {
  const payment = data.payments.find(p => p.id === id); if (!payment) return;
  document.getElementById('paymentModalTitle').textContent = 'تعديل التسديد';
  document.getElementById('paymentId').value = payment.id;
  document.getElementById('paymentStoreId').value = payment.storeId;
  document.getElementById('paymentAmount').value = formatNumber(payment.amount);
  document.getElementById('paymentNotes').value = payment.notes || '';
  document.getElementById('paymentDate').value = payment.date;
  const modal = new bootstrap.Modal(document.getElementById('paymentModal')); modal.show();
}

function deletePayment(id) {
  const payment = data.payments.find(p => p.id === id); if (!payment) return;
  if (!confirm('هل أنت متأكد من حذف هذا التسديد؟')) return;
  data.payments = data.payments.filter(p => p.id !== id);
  saveData();
  (async()=>{ try{ if (typeof addToTrash==='function') await addToTrash('payments', payment); }catch{}; showStoreDetails(payment.storeId); updateDashboard(); updateProfitReport(); generateDebtReport(); })();
  showNotification('تم حذف التسديد بنجاح', 'success');
}