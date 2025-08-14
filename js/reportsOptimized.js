// نسخة محسّنة من التقارير - بدون حلقات متداخلة

// التحقق من وجود الدوال المطلوبة
if (typeof inPeriod === 'undefined') {
    window.inPeriod = function(date, from, to) {
        if (!date) return false;
        return date >= from && date <= to;
    };
}

if (typeof formatNumber === 'undefined') {
    window.formatNumber = function(num) {
        if (num === null || num === undefined) return '';
        const n = Number(num) || 0;
        return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    };
}

if (typeof formatDateEn === 'undefined') {
    window.formatDateEn = function(date) {
        if (!date) return '';
        return new Date(date).toLocaleDateString('en-US');
    };
}

if (typeof getPeriodRange === 'undefined') {
    window.getPeriodRange = function() {
        const today = moment().format('YYYY-MM-DD');
        return { fromDate: moment().subtract(30, 'days').format('YYYY-MM-DD'), toDate: today };
    };
}

if (typeof getPartnersPeriodRange === 'undefined') {
    window.getPartnersPeriodRange = function() {
        return getPeriodRange();
    };
}

if (typeof getPartnersCount === 'undefined') {
    window.getPartnersCount = function() {
        return 2; // افتراضي
    };
}

if (typeof getPriceTypeName === 'undefined') {
    window.getPriceTypeName = function(priceType) {
        switch (priceType) {
            case 'retail': return 'تجزئة';
            case 'wholesale': return 'جملة';
            case 'distributor': return 'موزعين';
            default: return 'غير معروف';
        }
    };
}

if (typeof buildPartnerReportHTML === 'undefined') {
    window.buildPartnerReportHTML = function(data) {
        return `
            <div class="partner-report-card">
                <h5>تقرير الشركاء</h5>
                <p>صافي الربح: ${formatNumber(data.netProfit)}</p>
                <p>عدد الشركاء: ${data.partners}</p>
                <p>نصيب كل شريك: ${formatNumber(data.perPartner)}</p>
            </div>
        `;
    };
}

// كاش للحسابات المتكررة
const calculationCache = new Map();
const CACHE_TTL = 5000; // 5 ثواني

// دالة لإنشاء مفتاح الكاش
function getCacheKey(type, fromDate, toDate, storeFilter) {
    return `${type}_${fromDate}_${toDate}_${storeFilter || 'all'}`;
}

// دالة للحصول على البيانات مع الكاش
function getCachedData(key, calculator) {
    const cached = calculationCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.data;
    }
    
    const data = calculator();
    calculationCache.set(key, { data, timestamp: Date.now() });
    return data;
}

// تحسين حساب الديون - بدون حلقات متداخلة
function calculateDebtsOptimized(fromDate, toDate, storeFilter = 'all') {
    const key = getCacheKey('debts', fromDate, toDate, storeFilter);
    
    return getCachedData(key, () => {
        const d = window.data || {};
        
        // إنشاء Map للوصول السريع
        const salesByStore = new Map();
        const paymentsByStore = new Map();
        
        // تجميع المبيعات حسب المحل في مرور واحد
        (d.sales || []).forEach(sale => {
            if (inPeriod(sale.date, fromDate, toDate)) {
                const storeId = sale.storeId;
                const current = salesByStore.get(storeId) || 0;
                salesByStore.set(storeId, current + (sale.total || 0));
            }
        });
        
        // تجميع المدفوعات حسب المحل في مرور واحد
        (d.payments || []).forEach(payment => {
            if (inPeriod(payment.date, fromDate, toDate)) {
                const storeId = payment.storeId;
                const current = paymentsByStore.get(storeId) || 0;
                paymentsByStore.set(storeId, current + (payment.amount || 0));
            }
        });
        
        // حساب الديون لكل محل
        const debts = [];
        let totalDebts = 0;
        
        (d.stores || []).forEach(store => {
            if (storeFilter !== 'all' && String(store.id) !== String(storeFilter)) {
                return;
            }
            
            const storeSales = salesByStore.get(store.id) || 0;
            const storePayments = paymentsByStore.get(store.id) || 0;
            const debt = storeSales - storePayments;
            
            debts.push({
                store,
                sales: storeSales,
                payments: storePayments,
                debt: debt
            });
            
            totalDebts += debt;
        });
        
        return { debts, totalDebts, salesByStore, paymentsByStore };
    });
}

// تحسين حساب الأرباح
function calculateProfitOptimized(fromDate, toDate, storeFilter = 'all') {
    const key = getCacheKey('profit', fromDate, toDate, storeFilter);
    
    return getCachedData(key, () => {
        const d = window.data || {};
        
        // Maps للحسابات السريعة
        const packagePrices = new Map();
        const packageCosts = new Map();
        
        // تحميل أسعار وتكاليف الباقات
        (d.packages || []).forEach(pkg => {
            packagePrices.set(pkg.id, {
                retail: pkg.retailPrice || 0,
                wholesale: pkg.wholesalePrice || 0,
                distributor: pkg.distributorPrice || 0
            });
            packageCosts.set(pkg.id, pkg.cost || 0);
        });
        
        let totalSales = 0;
        let totalCosts = 0;
        let totalPayments = 0;
        let totalExpenses = 0;
        
        // حساب المبيعات والتكاليف في مرور واحد
        (d.sales || []).forEach(sale => {
            if (!inPeriod(sale.date, fromDate, toDate)) return;
            if (storeFilter !== 'all' && String(sale.storeId) !== String(storeFilter)) return;
            
            totalSales += sale.total || 0;
            
            // حساب التكلفة
            if (sale.packageId) {
                const pkgCost = packageCosts.get(sale.packageId) || 0;
                const prices = packagePrices.get(sale.packageId);
                
                if (prices && sale.priceType === 'wholesale' && prices.wholesale) {
                    const quantity = Math.ceil((sale.total || 0) / prices.wholesale);
                    totalCosts += quantity * pkgCost;
                } else {
                    totalCosts += sale.cost || 0;
                }
            } else {
                totalCosts += sale.cost || 0;
            }
        });
        
        // حساب المدفوعات
        (d.payments || []).forEach(payment => {
            if (!inPeriod(payment.date, fromDate, toDate)) return;
            if (storeFilter !== 'all' && String(payment.storeId) !== String(storeFilter)) return;
            
            totalPayments += payment.amount || 0;
        });
        
        // حساب المصروفات
        (d.expenses || []).forEach(expense => {
            if (!inPeriod(expense.date, fromDate, toDate)) return;
            if (storeFilter !== 'all' && String(expense.storeId) !== String(storeFilter)) return;
            
            totalExpenses += expense.amount || 0;
        });
        
        const grossProfit = totalSales - totalCosts;
        const netProfit = totalPayments - totalExpenses;
        
        return {
            totalSales,
            totalCosts,
            totalPayments,
            totalExpenses,
            grossProfit,
            netProfit
        };
    });
}

// تحديث لوحة التحكم المحسّنة
function updateDashboardOptimized() {
    const { fromDate, toDate } = getPeriodRange();
    const storeFilter = (document.getElementById('reportsStoreFilter')?.value) || 'all';
    
    // الحصول على البيانات المحسوبة
    const debtData = calculateDebtsOptimized(fromDate, toDate, storeFilter);
    const profitData = calculateProfitOptimized(fromDate, toDate, storeFilter);
    
    // تحديث العناصر دفعة واحدة
    if (window.$dom && window.$dom.update) {
        window.$dom.update([
            { element: 'totalSales', property: 'textContent', value: formatNumber(profitData.totalSales) },
            { element: 'totalPaymentsSum', property: 'textContent', value: formatNumber(profitData.totalPayments) },
            { element: 'totalDebtsSum', property: 'textContent', value: formatNumber(debtData.totalDebts) },
            { element: 'totalExpensesSum', property: 'textContent', value: formatNumber(profitData.totalExpenses) },
            { element: 'netProfit', property: 'textContent', value: formatNumber(profitData.netProfit) }
        ]);
    } else {
        // التحديث التقليدي
        const updateElement = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.textContent = formatNumber(value);
        };
        
        updateElement('totalSales', profitData.totalSales);
        updateElement('totalPaymentsSum', profitData.totalPayments);
        updateElement('totalDebtsSum', debtData.totalDebts);
        updateElement('totalExpensesSum', profitData.totalExpenses);
        updateElement('netProfit', profitData.netProfit);
    }
}

// تحسين تقرير الديون
function generateDebtReportOptimized() {
    const table = document.getElementById('debtReportTable');
    if (!table) return;
    
    const { fromDate, toDate } = getPeriodRange();
    const storeFilter = (document.getElementById('reportsStoreFilter')?.value) || 'all';
    
    // الحصول على البيانات المحسوبة
    const { debts, totalDebts } = calculateDebtsOptimized(fromDate, toDate, storeFilter);
    
    // إنشاء Map لآخر المعاملات
    const lastTransactions = new Map();
    
    // حساب آخر المعاملات في مرور واحد
    const d = window.data || {};
    
    // آخر مبيعة لكل محل
    (d.sales || []).forEach(sale => {
        if (inPeriod(sale.date, fromDate, toDate)) {
            const current = lastTransactions.get(sale.storeId) || { sale: '', payment: '' };
            if (!current.sale || sale.date > current.sale) {
                current.sale = sale.date;
            }
            lastTransactions.set(sale.storeId, current);
        }
    });
    
    // آخر دفعة لكل محل
    (d.payments || []).forEach(payment => {
        if (inPeriod(payment.date, fromDate, toDate)) {
            const current = lastTransactions.get(payment.storeId) || { sale: '', payment: '' };
            if (!current.payment || payment.date > current.payment) {
                current.payment = payment.date;
            }
            lastTransactions.set(payment.storeId, current);
        }
    });
    
    // تحديث الإجمالي
    const totalDebtsEl = document.getElementById('totalDebts');
    if (totalDebtsEl) totalDebtsEl.textContent = formatNumber(totalDebts);
    
    // إنشاء الجدول باستخدام DocumentFragment
    const fragment = document.createDocumentFragment();
    
    debts.forEach(({ store, sales, payments, debt }) => {
        const trans = lastTransactions.get(store.id) || { sale: '', payment: '' };
        const lastDate = trans.sale > trans.payment ? trans.sale : trans.payment;
        const lastTransaction = formatDateEn(lastDate);
        
        const row = document.createElement('tr');
        
        // استخدام الطريقة الآمنة لإنشاء الخلايا
        if (window.$safe && window.$safe.row) {
            const cells = window.$safe.row([
                store.name,
                { text: formatNumber(sales), className: 'currency' },
                { text: formatNumber(payments), className: 'currency' },
                { text: formatNumber(Math.abs(debt)), className: `currency ${debt > 0 ? 'text-danger' : 'text-success'}` },
                getPriceTypeName(store.priceType),
                lastTransaction || 'لا يوجد'
            ]);
            fragment.appendChild(cells);
        } else {
            // الطريقة التقليدية
            const cells = [
                store.name,
                formatNumber(sales),
                formatNumber(payments),
                formatNumber(Math.abs(debt)),
                getPriceTypeName(store.priceType),
                lastTransaction || 'لا يوجد'
            ];
            
            cells.forEach((content, index) => {
                const td = document.createElement('td');
                td.textContent = content;
                
                if (index === 1 || index === 2) {
                    td.className = 'currency';
                } else if (index === 3) {
                    td.className = `currency ${debt > 0 ? 'text-danger' : 'text-success'}`;
                }
                
                row.appendChild(td);
            });
            
            fragment.appendChild(row);
        }
    });
    
    // تحديث الجدول مرة واحدة
    table.innerHTML = '';
    table.appendChild(fragment);
}

// تحسين تقارير الشركاء
function generatePartnerReportsOptimized() {
    const container = document.getElementById('partnerReportsContainer');
    if (!container) return;
    
    const { fromDate, toDate } = getPartnersPeriodRange();
    const storeFilter = (document.getElementById('reportsStoreFilter')?.value) || 'all';
    
    // الحصول على البيانات المحسوبة
    const profitData = calculateProfitOptimized(fromDate, toDate, storeFilter);
    
    const partners = getPartnersCount();
    const perPartner = profitData.netProfit / partners;
    
    // إنشاء التقرير باستخدام template literals آمنة
    const reportHTML = buildPartnerReportHTML({
        fromDate,
        toDate,
        totalPayments: profitData.totalPayments,
        totalExpenses: profitData.totalExpenses,
        netProfit: profitData.netProfit,
        partners,
        perPartner
    });
    
    container.innerHTML = reportHTML;
}

// تصدير الدوال المحسّنة
if (typeof window !== 'undefined') {
    window.updateDashboardOptimized = updateDashboardOptimized;
    window.generateDebtReportOptimized = generateDebtReportOptimized;
    window.generatePartnerReportsOptimized = generatePartnerReportsOptimized;
    window.calculateDebtsOptimized = calculateDebtsOptimized;
    window.calculateProfitOptimized = calculateProfitOptimized;
    
    // استبدال الدوال القديمة
    window.updateDashboard = updateDashboardOptimized;
    window.generateDebtReport = generateDebtReportOptimized;
    window.generatePartnerReports = generatePartnerReportsOptimized;
}