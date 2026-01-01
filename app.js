// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pyhatmplhbogwufatdga.supabase.co'; // .co а не .com!
const SUPABASE_KEY = 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d';
const OK_APP_ID = '5158712';
const OK_APP_KEY = '5FkHyaZz4fMv2tWESi0o';
// ===================================

console.log('🚀 ВМесте загружен. Домен:', window.location.hostname);

// Глобальные переменные
let supabaseClient = null;
let isChecking = false;

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM загружен');
    
    // Инициализируем Supabase
    initSupabase();
    
    // Назначаем обработчики кнопок
    setupEventListeners();
});

// ========== ИНИЦИАЛИЗАЦИЯ ==========

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
            console.log('✅ Supabase клиент инициализирован');
            showNotification('Supabase подключен', 'success');
        } else {
            console.error('❌ Библиотека Supabase не загружена');
            showNotification('Библиотека Supabase не загружена', 'error');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
        showNotification('Ошибка инициализации базы данных', 'error');
    }
}

function setupEventListeners() {
    // Находим кнопки
    const supabaseBtn = document.querySelector('button[onclick*="checkSupabase"], #supabase-btn');
    const okBtn = document.querySelector('button[onclick*="testOKAuth"], #ok-btn');
    
    if (supabaseBtn) {
        supabaseBtn.addEventListener('click', checkSupabase);
        supabaseBtn.id = 'supabase-btn'; // Добавляем ID если нет
    }
    
    if (okBtn) {
        okBtn.addEventListener('click', testOKAuth);
        okBtn.id = 'ok-btn'; // Добавляем ID если нет
    }
    
    console.log('✅ Обработчики кнопок настроены');
}

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

async function checkSupabase() {
    if (isChecking) return;
    isChecking = true;
    
    const button = document.getElementById('supabase-btn');
    const originalText = button.textContent;
    
    try {
        // Показываем индикатор загрузки
        button.classList.add('btn-loading');
        button.disabled = true;
        
        showNotification('Проверяем подключение к базе данных...', 'info');
        
        if (!supabaseClient) {
            throw new Error('Клиент Supabase не инициализирован');
        }
        
        // Пытаемся получить информацию о таблицах
        const { data: tables, error: tablesError } = await supabaseClient
            .from('pg_tables') // Системная таблица PostgreSQL
            .select('tablename')
            .eq('schemaname', 'public')
            .limit(5);
        
        if (tablesError) {
            // Если не доступны системные таблицы, пробуем обычный запрос
            const { error } = await supabaseClient
                .from('ok_users')
                .select('count')
                .limit(1);
            
            if (error) {
                if (error.message.includes('does not exist')) {
                    showNotification('✅ База данных подключена! Таблицы не созданы. Создайте их в Supabase SQL Editor.', 'warning');
                    
                    // Показываем инструкцию
                    showDetailedResult(`
                        <h3>📊 Статус подключения: УСПЕШНО</h3>
                        <p>✅ Соединение с Supabase установлено</p>
                        <p>⚠️ Таблицы не созданы. Выполните в SQL Editor:</p>
                        <pre style="background:#1e1e1e;color:#fff;padding:15px;border-radius:8px;overflow:auto;">
-- Создание таблиц для ВМесте
CREATE TABLE ok_users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ok_id TEXT UNIQUE NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE ok_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_ok_id TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);</pre>
                    `);
                } else {
                    throw error;
                }
            } else {
                showNotification('🎉 База данных подключена и таблицы существуют!', 'success');
                showDetailedResult(`
                    <h3>📊 Статус подключения: ИДЕАЛЬНО</h3>
                    <p>✅ Соединение с Supabase установлено</p>
                    <p>✅ Таблицы созданы и доступны</p>
                    <p>✅ Приложение готово к работе!</p>
                `);
            }
        } else {
            const tableCount = tables ? tables.length : 0;
            showNotification(`✅ База подключена. Найдено таблиц: ${tableCount}`, 'success');
            showDetailedResult(`
                <h3>📊 Статус подключения: УСПЕШНО</h3>
                <p>✅ Соединение с Supabase установлено</p>
                <p>📋 Количество таблиц в базе: ${tableCount}</p>
                ${tableCount === 0 ? '<p>⚠️ Создайте таблицы через SQL Editor</p>' : ''}
            `);
        }
        
    } catch (error) {
        console.error('Ошибка проверки Supabase:', error);
        
        let errorMessage = 'Неизвестная ошибка';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'Проблема с сетью или CORS. Проверьте настройки Supabase CORS.';
        } else if (error.message.includes('JWT')) {
            errorMessage = 'Неверный API ключ. Проверьте SUPABASE_KEY.';
        } else if (error.message.includes('URI')) {
            errorMessage = 'Неверный URL Supabase. Должно быть .co а не .com!';
        } else {
            errorMessage = error.message;
        }
        
        showNotification(`❌ Ошибка подключения: ${errorMessage}`, 'error');
        
        showDetailedResult(`
            <h3>📊 Статус подключения: ОШИБКА</h3>
            <p>❌ Не удалось подключиться к базе данных</p>
            <p><strong>Причина:</strong> ${errorMessage}</p>
            <p><strong>Что проверить:</strong></p>
            <ol>
                <li>URL Supabase: должно быть <code>https://pyhatmplhbogwufatdga.supabase.co</code></li>
                <li>Ключ: должен начинаться с <code>sb_publishable_</code></li>
                <li>CORS настройки в Supabase: добавьте домен ${window.location.hostname}</li>
            </ol>
        `);
        
    } finally {
        // Восстанавливаем кнопку
        button.classList.remove('btn-loading');
        button.disabled = false;
        isChecking = false;
    }
}

function testOKAuth() {
    const button = document.getElementById('ok-btn');
    const originalText = button.textContent;
    
    try {
        button.classList.add('btn-loading');
        button.disabled = true;
        
        showNotification('Проверяем интеграцию с OK.ru...', 'info');
        
        // Проверяем загружена ли библиотека OK
        if (typeof OK === 'undefined') {
            throw new Error('Библиотека OK.ru не загружена');
        }
        
        // Инициализируем OK API
        OK.init({
            appId: OK_APP_ID,
            appKey: OK_APP_KEY
        });
        
        showNotification('✅ OK API инициализирован успешно!', 'success');
        
        showDetailedResult(`
            <h3>👤 Статус OK.ru интеграции: ГОТОВО</h3>
            <p>✅ Библиотека OK.ru загружена</p>
            <p>✅ API ключи настроены</p>
            <p>📋 <strong>Для завершения настройки:</strong></p>
            <ol>
                <li>Зайдите на <a href="https://apiok.ru/dev/app/${OK_APP_ID}" target="_blank">страницу приложения OK.ru</a></li>
                <li>В "Адреса сайта" добавьте: <code>${window.location.origin}</code></li>
                <li>В "Redirect URI" укажите: <code>${window.location.origin}</code></li>
                <li>Сохраните изменения</li>
            </ol>
            <p>После этого авторизация через Одноклассников будет работать!</p>
        `);
        
    } catch (error) {
        console.error('Ошибка OK API:', error);
        
        showNotification(`❌ Ошибка OK API: ${error.message}`, 'error');
        
        showDetailedResult(`
            <h3>👤 Статус OK.ru интеграции: ОШИБКА</h3>
            <p>❌ ${error.message}</p>
            <p><strong>Что проверить:</strong></p>
            <ol>
                <li>Добавлен ли скрипт в HTML: <code>&lt;script src="https://connect.ok.ru/connect.js"&gt;&lt;/script&gt;</code></li>
                <li>Правильные ли OK_APP_ID и OK_APP_KEY</li>
                <li>Не блокирует ли браузер скрипт (проверьте Console)</li>
            </ol>
        `);
        
    } finally {
        button.classList.remove('btn-loading');
        button.disabled = false;
    }
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showNotification(message, type = 'info') {
    // Удаляем старые уведомления
    const oldNotifications = document.querySelectorAll('.notification');
    oldNotifications.forEach(n => n.remove());
    
    // Создаем новое уведомление
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    
    // Добавляем на страницу
    document.body.appendChild(notification);
    
    // Автоматическое удаление
    setTimeout(() => {
        if (notification.parentNode) {
            notification.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }, 3000);
    
    console.log(`[${type.toUpperCase()}] ${message}`);
}

function showDetailedResult(html) {
    // Создаем или находим блок для детальных результатов
    let resultDiv = document.getElementById('detailed-result');
    
    if (!resultDiv) {
        resultDiv = document.createElement('div');
        resultDiv.id = 'detailed-result';
        resultDiv.style.cssText = `
            margin-top: 30px;
            padding: 25px;
            background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
            border-radius: 16px;
            border-left: 5px solid #667eea;
            animation: slideIn 0.5s ease;
        `;
        
        // Вставляем после последней секции
        const sections = document.querySelectorAll('.section');
        const lastSection = sections[sections.length - 1];
        lastSection.parentNode.insertBefore(resultDiv, lastSection.nextSibling);
    }
    
    resultDiv.innerHTML = html;
}

// Делаем функции глобально доступными
window.checkSupabase = checkSupabase;
window.testOKAuth = testOKAuth;
