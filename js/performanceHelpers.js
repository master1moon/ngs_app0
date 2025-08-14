// مساعدات تحسين الأداء
(function() {
    'use strict';

    // تطبيق debounce على جميع حقول البحث
    function optimizeSearchInputs() {
        const searchInputs = document.querySelectorAll('input[type="search"], input[placeholder*="بحث"], #searchInput, #trashSearch, #backupSearch');
        
        searchInputs.forEach(input => {
            if (input.dataset.optimized) return;
            
            const originalHandler = input.oninput || input.onkeyup;
            if (originalHandler || input.hasAttribute('oninput') || input.hasAttribute('onkeyup')) {
                // استبدل المعالج الأصلي بنسخة محسنة
                const debouncedHandler = window.DOMOptimizer ? 
                    window.DOMOptimizer.debounce(function() {
                        if (typeof originalHandler === 'function') {
                            originalHandler.call(this);
                        } else {
                            // تنفيذ الكود من السمة
                            const code = this.getAttribute('oninput') || this.getAttribute('onkeyup');
                            if (code) {
                                try {
                                    new Function(code).call(this);
                                } catch (e) {
                                    console.error('Error in search handler:', e);
                                }
                            }
                        }
                    }, 300) : originalHandler;
                
                input.oninput = debouncedHandler;
                input.onkeyup = null;
                input.removeAttribute('oninput');
                input.removeAttribute('onkeyup');
            }
            
            input.dataset.optimized = 'true';
        });
    }

    // تطبيق throttle على أحداث التمرير
    function optimizeScrollHandlers() {
        const scrollContainers = document.querySelectorAll('.table-responsive, .modal-body, .section-content');
        
        scrollContainers.forEach(container => {
            if (container.dataset.scrollOptimized) return;
            
            const tables = container.querySelectorAll('table');
            if (tables.length > 0) {
                container.style.willChange = 'scroll-position';
                
                // تحسين التمرير للجداول الكبيرة
                if (window.DOMOptimizer && window.DOMOptimizer.throttle) {
                    container.addEventListener('scroll', window.DOMOptimizer.throttle(() => {
                        // تحديث موضع التمرير فقط عند الضرورة
                        requestAnimationFrame(() => {
                            const scrollTop = container.scrollTop;
                            container.dataset.scrollTop = scrollTop;
                        });
                    }, 16), { passive: true });
                }
            }
            
            container.dataset.scrollOptimized = 'true';
        });
    }

    // تحسين أحداث النقر المتكررة
    function optimizeClickHandlers() {
        // منع النقرات المتكررة على الأزرار
        document.addEventListener('click', function(e) {
            const button = e.target.closest('button, .btn');
            if (button && !button.dataset.allowMultipleClicks) {
                if (button.dataset.clicked === 'true') {
                    e.preventDefault();
                    e.stopPropagation();
                    return;
                }
                
                button.dataset.clicked = 'true';
                setTimeout(() => {
                    button.dataset.clicked = 'false';
                }, 1000); // السماح بنقرة جديدة بعد ثانية
            }
        }, true);
    }

    // تحسين تحديثات DOM المتكررة
    function optimizeDOMUpdates() {
        // تجميع التحديثات المتعددة
        let updateQueue = [];
        let updateTimer = null;
        
        window.queueDOMUpdate = function(updateFn) {
            updateQueue.push(updateFn);
            
            if (updateTimer) clearTimeout(updateTimer);
            
            updateTimer = setTimeout(() => {
                requestAnimationFrame(() => {
                    updateQueue.forEach(fn => fn());
                    updateQueue = [];
                    updateTimer = null;
                });
            }, 16); // ~60fps
        };
    }

    // تحسين الجداول الكبيرة
    function optimizeLargeTables() {
        const largeTables = document.querySelectorAll('table');
        
        largeTables.forEach(table => {
            if (table.dataset.optimized) return;
            
            const tbody = table.querySelector('tbody');
            if (tbody && tbody.children.length > 100) {
                // إضافة ارتفاع ثابت للصفوف لتحسين الأداء
                tbody.style.display = 'block';
                tbody.style.maxHeight = '600px';
                tbody.style.overflowY = 'auto';
                
                // تحسين rendering
                table.style.tableLayout = 'fixed';
            }
            
            table.dataset.optimized = 'true';
        });
    }

    // مراقب لتطبيق التحسينات على العناصر الجديدة
    function setupMutationObserver() {
        if (!window.MutationObserver) return;
        
        const observer = new MutationObserver(window.DOMOptimizer ? 
            window.DOMOptimizer.debounce(() => {
                optimizeSearchInputs();
                optimizeScrollHandlers();
                optimizeLargeTables();
            }, 100) : 
            () => {
                optimizeSearchInputs();
                optimizeScrollHandlers();
                optimizeLargeTables();
            }
        );
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // تطبيق التحسينات عند التحميل
    document.addEventListener('DOMContentLoaded', function() {
        // تأخير قليل للسماح بتحميل المكتبات
        setTimeout(() => {
            optimizeSearchInputs();
            optimizeScrollHandlers();
            optimizeClickHandlers();
            optimizeDOMUpdates();
            optimizeLargeTables();
            setupMutationObserver();
            
            // تطبيق lazy loading على الصور
            if (window.DOMOptimizer && window.DOMOptimizer.lazyLoad) {
                window.DOMOptimizer.lazyLoad();
            }
            
            console.log('تم تطبيق تحسينات الأداء');
        }, 500);
    });

    // تصدير للاستخدام اليدوي
    if (typeof window !== 'undefined') {
        window.PerformanceHelpers = {
            optimizeSearchInputs,
            optimizeScrollHandlers,
            optimizeClickHandlers,
            optimizeDOMUpdates,
            optimizeLargeTables
        };
    }

})();