// مكتبة تشفير البيانات الحساسة
(function() {
    'use strict';

    // مفتاح التشفير - في بيئة الإنتاج يجب أن يكون أكثر تعقيداً وأماناً
    const ENCRYPTION_KEY = 'NC-2024-SEC-KEY-' + window.location.hostname;
    
    // إنشاء مفتاح مشتق بناءً على بيانات المستخدم
    function deriveKey(salt = '') {
        const baseKey = ENCRYPTION_KEY + salt;
        let hash = 0;
        for (let i = 0; i < baseKey.length; i++) {
            const char = baseKey.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // تحويل إلى 32-bit integer
        }
        return Math.abs(hash).toString(36);
    }

    // تشفير بسيط باستخدام XOR وBase64
    function simpleEncrypt(text, key) {
        if (!text) return '';
        
        let result = '';
        for (let i = 0; i < text.length; i++) {
            const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
            result += String.fromCharCode(charCode);
        }
        
        // تحويل إلى Base64 لتجنب مشاكل الترميز
        try {
            return btoa(unescape(encodeURIComponent(result)));
        } catch (e) {
            console.error('خطأ في التشفير:', e);
            return text; // إرجاع النص الأصلي في حالة الفشل
        }
    }

    // فك التشفير
    function simpleDecrypt(encryptedText, key) {
        if (!encryptedText) return '';
        
        try {
            // فك Base64 أولاً
            const decoded = decodeURIComponent(escape(atob(encryptedText)));
            
            let result = '';
            for (let i = 0; i < decoded.length; i++) {
                const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
                result += String.fromCharCode(charCode);
            }
            
            return result;
        } catch (e) {
            console.error('خطأ في فك التشفير:', e);
            return encryptedText; // إرجاع النص المشفر في حالة الفشل
        }
    }

    // تشفير كائن كامل
    function encryptObject(obj, fieldsToEncrypt = []) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const key = deriveKey(new Date().toDateString());
        const encrypted = JSON.parse(JSON.stringify(obj)); // نسخة عميقة
        
        // قائمة الحقول الحساسة الافتراضية
        const sensitiveFields = [
            'price', 'amount', 'total', 'balance',
            'retailPrice', 'wholesalePrice', 'distributorPrice',
            'cost', 'profit', 'debt', 'payment',
            'salary', 'income', 'expense',
            ...fieldsToEncrypt
        ];
        
        function encryptFields(item) {
            if (!item || typeof item !== 'object') return;
            
            for (const field of Object.keys(item)) {
                // تشفير الحقول الحساسة
                if (sensitiveFields.some(sf => field.toLowerCase().includes(sf.toLowerCase()))) {
                    if (typeof item[field] === 'string' || typeof item[field] === 'number') {
                        item[field] = simpleEncrypt(String(item[field]), key);
                        item[`_${field}_encrypted`] = true;
                    }
                }
                
                // معالجة الكائنات والمصفوفات المتداخلة
                if (typeof item[field] === 'object' && item[field] !== null) {
                    if (Array.isArray(item[field])) {
                        item[field].forEach(encryptFields);
                    } else {
                        encryptFields(item[field]);
                    }
                }
            }
        }
        
        if (Array.isArray(encrypted)) {
            encrypted.forEach(encryptFields);
        } else {
            encryptFields(encrypted);
        }
        
        return encrypted;
    }

    // فك تشفير كائن
    function decryptObject(obj) {
        if (!obj || typeof obj !== 'object') return obj;
        
        const key = deriveKey(new Date().toDateString());
        const decrypted = JSON.parse(JSON.stringify(obj)); // نسخة عميقة
        
        function decryptFields(item) {
            if (!item || typeof item !== 'object') return;
            
            for (const field of Object.keys(item)) {
                // فك تشفير الحقول المشفرة
                if (item[`_${field}_encrypted`] === true) {
                    try {
                        item[field] = simpleDecrypt(item[field], key);
                        // محاولة تحويل إلى رقم إذا كان رقماً
                        const numValue = Number(item[field]);
                        if (!isNaN(numValue) && item[field] !== '') {
                            item[field] = numValue;
                        }
                        delete item[`_${field}_encrypted`];
                    } catch (e) {
                        console.error(`خطأ في فك تشفير ${field}:`, e);
                    }
                }
                
                // معالجة الكائنات والمصفوفات المتداخلة
                if (typeof item[field] === 'object' && item[field] !== null) {
                    if (Array.isArray(item[field])) {
                        item[field].forEach(decryptFields);
                    } else {
                        decryptFields(item[field]);
                    }
                }
            }
        }
        
        if (Array.isArray(decrypted)) {
            decrypted.forEach(decryptFields);
        } else {
            decryptFields(decrypted);
        }
        
        return decrypted;
    }

    // حفظ بيانات مشفرة في localStorage
    function saveEncrypted(key, data) {
        try {
            const encrypted = encryptObject(data);
            const jsonString = JSON.stringify(encrypted);
            
            // إضافة توقيع للتحقق من سلامة البيانات
            const signature = deriveKey(jsonString);
            const dataWithSignature = {
                data: encrypted,
                signature: signature,
                timestamp: new Date().toISOString()
            };
            
            localStorage.setItem(key, JSON.stringify(dataWithSignature));
            return true;
        } catch (error) {
            console.error('خطأ في حفظ البيانات المشفرة:', error);
            return false;
        }
    }

    // قراءة بيانات مشفرة من localStorage
    function loadEncrypted(key) {
        try {
            const stored = localStorage.getItem(key);
            if (!stored) return null;
            
            const parsed = JSON.parse(stored);
            
            // التحقق من التوقيع
            const expectedSignature = deriveKey(JSON.stringify(parsed.data));
            if (parsed.signature !== expectedSignature) {
                console.warn('تحذير: البيانات قد تكون معدلة!');
            }
            
            // فك التشفير
            return decryptObject(parsed.data);
        } catch (error) {
            console.error('خطأ في قراءة البيانات المشفرة:', error);
            return null;
        }
    }

    // تشفير قيمة واحدة
    function encryptValue(value) {
        const key = deriveKey(new Date().toDateString());
        return simpleEncrypt(String(value), key);
    }

    // فك تشفير قيمة واحدة
    function decryptValue(encryptedValue) {
        const key = deriveKey(new Date().toDateString());
        const decrypted = simpleDecrypt(encryptedValue, key);
        
        // محاولة تحويل إلى رقم إذا كان رقماً
        const numValue = Number(decrypted);
        if (!isNaN(numValue) && decrypted !== '') {
            return numValue;
        }
        
        return decrypted;
    }

    // التحقق من دعم التشفير في المتصفح
    function isEncryptionSupported() {
        try {
            // اختبار btoa و atob
            const test = 'test';
            const encoded = btoa(test);
            const decoded = atob(encoded);
            return decoded === test;
        } catch (e) {
            return false;
        }
    }

    // ترحيل البيانات الموجودة إلى تشفير
    function migrateExistingData() {
        try {
            const existingData = localStorage.getItem('networkCardsData');
            if (existingData && !existingData.includes('"_encrypted"')) {
                // البيانات غير مشفرة، قم بتشفيرها
                const parsed = JSON.parse(existingData);
                saveEncrypted('networkCardsData', parsed);
                console.log('تم ترحيل البيانات إلى التشفير بنجاح');
            }
        } catch (error) {
            console.error('خطأ في ترحيل البيانات:', error);
        }
    }

    // تصدير الدوال
    if (typeof window !== 'undefined') {
        window.DataEncryption = {
            encrypt: simpleEncrypt,
            decrypt: simpleDecrypt,
            encryptObject,
            decryptObject,
            saveEncrypted,
            loadEncrypted,
            encryptValue,
            decryptValue,
            isEncryptionSupported,
            migrateExistingData
        };
        
        // اختصارات سريعة
        window.$encrypt = {
            save: saveEncrypted,
            load: loadEncrypted,
            value: encryptValue,
            decrypt: decryptValue
        };
    }

    // التحقق من دعم التشفير عند التحميل
    document.addEventListener('DOMContentLoaded', function() {
        if (!isEncryptionSupported()) {
            console.warn('تحذير: المتصفح لا يدعم التشفير الكامل');
        } else {
            // ترحيل البيانات الموجودة
            migrateExistingData();
        }
    });

})();