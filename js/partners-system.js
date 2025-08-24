// نظام إدارة الشركاء المحسّن
(function() {
    'use strict';

    // بيانات الشركاء المحفوظة
    let partnersData = JSON.parse(localStorage.getItem('partnersData') || '[]');

    /**
     * إضافة شريك جديد
     */
    window.addPartner = function() {
        const nameInput = document.getElementById('partnerName');
        const name = nameInput ? nameInput.value.trim() : '';
        
        if (!name) {
            showNotification('يرجى إدخال اسم الشريك', 'error');
            return;
        }
        
        // التحقق من عدم تكرار الاسم
        if (partnersData.some(p => p.name === name)) {
            showNotification('هذا الشريك موجود بالفعل', 'error');
            return;
        }
        
        // إضافة الشريك
        partnersData.push({
            id: 'partner_' + Date.now(),
            name: name,
            createdAt: new Date().toISOString()
        });
        
        // حفظ البيانات
        localStorage.setItem('partnersData', JSON.stringify(partnersData));
        
        // تنظيف الحقل
        if (nameInput) nameInput.value = '';
        
        // تحديث العرض
        renderPartnersList();
        generatePartnerReports();
        
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
        generatePartnerReports();
        
        showNotification('تم حذف الشريك بنجاح', 'success');
    };

    /**
     * عرض قائمة الشركاء
     */
    window.renderPartnersList = function() {
        const container = document.getElementById('partnersList');
        if (!container) return;
        
        if (partnersData.length === 0) {
            container.innerHTML = '<p class="text-muted small">لا يوجد شركاء مضافين - سيتم التوزيع بالتساوي حسب العدد المحدد</p>';
            return;
        }
        
        // حساب النسبة لكل شريك (توزيع متساوي)
        const percentagePerPartner = (100 / partnersData.length).toFixed(2);
        
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
                            <td>${percentagePerPartner}%</td>
                            <td>
                                <button class="btn btn-sm btn-danger" onclick="deletePartner('${partner.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    };

    /**
     * توليد تقرير الشركاء المحسّن
     */
    window.generatePartnerReportsEnhanced = function() {
        const container = document.getElementById('partnerReportsContainer');
        if (!container) return;
        
        // الحصول على البيانات المفلترة
        const { fromDate, toDate, text } = getPartnersPeriodRange();
        const storeFilter = (document.getElementById('reportsStoreFilter')?.value) || 'all';
        const byStore = x => (storeFilter === 'all') ? true : String(x.storeId || '') === String(storeFilter);
        
        const filteredPayments = (data.payments || []).filter(p => inPeriod(p.date, fromDate, toDate) && byStore(p));
        const filteredExpenses = (data.expenses || []).filter(e => inPeriod(e.date, fromDate, toDate));
        
        const totalPayments = filteredPayments.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const totalExpenses = filteredExpenses.reduce((s, x) => s + (Number(x.amount) || 0), 0);
        const netProfit = totalPayments - totalExpenses;
        
        // تحديد الشركاء
        let partnersToShow = [];
        let partnersCount = parseInt(document.getElementById('partnersCount')?.value) || 2;
        
        if (partnersData.length > 0) {
            // استخدام الشركاء المحفوظين
            partnersToShow = partnersData.map(partner => ({
                name: partner.name,
                percentage: (100 / partnersData.length),
                share: netProfit / partnersData.length
            }));
        } else {
            // استخدام العدد المحدد بدون أسماء
            for (let i = 1; i <= partnersCount; i++) {
                partnersToShow.push({
                    name: `الشريك ${i}`,
                    percentage: (100 / partnersCount),
                    share: netProfit / partnersCount
                });
            }
        }
        
        // عرض التقرير
        container.innerHTML = `
            <div class="alert alert-info mb-3">
                <strong>الفترة:</strong> ${text}
                ${storeFilter !== 'all' ? `<br><strong>المحل:</strong> ${data.stores.find(s => s.id === storeFilter)?.name || 'غير معروف'}` : ''}
            </div>
            
            <div class="row mb-3">
                <div class="col-md-4">
                    <div class="card border-primary">
                        <div class="card-body text-center">
                            <h6 class="card-title text-primary">إجمالي التسديدات</h6>
                            <h4 class="currency">${formatNumber(totalPayments)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-danger">
                        <div class="card-body text-center">
                            <h6 class="card-title text-danger">إجمالي المصروفات</h6>
                            <h4 class="currency">${formatNumber(totalExpenses)}</h4>
                        </div>
                    </div>
                </div>
                <div class="col-md-4">
                    <div class="card border-${netProfit >= 0 ? 'success' : 'danger'}">
                        <div class="card-body text-center">
                            <h6 class="card-title text-${netProfit >= 0 ? 'success' : 'danger'}">صافي الربح</h6>
                            <h4 class="currency">${formatNumber(Math.abs(netProfit))}</h4>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="table-responsive">
                <table class="table table-bordered">
                    <thead class="table-light">
                        <tr>
                            <th>الشريك</th>
                            <th>النسبة</th>
                            <th>الحصة من ${netProfit >= 0 ? 'الأرباح' : 'الخسائر'}</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${partnersToShow.map(partner => `
                            <tr>
                                <td><strong>${escapeHtml(partner.name)}</strong></td>
                                <td>${partner.percentage.toFixed(2)}%</td>
                                <td class="currency ${partner.share >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatNumber(Math.abs(partner.share))}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot class="table-secondary">
                        <tr>
                            <th colspan="2">المجموع</th>
                            <th class="currency ${netProfit >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatNumber(Math.abs(netProfit))}
                            </th>
                        </tr>
                    </tfoot>
                </table>
            </div>
            
            <div class="mt-3">
                <small class="text-muted">
                    <i class="fas fa-info-circle me-1"></i>
                    ${partnersData.length > 0 ? 
                        `تم التوزيع على ${partnersData.length} شركاء مسجلين بالتساوي` : 
                        `تم التوزيع بالتساوي على ${partnersCount} شركاء`
                    }
                </small>
            </div>
        `;
        
        // حفظ البيانات للطباعة والتصدير
        window.lastPartnerReportData = {
            period: text,
            store: storeFilter !== 'all' ? data.stores.find(s => s.id === storeFilter)?.name : 'جميع المحلات',
            totalPayments,
            totalExpenses,
            netProfit,
            partners: partnersToShow,
            generatedAt: new Date().toISOString()
        };
    };

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
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    /**
     * تهيئة النظام
     */
    function initPartnersSystem() {
        // إضافة قسم إدارة الشركاء إذا لم يكن موجوداً
        const partnersCard = document.getElementById('partnerReportsCard');
        if (partnersCard && !document.getElementById('partnersManagementSection')) {
            const cardBody = partnersCard.querySelector('.card-body');
            if (cardBody) {
                const managementHTML = `
                    <div id="partnersManagementSection" class="mb-4" style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #dee2e6;">
                        <h6 class="mb-3"><i class="fas fa-users me-2"></i>إدارة الشركاء</h6>
                        <div class="row g-2 align-items-end mb-3">
                            <div class="col-md-6">
                                <label class="form-label">اسم الشريك</label>
                                <input type="text" id="partnerName" class="form-control form-control-sm" placeholder="أدخل اسم الشريك">
                            </div>
                            <div class="col-md-3">
                                <button class="btn btn-sm btn-primary w-100" onclick="addPartner()">
                                    <i class="fas fa-plus me-1"></i>إضافة شريك
                                </button>
                            </div>
                        </div>
                        <div id="partnersList"></div>
                    </div>
                `;
                
                // إدراج قسم الإدارة في بداية البطاقة
                cardBody.insertAdjacentHTML('afterbegin', managementHTML);
            }
        }
        
        // عرض قائمة الشركاء
        renderPartnersList();
        
        // استبدال دالة generatePartnerReports الأصلية
        if (typeof window.generatePartnerReports === 'function') {
            window.generatePartnerReports = generatePartnerReportsEnhanced;
        }
    }

    // التهيئة عند تحميل الصفحة
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPartnersSystem);
    } else {
        initPartnersSystem();
    }

    // التهيئة عند تحميل البيانات
    document.addEventListener('app-data-loaded', initPartnersSystem);

    /**
     * فتح تقرير الشركاء للطباعة
     */
    window.openPartnersReport = function() {
        if (!window.lastPartnerReportData) {
            showNotification('يرجى توليد التقرير أولاً', 'error');
            return;
        }
        
        const data = window.lastPartnerReportData;
        const printWindow = window.open('', '_blank');
        
        const html = `
            <!DOCTYPE html>
            <html lang="ar" dir="rtl">
            <head>
                <meta charset="UTF-8">
                <title>تقرير الشركاء - ${data.period}</title>
                <style>
                    body {
                        font-family: Arial, sans-serif;
                        direction: rtl;
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1, h2 {
                        text-align: center;
                        color: #2c3e50;
                    }
                    .info {
                        background: #f8f9fa;
                        padding: 15px;
                        border-radius: 5px;
                        margin-bottom: 20px;
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin: 20px 0;
                    }
                    th, td {
                        border: 1px solid #dee2e6;
                        padding: 12px;
                        text-align: right;
                    }
                    th {
                        background: #e9ecef;
                        font-weight: bold;
                    }
                    .currency {
                        font-weight: bold;
                    }
                    .text-success {
                        color: #28a745;
                    }
                    .text-danger {
                        color: #dc3545;
                    }
                    .summary {
                        display: flex;
                        justify-content: space-around;
                        margin: 20px 0;
                    }
                    .summary-item {
                        text-align: center;
                        padding: 15px;
                        border: 1px solid #dee2e6;
                        border-radius: 5px;
                        flex: 1;
                        margin: 0 10px;
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        color: #6c757d;
                        font-size: 0.9em;
                    }
                    @media print {
                        body {
                            padding: 10px;
                        }
                        .no-print {
                            display: none;
                        }
                    }
                </style>
            </head>
            <body>
                <h1>تقرير الشركاء</h1>
                <div class="info">
                    <strong>الفترة:</strong> ${data.period}<br>
                    <strong>المحل:</strong> ${data.store}<br>
                    <strong>تاريخ التقرير:</strong> ${moment().format('YYYY-MM-DD HH:mm')}
                </div>
                
                <div class="summary">
                    <div class="summary-item">
                        <h3>إجمالي التسديدات</h3>
                        <p class="currency">${formatNumber(data.totalPayments)} ريال</p>
                    </div>
                    <div class="summary-item">
                        <h3>إجمالي المصروفات</h3>
                        <p class="currency">${formatNumber(data.totalExpenses)} ريال</p>
                    </div>
                    <div class="summary-item">
                        <h3>صافي الربح</h3>
                        <p class="currency ${data.netProfit >= 0 ? 'text-success' : 'text-danger'}">
                            ${formatNumber(Math.abs(data.netProfit))} ريال
                        </p>
                    </div>
                </div>
                
                <h2>توزيع الأرباح على الشركاء</h2>
                <table>
                    <thead>
                        <tr>
                            <th>الشريك</th>
                            <th>النسبة</th>
                            <th>الحصة</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${data.partners.map(partner => `
                            <tr>
                                <td><strong>${partner.name}</strong></td>
                                <td>${partner.percentage.toFixed(2)}%</td>
                                <td class="currency ${partner.share >= 0 ? 'text-success' : 'text-danger'}">
                                    ${formatNumber(Math.abs(partner.share))} ريال
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                    <tfoot>
                        <tr>
                            <th colspan="2">المجموع</th>
                            <th class="currency ${data.netProfit >= 0 ? 'text-success' : 'text-danger'}">
                                ${formatNumber(Math.abs(data.netProfit))} ريال
                            </th>
                        </tr>
                    </tfoot>
                </table>
                
                <div class="footer">
                    <p>تم إنشاء هذا التقرير بواسطة نظام إدارة المبيعات</p>
                </div>
                
                <script>
                    window.onload = function() {
                        window.print();
                    };
                </script>
            </body>
            </html>
        `;
        
        printWindow.document.write(html);
        printWindow.document.close();
    };

    // ربط زر فتح التقرير
    document.addEventListener('DOMContentLoaded', function() {
        const openReportBtn = document.getElementById('openPartnersReport');
        if (openReportBtn) {
            openReportBtn.onclick = openPartnersReport;
        }
    });

})();