// دوال إدارة البيانات الأساسية

// استرجاع البيانات من localStorage
function loadData() {
    try {
        // محاولة تحميل البيانات المشفرة أولاً
        let parsedData = null;
        
        if (window.DataEncryption && window.DataEncryption.loadEncrypted) {
            // محاولة تحميل البيانات المشفرة
            parsedData = window.DataEncryption.loadEncrypted('networkCardsData');
        }
        
        // إذا فشل التحميل المشفر، حاول التحميل العادي
        if (!parsedData) {
            const savedData = localStorage.getItem('networkCardsData');
            if (savedData) {
                try {
                    // التحقق من وجود توقيع (بيانات مشفرة)
                    const testParse = JSON.parse(savedData);
                    if (testParse.signature && testParse.data) {
                        // بيانات مشفرة لكن فشل فك التشفير
                        console.warn('البيانات مشفرة لكن فشل فك التشفير');
                        parsedData = testParse.data; // استخدم البيانات المشفرة كما هي
                    } else {
                        // بيانات غير مشفرة
                        parsedData = testParse;
                    }
                } catch (e) {
                    console.error('خطأ في تحليل البيانات:', e);
                }
            }
        }
        
        if (parsedData) {
            // التحقق من صحة البيانات
            if (typeof parsedData === 'object' && parsedData !== null) {
                // التأكد من وجود جميع الخصائص المطلوبة
                data = {
                    packages: Array.isArray(parsedData.packages) ? parsedData.packages : [],
                    inventory: Array.isArray(parsedData.inventory) ? parsedData.inventory : [],
                    stores: Array.isArray(parsedData.stores) ? parsedData.stores : [],
                    expenses: Array.isArray(parsedData.expenses) ? parsedData.expenses : [],
                    sales: Array.isArray(parsedData.sales) ? parsedData.sales : [],
                    payments: Array.isArray(parsedData.payments) ? parsedData.payments : [],
                    trash: Array.isArray(parsedData.trash) ? parsedData.trash : []
                };
                showNotification('تم تحميل البيانات بنجاح', 'success');
            } else {
                throw new Error('تنسيق البيانات غير صحيح');
            }
        } else {
            // إذا لم توجد بيانات محفوظة، استخدم البيانات الافتراضية
            showNotification('لا توجد بيانات محفوظة، سيتم استخدام بيانات جديدة', 'info');
        }
    } catch (error) {
        console.error('خطأ في تحميل البيانات:', error);
        showNotification('حدث خطأ في تحميل البيانات، سيتم استخدام بيانات جديدة', 'error');
        // إعادة تعيين البيانات إلى القيم الافتراضية
        data = {
            packages: [],
            inventory: [],
            stores: [],
            expenses: [],
            sales: [],
            payments: [],
            trash: []
        };
    }
    
    // تحديث جميع الواجهات
    updateAllInterfaces();
}

// حفظ البيانات إلى localStorage
function saveData() {
    try {
        // التحقق من صحة البيانات قبل الحفظ
        if (!data || typeof data !== 'object') {
            throw new Error('البيانات غير صحيحة');
        }
        
        // التأكد من وجود جميع الخصائص المطلوبة
        const validData = {
            packages: Array.isArray(data.packages) ? data.packages : [],
            inventory: Array.isArray(data.inventory) ? data.inventory : [],
            stores: Array.isArray(data.stores) ? data.stores : [],
            expenses: Array.isArray(data.expenses) ? data.expenses : [],
            sales: Array.isArray(data.sales) ? data.sales : [],
            payments: Array.isArray(data.payments) ? data.payments : [],
            trash: Array.isArray(data.trash) ? data.trash : []
        };
        
        // تحديث الكائن الأصلي بالبيانات الصحيحة
        data = validData;
        
        // حفظ البيانات بالتشفير إذا كان متاحاً
        let saved = false;
        if (window.DataEncryption && window.DataEncryption.saveEncrypted) {
            saved = window.DataEncryption.saveEncrypted('networkCardsData', validData);
        }
        
        // إذا فشل التشفير، احفظ بالطريقة العادية
        if (!saved) {
            localStorage.setItem('networkCardsData', JSON.stringify(validData));
        }
        
        showNotification('تم حفظ البيانات بنجاح', 'success');
        
        // المزامنة مع GitHub إذا كانت مفعلة
        if (typeof githubSettings !== 'undefined' && githubSettings && githubSettings.autoSync && githubSettings.token && githubSettings.gistId) {
            if (typeof githubUploadData === 'function') {
                githubUploadData().catch(() => {});
            }
        }
    } catch (error) {
        console.error('خطأ في حفظ البيانات:', error);
        showNotification('حدث خطأ في حفظ البيانات', 'error');
    }
}

// تحديث جميع الواجهات
function updateAllInterfaces() {
    // تحديث لوحة التحكم
    if (typeof updateDashboard === 'function') {
        updateDashboard();
    }
    
    // تحديث الجداول
    if (typeof renderPackagesTable === 'function') {
        renderPackagesTable();
    }
    
    if (typeof renderInventoryTable === 'function') {
        renderInventoryTable();
    }
    
    if (typeof renderStoresList === 'function') {
        renderStoresList();
    }
    
    if (typeof renderExpensesTable === 'function') {
        renderExpensesTable();
    }
    
    // تحديث التقارير
    if (typeof updateReportStores === 'function') {
        updateReportStores();
    }
    
    if (typeof updateProfitReport === 'function') {
        updateProfitReport();
    }
    
    if (typeof generateDebtReport === 'function') {
        generateDebtReport();
    }
}

// استيراد البيانات
function importData() {
    if (typeof data === 'undefined' || !data) {
        window.data = {
            packages: [],
            inventory: [],
            stores: [],
            expenses: [],
            sales: [],
            payments: [],
            trash: []
        };
    }
    
    const fileInput = document.getElementById('importFile');
    const replace = document.getElementById('replaceData').checked;
    const dataType = document.getElementById('importDataType').value;
    
    if (!fileInput.files.length) {
        showNotification('يرجى اختيار ملف للاستيراد', 'error');
        return;
    }
    
    const file = fileInput.files[0];
    
    // التحقق من نوع الملف
    if (!file.type.includes('json') && !file.name.endsWith('.json')) {
        showNotification('يرجى اختيار ملف JSON صحيح', 'error');
        return;
    }
    
    // التحقق من حجم الملف
    if (file.size > 10 * 1024 * 1024) {
        showNotification('حجم الملف كبير جداً (الحد الأقصى 10 ميجابايت)', 'error');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (!importedData || typeof importedData !== 'object') {
                throw new Error('البيانات المستوردة غير صحيحة');
            }
            
            // دالة مساعدة لدمج البيانات
            function mergeUniqueById(existingArr, incomingArr) {
                const map = new Map();
                existingArr.forEach(item => {
                    if (item && item.id) map.set(item.id, item);
                });
                incomingArr.forEach(item => {
                    if (item && item.id) {
                        map.set(item.id, item);
                    }
                });
                return Array.from(map.values());
            }
            
            if (dataType === 'all') {
                // استيراد جميع البيانات
                if (replace) {
                    data = {
                        packages: Array.isArray(importedData.packages) ? importedData.packages : [],
                        inventory: Array.isArray(importedData.inventory) ? importedData.inventory : [],
                        stores: Array.isArray(importedData.stores) ? importedData.stores : [],
                        expenses: Array.isArray(importedData.expenses) ? importedData.expenses : [],
                        sales: Array.isArray(importedData.sales) ? importedData.sales : [],
                        payments: Array.isArray(importedData.payments) ? importedData.payments : [],
                        trash: Array.isArray(importedData.trash) ? importedData.trash : []
                    };
                } else {
                    // دمج البيانات
                    data.packages = mergeUniqueById(data.packages, importedData.packages || []);
                    data.inventory = mergeUniqueById(data.inventory, importedData.inventory || []);
                    data.stores = mergeUniqueById(data.stores, importedData.stores || []);
                    data.expenses = mergeUniqueById(data.expenses, importedData.expenses || []);
                    data.sales = mergeUniqueById(data.sales, importedData.sales || []);
                    data.payments = mergeUniqueById(data.payments, importedData.payments || []);
                    data.trash = mergeUniqueById(data.trash, importedData.trash || []);
                }
            } else {
                // استيراد نوع واحد من البيانات
                let incoming = Array.isArray(importedData) ? importedData : importedData[dataType];
                
                if (!Array.isArray(incoming)) {
                    throw new Error(`البيانات المستوردة لـ ${dataType} ليست مصفوفة`);
                }
                
                if (replace) {
                    data[dataType] = incoming;
                } else {
                    data[dataType] = mergeUniqueById(data[dataType], incoming);
                }
            }
            
            // حفظ البيانات وتحديث الواجهات
            saveData();
            updateAllInterfaces();
            
            showNotification('تم استيراد البيانات بنجاح', 'success');
            
            // إعادة تعيين حقل الملف
            fileInput.value = '';
            
        } catch (error) {
            console.error('خطأ في استيراد البيانات:', error);
            showNotification('خطأ: ' + error.message, 'error');
        }
    };
    
    reader.onerror = function() {
        showNotification('خطأ في قراءة الملف', 'error');
    };
    
    reader.readAsText(file, 'UTF-8');
}

// تصدير البيانات
function exportData() {
    const dataType = document.getElementById('exportDataType').value;
    const format = document.getElementById('exportFormat').value;
    
    let exportData;
    let title = '';
    let filename = `تصدير_${dataType}_${moment().format('YYYYMMDD')}`;
    
    // تحديد البيانات للتصدير
    switch(dataType) {
        case 'packages':
            exportData = data.packages;
            title = 'الباقات والأسعار';
            break;
        case 'inventory':
            exportData = data.inventory;
            title = 'كمية الكروت';
            break;
        case 'stores':
            exportData = data.stores;
            title = 'البقالات والمحلات';
            break;
        case 'expenses':
            exportData = data.expenses;
            title = 'المصروفات';
            break;
        case 'sales':
            exportData = data.sales;
            title = 'المبيعات';
            break;
        case 'payments':
            exportData = data.payments;
            title = 'التسديدات';
            break;
        default:
            exportData = data;
            title = 'جميع البيانات';
            filename = `نسخة_احتياطية_${moment().format('YYYYMMDD')}`;
    }
    
    // تصدير حسب الصيغة المطلوبة
    if (format === 'json') {
        exportToJSON(exportData, filename);
    } else if (format === 'excel') {
        exportToExcel(exportData, title, filename);
    }
}

// تصدير إلى JSON
function exportToJSON(data, filename) {
    const dataStr = JSON.stringify(data, null, 2);
    const blob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// تصدير إلى Excel
function exportToExcel(data, sheetName, filename) {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `${filename}.xlsx`);
}

// تصدير الدوال
window.loadData = loadData;
window.saveData = saveData;
window.importData = importData;
window.exportData = exportData;
window.updateAllInterfaces = updateAllInterfaces;