// رقمية: تحويل الأرقام العربية/الفارسية إلى إنجليزية
function toEnglishDigits(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/[\u0660-\u0669]/g, d => String(d.charCodeAt(0) - 0x0660))
    .replace(/[\u06F0-\u06F9]/g, d => String(d.charCodeAt(0) - 0x06F0));
}

// تنسيق الأرقام بفواصل إنجليزية دائمًا
function formatNumber(num) {
  if (num === null || num === undefined) return '';
  const n = Number(toEnglishDigits(num)) || 0;
  return n.toLocaleString('en-US');
}

// تحليل الأرقام المنسقة مع دعم الأرقام العربية
function parseFormattedNumber(str) {
  if (!str) return 0;
  const eng = toEnglishDigits(str);
  return parseFloat(eng.replace(/,/g, '')) || 0;
}

// تنسيق التاريخ إلى YYYY-MM-DD بأرقام إنجليزية دائمًا
function formatDateEn(dateStr) {
  if (!dateStr) return '';
  const raw = toEnglishDigits(dateStr).slice(0, 10);
  try {
    if (typeof moment !== 'undefined') {
      const m = moment(raw, [moment.ISO_8601, 'YYYY-MM-DD', 'YYYY-M-D', 'DD/MM/YYYY', 'D/M/YYYY'], true);
      if (m.isValid()) return m.format('YYYY-MM-DD');
    }
  } catch (_) {}
  // fallback: simple cleanup
  const m = /^\d{4}-\d{1,2}-\d{1,2}$/.test(raw) ? raw : raw.replace(/\D/g, '').replace(/(\d{4})(\d{2})(\d{2}).*/, '$1-$2-$3');
  return m;
}

// تطبيق تنسيق الأرقام على جميع حقول الإدخال ذات الصنف formatted-input
function setupFormattedInputs() {
  document.querySelectorAll('.formatted-input').forEach(input => {
    input.addEventListener('focus', function () {
      this.value = toEnglishDigits(this.value).replace(/,/g, '');
    });

    input.addEventListener('input', function () {
      const original = this.value;
      const caret = this.selectionStart || 0;
      let plain = toEnglishDigits(original);
      const isNegative = /^-/.test(plain);
      plain = plain.replace(/[^0-9.]/g, '');
      const parts = plain.split('.');
      if (parts.length > 2) {
        plain = parts[0] + '.' + parts.slice(1).join('');
      }
      const leftText = toEnglishDigits(original.slice(0, caret));
      const leftDigitsCount = (leftText.match(/[0-9]/g) || []).length;
      let numberPart = parts[0];
      numberPart = numberPart.replace(/^0+(\d)/, '$1');
      const formattedInt = Number(numberPart || 0).toLocaleString('en-US');
      const decimalPart = parts.length > 1 ? '.' + parts[1] : '';
      const formatted = (isNegative ? '-' : '') + formattedInt + decimalPart;
      if (formatted !== this.value) this.value = formatted;
      let newCaret = 0, seenDigits = 0;
      const val = this.value;
      for (let i = 0; i < val.length; i++) {
        if (/[0-9]/.test(val[i])) {
          seenDigits++;
          if (seenDigits >= leftDigitsCount) { newCaret = i + 1; break; }
        } else if (val[i] === '.' && leftText.includes('.')) {
          const leftDotIndex = leftText.indexOf('.');
          const digitsBeforeDot = (leftText.slice(0, leftDotIndex).match(/[0-9]/g) || []).length;
          if (leftDigitsCount === digitsBeforeDot) { newCaret = i + 1; break; }
        }
      }
      if (!newCaret) newCaret = this.value.length;
      this.setSelectionRange(newCaret, newCaret);
    });

    input.addEventListener('blur', function () {
      const num = parseFormattedNumber(this.value);
      this.value = num ? formatNumber(num) : '';
    });
  });
}

// إشعارات بسيطة في أسفل الصفحة
function showNotification(message, type) {
  const notification = document.getElementById('notification');
  const notificationText = document.getElementById('notificationText');
  if (!notification || !notificationText) return;
  notificationText.textContent = message;
  notification.className = `notification ${type} show`;
  setTimeout(() => { notification.className = 'notification'; }, 3000);
}

// دالة موحدة للتنقل بين الأقسام وتفعيل الرابط النشط
function switchSection(targetSection, labelText) {
  const allLinks = document.querySelectorAll('.sidebar .nav-link, #mobileDrawer .nav-link');
  allLinks.forEach(l => l.classList.remove('active'));
  allLinks.forEach(l => { if (l.getAttribute('data-section') === targetSection) l.classList.add('active'); });
  document.querySelectorAll('.section').forEach(s => { s.style.display = 'none'; s.classList.remove('show'); });
  const sectionEl = document.getElementById(targetSection);
  if (sectionEl) { sectionEl.style.display = 'block'; setTimeout(() => sectionEl.classList.add('show'), 10); }
  const title = labelText || (document.querySelector(`.sidebar .nav-link[data-section="${targetSection}"]`)?.textContent.trim() || '');
  if (title) document.querySelector('.page-title').textContent = title;
  if (targetSection === 'reports') if (typeof generatePartnerReports === 'function') generatePartnerReports();
  if (targetSection === 'trash') if (typeof renderTrashTable === 'function') setTimeout(() => renderTrashTable(), 100);
}

// ضمان إظهار القسم الافتراضي حتى لو فشل تهيئة أخرى
document.addEventListener('DOMContentLoaded', function () {
  const currentVisible = document.querySelector('.section:not([style*="display: none"])') || document.getElementById('dashboard');
  if (currentVisible && !currentVisible.classList.contains('show')) {
    currentVisible.classList.add('show');
  }
});

// إجبار حقول التاريخ على الإنجليزية وترتيب LTR
document.addEventListener('DOMContentLoaded', function(){
  document.querySelectorAll('input[type="date"]').forEach(inp => {
    inp.setAttribute('lang', 'en');
    inp.style.direction = 'ltr';
    inp.placeholder = 'YYYY-MM-DD';
    // عند الإدخال/التغيير: طبيعـة التاريخ إلى أرقام إنجليزية وصيغة موحّدة
    const normalize = () => { if (inp.value) inp.value = formatDateEn(inp.value); };
    inp.addEventListener('change', normalize);
    inp.addEventListener('blur', normalize);
  });
});

// درج الجوال المخصص (مؤجل حتى اكتمال DOM)
document.addEventListener('DOMContentLoaded', function () {
  const toggleBtn = document.getElementById('mobileSidebarToggle');
  const closeBtn = document.getElementById('drawerClose');

  function openDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.add('open');
    if (backdrop) backdrop.classList.add('show');
    document.body.classList.add('drawer-open');
  }
  function closeDrawer() {
    const drawer = document.getElementById('mobileDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.remove('open');
    if (backdrop) backdrop.classList.remove('show');
    document.body.classList.remove('drawer-open');
  }

  if (toggleBtn) ['click', 'touchend'].forEach(ev => toggleBtn.addEventListener(ev, function (e) { e.preventDefault(); openDrawer(); }));

  const backdrop = document.getElementById('drawerBackdrop');
  if (backdrop) backdrop.addEventListener('click', closeDrawer);
  if (closeBtn) closeBtn.addEventListener('click', closeDrawer);

  const drawer = document.getElementById('mobileDrawer');
  if (drawer) {
    drawer.addEventListener('click', function (e) {
      const link = e.target.closest('a.nav-link');
      if (!link) return;
      closeDrawer();
      const targetSection = link.getAttribute('data-section');
      switchSection(targetSection, link.textContent.trim());
    });
  }

  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeDrawer(); });
  window.addEventListener('resize', function () { if (window.innerWidth >= 769) closeDrawer(); });
});

function setTextSafe(el, text){ if (el) el.textContent = text; }

// تصدير الدوال للنطاق العام
if (typeof window !== 'undefined') {
  window.toEnglishDigits = toEnglishDigits;
  window.formatNumber = formatNumber;
  window.parseFormattedNumber = parseFormattedNumber;
  window.formatDateEn = formatDateEn;
  window.showNotification = showNotification;
  window.switchSection = switchSection;
}