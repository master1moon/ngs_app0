// نظام فلاتر التقارير المتقدم
(function() {
    'use strict';

    // حالة الفلاتر
    const filterState = {
        section: 'all',
        store: 'all',
        period: 'this_month',
        customFrom: null,
        customTo: null,
        comparison: false,
        groupBy: 'none', // none, store, type, date
        sortBy: 'date', // date, amount, store
        sortOrder: 'desc'
    };

    // بيانات الشركاء
    let partnersData = JSON.parse(localStorage.getItem('partnersData') || '[]');

    /**
     * تطبيق الفلاتر على البيانات
     * @param {Array} data - البيانات الأصلية
     * @param {string} dataType - نوع البيانات (sales, expenses, payments)
     * @returns {Array} البيانات المفلترة
     */
    function applyFilters(data, dataType) {
        if (!Array.isArray(data)) return [];
        
        let filtered = [...data];
        
        // فلتر المحل
        if (filterState.store !== 'all') {
            filtered = filtered.filter(item => {
                if (dataType === 'expenses') return true; // المصروفات ليست مرتبطة بمحل
                return item.storeId === filterState.store;
            });
        }
        
        // فلتر الفترة الزمنية
        const { fromDate, toDate } = getFilterDateRange();
        if (fromDate && toDate) {
            filtered = filtered.filter(item => {
                const itemDate = moment(item.date || item.createdAt);
                return itemDate.isSameOrAfter(fromDate) && itemDate.isSameOrBefore(toDate);
            });
        }
        
        // الترتيب
        filtered.sort((a, b) => {
            let compareValue = 0;
            
            switch (filterState.sortBy) {
                case 'date':
                    compareValue = moment(a.date || a.createdAt).diff(moment(b.date || b.createdAt));
                    break;
                case 'amount':
                    const amountA = a.amount || a.total || 0;
                    const amountB = b.amount || b.total || 0;
                    compareValue = amountA - amountB;
                    break;
                case 'store':
                    if (a.storeId && b.storeId) {
                        const storeA = data.stores?.find(s => s.id === a.storeId)?.name || '';
                        const storeB = data.stores?.find(s => s.id === b.storeId)?.name || '';
                        compareValue = storeA.localeCompare(storeB);
                    }
                    break;
            }
            
            return filterState.sortOrder === 'asc' ? compareValue : -compareValue;
        });
        
        return filtered;
    }

    /**
     * الحصول على نطاق التاريخ بناءً على الفلتر المحدد
     */
    function getFilterDateRange() {
        const now = moment();
        let fromDate = null;
        let toDate = null;
        
        switch (filterState.period) {
            case 'day':
                fromDate = now.clone().startOf('day');
                toDate = now.clone().endOf('day');
                break;
            case 'week':
                fromDate = now.clone().subtract(7, 'days').startOf('day');
                toDate = now.clone().endOf('day');
                break;
            case 'month':
                fromDate = now.clone().subtract(30, 'days').startOf('day');
                toDate = now.clone().endOf('day');
                break;
            case 'this_month':
                fromDate = now.clone().startOf('month');
                toDate = now.clone().endOf('month');
                break;
            case 'prev_month':
                fromDate = now.clone().subtract(1, 'month').startOf('month');
                toDate = now.clone().subtract(1, 'month').endOf('month');
                break;
            case 'custom':
                fromDate = filterState.customFrom ? moment(filterState.customFrom) : null;
                toDate = filterState.customTo ? moment(filterState.customTo) : null;
                break;
            case 'from_start':
                // لا نضع حدود
                break;
        }
        
        return { fromDate, toDate };
    }

    /**
     * تحديث جميع التقارير بناءً على الفلاتر
     */
    function updateAllReports() {
        const data = window.data || {};
        
        // تطبيق الفلاتر على كل نوع من البيانات
        const filteredSales = applyFilters(data.sales || [], 'sales');
        const filteredExpenses = applyFilters(data.expenses || [], 'expenses');
        const filteredPayments = applyFilters(data.payments || [], 'payments');
        
        // تحديث التقارير
        updateSummaryCards(filteredSales, filteredExpenses, filteredPayments);
        updateDetailedReports(filteredSales, filteredExpenses, filteredPayments);
        updateChartsAndGraphs(filteredSales, filteredExpenses, filteredPayments);
        
        // تحديث تقرير الشركاء
        updatePartnersReport(filteredSales, filteredExpenses, filteredPayments);
    }

    /**
     * تحديث بطاقات الملخص
     */
    function updateSummaryCards(sales, expenses, payments) {
        // حساب الإجماليات
        const totalSales = sales.reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalExpenses = expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalPayments = payments.reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const netProfit = totalPayments - totalExpenses;
        
        // تحديث العناصر
        safeUpdate('totalSalesReport', formatNumber(totalSales));
        safeUpdate('totalExpensesReport', formatNumber(totalExpenses));
        safeUpdate('totalPaymentsReport', formatNumber(totalPayments));
        safeUpdate('netProfitReport', formatNumber(netProfit));
        
        // تحديث لون صافي الربح
        const netProfitEl = document.getElementById('netProfitReport');
        if (netProfitEl) {
            netProfitEl.className = netProfit >= 0 ? 'currency text-success' : 'currency text-danger';
        }
    }

    /**
     * تحديث التقارير التفصيلية
     */
    function updateDetailedReports(sales, expenses, payments) {
        // تجميع البيانات حسب الفلتر المحدد
        if (filterState.groupBy !== 'none') {
            const groupedData = groupDataBy(
                [...sales, ...expenses, ...payments],
                filterState.groupBy
            );
            renderGroupedReport(groupedData);
        } else {
            // عرض التقارير العادية
            if (filterState.section === 'all' || filterState.section === 'sales') {
                renderSalesReport(sales);
            }
            if (filterState.section === 'all' || filterState.section === 'expenses') {
                renderExpensesReport(expenses);
            }
            if (filterState.section === 'all' || filterState.section === 'payments') {
                renderPaymentsReport(payments);
            }
        }
    }

    /**
     * تجميع البيانات حسب معيار محدد
     */
    function groupDataBy(data, groupBy) {
        const groups = {};
        
        data.forEach(item => {
            let key = '';
            
            switch (groupBy) {
                case 'store':
                    if (item.storeId) {
                        const store = window.data.stores?.find(s => s.id === item.storeId);
                        key = store ? store.name : 'غير محدد';
                    } else {
                        key = 'عام';
                    }
                    break;
                case 'type':
                    if (item.type) {
                        key = item.type;
                    } else if (item.packageId) {
                        key = 'مبيعات';
                    } else if (item.storeId && !item.packageId) {
                        key = 'تسديدات';
                    }
                    break;
                case 'date':
                    key = moment(item.date || item.createdAt).format('YYYY-MM-DD');
                    break;
            }
            
            if (!groups[key]) {
                groups[key] = [];
            }
            groups[key].push(item);
        });
        
        return groups;
    }

    /**
     * إدارة الشركاء
     */
    function initPartnersManagement() {
        // إضافة واجهة إدارة الشركاء
        const partnersContainer = document.getElementById('partnerReportsCard');
        if (!partnersContainer) return;
        
        // إضافة قسم إدارة الشركاء
        const managementSection = document.createElement('div');
        managementSection.className = 'partners-management mb-3';
        managementSection.innerHTML = `
            <h6 class="mb-2">إدارة الشركاء</h6>
            <div class="row g-2 align-items-end">
                <div class="col-md-4">
                    <label class="form-label">اسم الشريك</label>
                    <input type="text" id="partnerName" class="form-control form-control-sm" placeholder="أدخل اسم الشريك">
                </div>
                <div class="col-md-3">
                    <label class="form-label">النسبة %</label>
                    <input type="number" id="partnerPercentage" class="form-control form-control-sm" min="0" max="100" step="0.01" placeholder="0.00">
                </div>
                <div class="col-md-2">
                    <button class="btn btn-sm btn-primary w-100" onclick="window.addPartner()">
                        <i class="fas fa-plus me-1"></i>إضافة
                    </button>
                </div>
            </div>
            <div class="partners-list mt-3" id="partnersList">
                <!-- قائمة الشركاء -->
            </div>
        `;
        
        // إدراج قسم الإدارة قبل التقرير
        const cardBody = partnersContainer.querySelector('.card-body');
        cardBody.insertBefore(managementSection, cardBody.firstChild);
        
        // عرض قائمة الشركاء
        renderPartnersList();
    }

    /**
     * إضافة شريك جديد
     */
    window.addPartner = function() {
        const nameInput = document.getElementById('partnerName');
        const percentageInput = document.getElementById('partnerPercentage');
        
        const name = nameInput.value.trim();
        const percentage = parseFloat(percentageInput.value) || 0;
        
        if (!name) {
            showNotification('يرجى إدخال اسم الشريك', 'error');
            return;
        }
        
        if (percentage <= 0 || percentage > 100) {
            showNotification('يرجى إدخال نسبة صحيحة بين 0 و 100', 'error');
            return;
        }
        
        // التحقق من مجموع النسب
        const totalPercentage = partnersData.reduce((sum, p) => sum + p.percentage, 0) + percentage;
        if (totalPercentage > 100) {
            showNotification('مجموع نسب الشركاء لا يمكن أن يتجاوز 100%', 'error');
            return;
        }
        
        // إضافة الشريك
        partnersData.push({
            id: 'partner_' + Date.now(),
            name: name,
            percentage: percentage,
            createdAt: new Date().toISOString()
        });
        
        // حفظ البيانات
        localStorage.setItem('partnersData', JSON.stringify(partnersData));
        
        // تنظيف الحقول
        nameInput.value = '';
        percentageInput.value = '';
        
        // تحديث العرض
        renderPartnersList();
        updatePartnersReport();
        
        showNotification('تم إضافة الشريك بنجاح', 'success');
    };

    /**
     * حذف شريك
     */
    window.deletePartner = function(partnerId) {
        if (!confirm('هل أنت متأكد من حذف هذا الشريك؟')) return;
        
        partnersData = partnersData.filter(p => p.id !== partnerId);
        localStorage.setItem('partnersData', JSON.stringify(partnersData));
        
        renderPartnersList();
        updatePartnersReport();
        
        showNotification('تم حذف الشريك بنجاح', 'success');
    };

    /**
     * عرض قائمة الشركاء
     */
    function renderPartnersList() {
        const container = document.getElementById('partnersList');
        if (!container) return;
        
        if (partnersData.length === 0) {
            container.innerHTML = '<p class="text-muted small">لا يوجد شركاء مضافين</p>';
            return;
        }
        
        const totalPercentage = partnersData.reduce((sum, p) => sum + p.percentage, 0);
        
        container.innerHTML = `
            <table class="table table-sm">
                <thead>
                    <tr>
                        <th>الشريك</th>
                        <th>النسبة</th>
                        <th>الإجراءات</th>
                    </tr>
                </thead>
                <tbody>
                    ${partnersData.map(partner => `
                        <tr>
                            <td>${escapeHtml(partner.name)}</td>
                            <td>${partner.percentage.toFixed(2)}%</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="window.deletePartner('${partner.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
                <tfoot>
                    <tr>
                        <th>المجموع</th>
                        <th class="${totalPercentage > 100 ? 'text-danger' : ''}">${totalPercentage.toFixed(2)}%</th>
                        <th></th>
                    </tr>
                </tfoot>
            </table>
        `;
    }

    /**
     * تحديث تقرير الشركاء
     */
    function updatePartnersReport(sales, expenses, payments) {
        const container = document.getElementById('partnerReportsContainer');
        if (!container || partnersData.length === 0) return;
        
        // حساب الأرباح
        const totalSales = (sales || []).reduce((sum, sale) => sum + (sale.total || 0), 0);
        const totalExpenses = (expenses || []).reduce((sum, expense) => sum + (expense.amount || 0), 0);
        const totalPayments = (payments || []).reduce((sum, payment) => sum + (payment.amount || 0), 0);
        const netProfit = totalPayments - totalExpenses;
        
        // حساب حصة كل شريك
        const partnersShares = partnersData.map(partner => ({
            ...partner,
            share: (netProfit * partner.percentage / 100)
        }));
        
        // عرض التقرير
        container.innerHTML = `
            <div class="table-responsive">
                <table class="table">
                    <thead>
                        <tr>
                            <th>الشريك</th>
                            <th>النسبة</th>
                            <th>الحصة من الأرباح</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partnersShares.map(partner => `
                            <tr>
                                <td>${escapeHtml(partner.name)}</td>
                                <td>${partner.percentage.toFixed(2)}%</td>
                                <td class="currency ${partner.share >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatNumber(Math.abs(partner.share))}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr class="table-light">
                            <th colspan="2">صافي الربح/الخسارة</th>
                            <th class="currency ${netProfit >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatNumber(Math.abs(netProfit))}
                            </th>
                        </tr>
                    </tfoot>
                </table>
            </div>
        `;
    }

    /**
     * تهيئة واجهة الفلاتر المتقدمة
     */
    function initAdvancedFilters() {
        const filtersContainer = document.getElementById('reportsFilters');
        if (!filtersContainer) return;
        
        // إضافة فلاتر متقدمة
        const advancedFilters = document.createElement('div');
        advancedFilters.className = 'row g-2 mt-2';
        advancedFilters.innerHTML = `
            <div class="col-12 col-md-auto">
                <label class="form-label mb-1">تجميع حسب</label>
                <select id="reportsGroupBy" class="form-select form-select-sm">
                    <option value="none">بدون تجميع</option>
                    <option value="store">المحل</option>
                    <option value="type">النوع</option>
                    <option value="date">التاريخ</option>
                </select>
            </div>
            <div class="col-12 col-md-auto">
                <label class="form-label mb-1">ترتيب حسب</label>
                <select id="reportsSortBy" class="form-select form-select-sm">
                    <option value="date">التاريخ</option>
                    <option value="amount">المبلغ</option>
                    <option value="store">المحل</option>
                </select>
            </div>
            <div class="col-12 col-md-auto">
                <label class="form-label mb-1">اتجاه الترتيب</label>
                <select id="reportsSortOrder" class="form-select form-select-sm">
                    <option value="desc">تنازلي</option>
                    <option value="asc">تصاعدي</option>
                </select>
            </div>
            <div class="col-12 col-md-auto">
                <label class="form-label mb-1">مقارنة</label>
                <div class="form-check mt-2">
                    <input type="checkbox" class="form-check-input" id="reportsComparison">
                    <label class="form-check-label" for="reportsComparison">
                        مقارنة مع الفترة السابقة
                    </label>
                </div>
            </div>
        `;
        
        filtersContainer.appendChild(advancedFilters);
        
        // ربط الأحداث
        bindFilterEvents();
    }

    /**
     * ربط أحداث الفلاتر
     */
    function bindFilterEvents() {
        // الفلاتر الأساسية
        const sectionFilter = document.getElementById('reportsSectionFilter');
        const storeFilter = document.getElementById('reportsStoreFilter');
        const periodFilter = document.getElementById('reportsPeriod');
        
        if (sectionFilter) {
            sectionFilter.addEventListener('change', (e) => {
                filterState.section = e.target.value;
                updateAllReports();
            });
        }
        
        if (storeFilter) {
            storeFilter.addEventListener('change', (e) => {
                filterState.store = e.target.value;
                updateAllReports();
            });
        }
        
        if (periodFilter) {
            periodFilter.addEventListener('change', (e) => {
                filterState.period = e.target.value;
                const customRange = document.getElementById('reportsCustomRange');
                if (customRange) {
                    customRange.style.display = e.target.value === 'custom' ? '' : 'none';
                }
                if (e.target.value !== 'custom') {
                    updateAllReports();
                }
            });
        }
        
        // الفلاتر المتقدمة
        const groupBy = document.getElementById('reportsGroupBy');
        const sortBy = document.getElementById('reportsSortBy');
        const sortOrder = document.getElementById('reportsSortOrder');
        const comparison = document.getElementById('reportsComparison');
        
        if (groupBy) {
            groupBy.addEventListener('change', (e) => {
                filterState.groupBy = e.target.value;
                updateAllReports();
            });
        }
        
        if (sortBy) {
            sortBy.addEventListener('change', (e) => {
                filterState.sortBy = e.target.value;
                updateAllReports();
            });
        }
        
        if (sortOrder) {
            sortOrder.addEventListener('change', (e) => {
                filterState.sortOrder = e.target.value;
                updateAllReports();
            });
        }
        
        if (comparison) {
            comparison.addEventListener('change', (e) => {
                filterState.comparison = e.target.checked;
                updateAllReports();
            });
        }
        
        // النطاق المخصص
        const applyCustom = document.getElementById('applyReportsCustomRange');
        if (applyCustom) {
            applyCustom.addEventListener('click', () => {
                filterState.customFrom = document.getElementById('reportsFromDate').value;
                filterState.customTo = document.getElementById('reportsToDate').value;
                updateAllReports();
            });
        }
    }

    /**
     * دالة مساعدة للهروب من HTML
     */
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * دالة مساعدة لتحديث العناصر بأمان
     */
    function safeUpdate(elementId, content) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = content;
        }
    }

    // التهيئة عند تحميل الصفحة
    document.addEventListener('DOMContentLoaded', () => {
        initAdvancedFilters();
        initPartnersManagement();
        updateAllReports();
    });

    // التصدير للنطاق العام
    window.advancedReportsFilters = {
        updateAllReports,
        filterState,
        partnersData
    };

})();