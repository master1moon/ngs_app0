// ملف JavaScript الرئيسي - تم استخراجه من index.html

// تهيئة التواريخ باللغة العربية
moment.locale('ar');

// متغيرات عامة
const today = moment().format('YYYY-MM-DD');

// هياكل البيانات الأساسية
let data = {
    packages: [],
    inventory: [],
    stores: [],
    expenses: [],
    sales: [],
    payments: [],
    trash: []
};

// دالة تحديث التاريخ الحالي
function updateCurrentDate() {
    const currentDateEl = document.getElementById('currentDate');
    const currentMonthEl = document.getElementById('currentMonth');
    
    if (currentDateEl) {
        currentDateEl.textContent = toEnglishDigits(moment().format('YYYY-MM-DD'));
    }
    
    if (currentMonthEl) {
        currentMonthEl.textContent = toEnglishDigits(moment().format('MMMM'));
    }
}

// تهيئة التطبيق عند التحميل
document.addEventListener('DOMContentLoaded', function() {
    // تحديث التاريخ
    updateCurrentDate();
    
    // تحميل البيانات
    if (typeof loadData === 'function') {
        loadData();
    }
    
    // تأكد من توفر دوال التصدير بعد تحميل جميع الملفات
    setTimeout(() => {
        // نسخ الدوال إلى النطاق العام إذا لم تكن متاحة
        if (!window.exportStoreData && typeof exportStoreData !== 'undefined') {
            window.exportStoreData = exportStoreData;
        }
        if (!window.exportExpensesData && typeof exportExpensesData !== 'undefined') {
            window.exportExpensesData = exportExpensesData;
        }
        
        console.log('فحص دوال التصدير:', {
            exportStoreData: typeof window.exportStoreData,
            exportExpensesData: typeof window.exportExpensesData,
            exportReportsData: typeof exportReportsData
        });
    }, 500);
    
    // تقرير الديون
    if (typeof generateDebtReport === 'function') {
        generateDebtReport();
    }
    
    // تقارير الشركاء
    if (typeof generatePartnerReports === 'function') {
        generatePartnerReports();
    }
    
    // تحديث لوحة التحكم
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    // إعداد حقول المدخلات المنسقة
    if (typeof setupFormattedInputs === 'function') {
        setupFormattedInputs();
    }
});

// إعداد معالجات الأحداث للروابط الجانبية
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.sidebar .nav-link, #mobileDrawer .nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const section = this.getAttribute('data-section');
            if (typeof switchSection === 'function') {
                switchSection(section);
            }
        });
    });
    
    // معالج تغيير فترة لوحة التحكم
    const dashboardPeriod = document.getElementById('dashboardPeriod');
    if (dashboardPeriod) {
        dashboardPeriod.addEventListener('change', function() {
            if (typeof updateDashboard === 'function') {
                updateDashboard();
            }
        });
    }
    
    // معالج تغيير نوع التقرير
    const reportType = document.getElementById('reportType');
    if (reportType) {
        reportType.addEventListener('change', function() {
            if (typeof updateProfitReport === 'function') {
                updateProfitReport();
            }
        });
    }
});

// إعداد معالجات الأحداث للأزرار
document.addEventListener('DOMContentLoaded', function() {
    // زر إضافة باقة
    const addPackageBtn = document.getElementById('addPackageBtn');
    if (addPackageBtn) {
        addPackageBtn.addEventListener('click', function() {
            if (typeof addPackage === 'function') {
                addPackage();
            }
        });
    }
    
    // زر إضافة كمية
    const addInventoryBtn = document.getElementById('addInventoryBtn');
    if (addInventoryBtn) {
        addInventoryBtn.addEventListener('click', function() {
            if (typeof addInventory === 'function') {
                addInventory();
            }
        });
    }
    
    // زر إضافة محل
    const addStoreBtn = document.getElementById('addStoreBtn');
    if (addStoreBtn) {
        addStoreBtn.addEventListener('click', function() {
            if (typeof addStore === 'function') {
                addStore();
            }
        });
    }
    
    // زر إضافة مصروف
    const addExpenseBtn = document.getElementById('addExpenseBtn');
    if (addExpenseBtn) {
        addExpenseBtn.addEventListener('click', function() {
            if (typeof addExpense === 'function') {
                addExpense();
            }
        });
    }
});

// معالج النقر على أزرار التصدير
document.body.addEventListener('click', function(e) {
    const btn = e.target.closest && e.target.closest('.export-btn');
    if (!btn) return;
    
    const type = btn.getAttribute('data-type');
    const format = btn.getAttribute('data-format');
    const storeId = btn.getAttribute('data-store') || '';
    
    console.log('تصدير:', { type, format, storeId });
    
    if (type === 'expenses') {
        if (typeof exportExpensesData === 'function') {
            exportExpensesData(format);
        } else {
            console.error('دالة exportExpensesData غير موجودة');
            showNotification('خطأ: دالة التصدير غير متوفرة', 'error');
        }
    } else if (type === 'reports') {
        if (typeof exportReportsData === 'function') {
            exportReportsData(format);
        } else {
            console.error('دالة exportReportsData غير موجودة');
            showNotification('خطأ: دالة التصدير غير متوفرة', 'error');
        }
    } else if (type === 'store') {
        if (typeof exportStoreData === 'function') {
            exportStoreData(storeId, format);
        } else if (window.exportStoreData) {
            window.exportStoreData(storeId, format);
        } else {
            console.error('دالة exportStoreData غير موجودة');
            showNotification('خطأ: دالة التصدير غير متوفرة', 'error');
        }
    }
}, false);

// تصدير المتغيرات والدوال العامة
window.data = data;
window.today = today;