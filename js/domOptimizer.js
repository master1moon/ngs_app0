// مكتبة تحسين أداء DOM
(function() {
    'use strict';

    // كاش لعناصر DOM المستخدمة بكثرة
    const elementCache = new Map();
    
    // DocumentFragment لتجميع العمليات
    let fragment = null;
    
    // RequestAnimationFrame queue
    const rafQueue = [];
    let rafId = null;

    // Virtual DOM بسيط للجداول
    class VirtualTable {
        constructor(containerId) {
            this.containerId = containerId;
            this.rows = [];
            this.visibleRange = { start: 0, end: 50 }; // عرض 50 صف فقط
            this.rowHeight = 40; // ارتفاع الصف التقريبي
            this.scrollHandler = null;
        }

        setData(rows) {
            this.rows = rows;
            return this;
        }

        render() {
            const container = getElement(this.containerId);
            if (!container) return;

            // إنشاء wrapper للـ virtual scrolling
            const wrapper = document.createElement('div');
            wrapper.style.position = 'relative';
            wrapper.style.height = `${this.rows.length * this.rowHeight}px`;

            // إنشاء الجدول
            const table = document.createElement('table');
            table.className = container.className || 'table table-sm';
            
            const tbody = document.createElement('tbody');
            tbody.style.position = 'absolute';
            tbody.style.top = '0';
            tbody.style.width = '100%';

            // عرض الصفوف المرئية فقط
            this.renderVisibleRows(tbody);

            table.appendChild(tbody);
            wrapper.appendChild(table);

            // تنظيف وإضافة
            batchDOM(() => {
                container.innerHTML = '';
                container.appendChild(wrapper);
            });

            // إضافة معالج التمرير
            this.attachScrollHandler(container, tbody);
        }

        renderVisibleRows(tbody) {
            const fragment = document.createDocumentFragment();
            const { start, end } = this.visibleRange;
            
            for (let i = start; i < Math.min(end, this.rows.length); i++) {
                const row = this.rows[i];
                if (row) {
                    fragment.appendChild(row);
                }
            }

            tbody.innerHTML = '';
            tbody.appendChild(fragment);
            tbody.style.transform = `translateY(${start * this.rowHeight}px)`;
        }

        attachScrollHandler(container, tbody) {
            if (this.scrollHandler) {
                container.removeEventListener('scroll', this.scrollHandler);
            }

            this.scrollHandler = throttle(() => {
                const scrollTop = container.scrollTop;
                const containerHeight = container.clientHeight;
                
                const newStart = Math.floor(scrollTop / this.rowHeight);
                const newEnd = Math.ceil((scrollTop + containerHeight) / this.rowHeight) + 10; // buffer

                if (newStart !== this.visibleRange.start || newEnd !== this.visibleRange.end) {
                    this.visibleRange = { start: newStart, end: newEnd };
                    requestAnimationFrame(() => {
                        this.renderVisibleRows(tbody);
                    });
                }
            }, 16); // ~60fps

            container.addEventListener('scroll', this.scrollHandler);
        }
    }

    // الحصول على عنصر مع كاش
    function getElement(id) {
        if (typeof id !== 'string') return id;
        
        if (!elementCache.has(id)) {
            const element = document.getElementById(id);
            if (element) {
                elementCache.set(id, element);
            }
            return element;
        }
        return elementCache.get(id);
    }

    // تنظيف الكاش عند تغيير DOM
    function clearCache() {
        elementCache.clear();
    }

    // تجميع عمليات DOM
    function batchDOM(callback) {
        if (!fragment) {
            fragment = document.createDocumentFragment();
        }
        
        // تنفيذ العمليات في الذاكرة
        callback(fragment);
        
        // تطبيق التغييرات مرة واحدة
        if (fragment.childNodes.length > 0) {
            requestAnimationFrame(() => {
                document.body.appendChild(fragment);
                fragment = null;
            });
        }
    }

    // تأجيل العمليات باستخدام requestAnimationFrame
    function rafSchedule(callback) {
        rafQueue.push(callback);
        
        if (!rafId) {
            rafId = requestAnimationFrame(() => {
                const queue = rafQueue.slice();
                rafQueue.length = 0;
                rafId = null;
                
                queue.forEach(cb => cb());
            });
        }
    }

    // Throttle function للحد من تكرار العمليات
    function throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Debounce function لتأخير التنفيذ
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this;
            const args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    // تحسين إنشاء الجداول الكبيرة
    function createOptimizedTable(data, config) {
        const {
            containerId,
            headers = [],
            rowRenderer,
            pageSize = 50,
            enableVirtualScroll = true
        } = config;

        const container = getElement(containerId);
        if (!container) return;

        // استخدام Virtual scrolling للجداول الكبيرة
        if (enableVirtualScroll && data.length > 100) {
            const vTable = new VirtualTable(containerId);
            const rows = data.map(item => {
                if (typeof rowRenderer === 'function') {
                    return rowRenderer(item);
                }
                return createTableRow(item);
            });
            vTable.setData(rows).render();
            return;
        }

        // للجداول الصغيرة، استخدم DocumentFragment
        const fragment = document.createDocumentFragment();
        const table = document.createElement('table');
        table.className = 'table table-sm';

        // إضافة الرؤوس
        if (headers.length > 0) {
            const thead = document.createElement('thead');
            const headerRow = document.createElement('tr');
            headers.forEach(header => {
                const th = document.createElement('th');
                th.textContent = header;
                headerRow.appendChild(th);
            });
            thead.appendChild(headerRow);
            table.appendChild(thead);
        }

        // إضافة البيانات
        const tbody = document.createElement('tbody');
        
        // تقسيم العمل إلى دفعات
        const batchSize = 50;
        let currentIndex = 0;

        function renderBatch() {
            const fragment = document.createDocumentFragment();
            const end = Math.min(currentIndex + batchSize, data.length);
            
            for (let i = currentIndex; i < end; i++) {
                const row = typeof rowRenderer === 'function' 
                    ? rowRenderer(data[i]) 
                    : createTableRow(data[i]);
                fragment.appendChild(row);
            }
            
            tbody.appendChild(fragment);
            currentIndex = end;
            
            // جدولة الدفعة التالية
            if (currentIndex < data.length) {
                rafSchedule(renderBatch);
            }
        }

        renderBatch();
        table.appendChild(tbody);
        fragment.appendChild(table);

        // تطبيق التغييرات
        rafSchedule(() => {
            container.innerHTML = '';
            container.appendChild(fragment);
        });
    }

    // إنشاء صف جدول بسيط
    function createTableRow(data) {
        const tr = document.createElement('tr');
        if (Array.isArray(data)) {
            data.forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
        } else {
            Object.values(data).forEach(value => {
                const td = document.createElement('td');
                td.textContent = value;
                tr.appendChild(td);
            });
        }
        return tr;
    }

    // تحسين تحديث العناصر المتعددة
    function batchUpdate(updates) {
        rafSchedule(() => {
            updates.forEach(({ element, property, value }) => {
                const el = getElement(element);
                if (el) {
                    if (property === 'textContent' || property === 'innerHTML') {
                        el[property] = value;
                    } else if (property === 'className') {
                        el.className = value;
                    } else if (property === 'style') {
                        Object.assign(el.style, value);
                    } else {
                        el.setAttribute(property, value);
                    }
                }
            });
        });
    }

    // Lazy loading للصور والمحتوى الثقيل
    function lazyLoad(selector = 'img[data-src]') {
        const elements = document.querySelectorAll(selector);
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        if (element.dataset.src) {
                            element.src = element.dataset.src;
                            element.removeAttribute('data-src');
                        }
                        observer.unobserve(element);
                    }
                });
            });

            elements.forEach(el => imageObserver.observe(el));
        } else {
            // Fallback للمتصفحات القديمة
            elements.forEach(el => {
                if (el.dataset.src) {
                    el.src = el.dataset.src;
                    el.removeAttribute('data-src');
                }
            });
        }
    }

    // مراقب للتغييرات في DOM
    let mutationObserver = null;
    
    function observeDOM(callback) {
        if (mutationObserver) {
            mutationObserver.disconnect();
        }
        
        mutationObserver = new MutationObserver(debounce(callback, 100));
        
        mutationObserver.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: false
        });
    }

    // تصدير الدوال
    if (typeof window !== 'undefined') {
        window.DOMOptimizer = {
            getElement,
            clearCache,
            batchDOM,
            rafSchedule,
            throttle,
            debounce,
            createOptimizedTable,
            batchUpdate,
            lazyLoad,
            observeDOM,
            VirtualTable
        };

        // اختصارات سريعة
        window.$dom = {
            get: getElement,
            batch: batchDOM,
            schedule: rafSchedule,
            table: createOptimizedTable,
            update: batchUpdate,
            lazy: lazyLoad
        };
    }

})();