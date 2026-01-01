// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pyhatmplhbogwufatdga.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d';
const OK_APP_ID = '5158712';
const OK_APP_KEY = '5FkHyaZz4fMv2tWESi0o';
// ===================================

console.log('🚀 app.js загружен успешно');

// Глобальные переменные
let supabaseClient = null;

// При загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    console.log('✅ DOM полностью загружен');
    
    // Показываем информацию о домене
    updateDomainInfo();
    
    // Инициализируем Supabase
    initSupabase();
    
    // Назначаем обработчики кнопок ПРАВИЛЬНО
    setupEventListeners();
});

// ========== ОСНОВНЫЕ ФУНКЦИИ ==========

function updateDomainInfo() {
    const domainEl = document.getElementById('domain');
    const httpsEl = document.getElementById('https');
    const repoEl = document.getElementById('repo');
    const deployDateEl = document.getElementById('deploy-date');
    
    if (domainEl) {
        domainEl.textContent = window.location.hostname;
        console.log('🌐 Домен:', window.location.hostname);
    }
    
    if (httpsEl) {
        httpsEl.textContent = window.location.protocol === 'https:' ? '✅ Да' : '❌ Нет';
    }
    
    if (repoEl) {
        repoEl.textContent = window.location.hostname.includes('vercel') 
            ? 'github.com/ваш-ник/vmeste-app' 
            : 'локальная разработка';
    }
    
    if (deployDateEl) {
        deployDateEl.textContent = new Date().toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
    }
}

function initSupabase() {
    try {
        if (window.supabase && window.supabase.createClient) {
            supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            console.log('✅ Supabase клиент инициализирован');
        } else {
            console.error('❌ Библиотека Supabase не загружена');
        }
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
    }
}

function setupEventListeners() {
    // Находим кнопки по ID или другим атрибутам
    const supabaseBtn = document.querySelector('button[onclick*="checkSupabase"], #supabase-btn');
    const okBtn = document.querySelector('button[onclick*="testOKAuth"], #ok-btn');
    
    // Удаляем старые обработчики onclick
    if (supabaseBtn) {
        supabaseBtn.removeAttribute('onclick');
        supabaseBtn.addEventListener('click', checkSupabase);
        console.log('✅ Кнопка Supabase подключена');
    }
    
    if (okBtn) {
        okBtn.removeAttribute('onclick');
        okBtn.addEventListener('click', testOKAuth);
        console.log('✅ Кнопка OK.ru подключена');
    }
}

// ========== ОБРАБОТЧИКИ КНОПОК ==========

window.checkSupabase = async function() {
    console.log('🔍 Проверяем подключение к Supabase...');
    
    let statusDiv = document.getElementById('supabase-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'supabase-status';
        statusDiv.className = 'visible';
        document.querySelector('.section').appendChild(statusDiv);
    }
    
    const messageEl = statusDiv.querySelector('.status-message') || (() => {
        const el = document.createElement('p');
        el.className = 'status-message';
        statusDiv.appendChild(el);
        return el;
    })();
    
    if (!supabaseClient) {
        showStatus(messageEl, '❌ Supabase не инициализирован', 'error');
        return;
    }
    
    showStatus(messageEl, '⏳ Проверяем подключение...', 'info');
    
    try {
        // Простой тестовый запрос
        const { data, error } = await supabaseClient
            .from('ok_users')
            .select('count')
            .limit(1);
        
        if (error) {
            if (error.message.includes('does not exist')) {
                showStatus(messageEl, 
                    '✅ Подключение к Supabase успешно!<br>' +
                    '🛠 Таблицы пока не созданы.<br>' +
                    'Перейдите в SQL Editor и создайте таблицы.', 
                    'success'
                );
            } else {
                showStatus(messageEl, `❌ Ошибка: ${error.message}`, 'error');
            }
        } else {
            showStatus(messageEl, '🎉 Supabase подключен и работает!', 'success');
        }
    } catch (err) {
        showStatus(messageEl, `💥 Исключение: ${err.message}`, 'error');
        console.error('Ошибка проверки:', err);
    }
};

window.testOKAuth = function() {
    console.log('🔍 Тестируем OK.ru API...');
    
    let statusDiv = document.getElementById('ok-status');
    if (!statusDiv) {
        statusDiv = document.createElement('div');
        statusDiv.id = 'ok-status';
        statusDiv.className = 'visible';
        document.querySelectorAll('.section')[1].appendChild(statusDiv);
    }
    
    const messageEl = statusDiv.querySelector('.status-message') || (() => {
        const el = document.createElement('p');
        el.className = 'status-message';
        statusDiv.appendChild(el);
        return el;
    })();
    
    // Проверяем загружена ли библиотека OK
    if (typeof OK === 'undefined') {
        showStatus(messageEl, 
            '⚠️ Библиотека OK.ru не загружена<br>' +
            'Добавьте в HTML: &lt;script src="https://connect.ok.ru/connect.js"&gt;', 
            'error'
        );
        return;
    }
    
    // Инициализируем OK API
    try {
        OK.init({
            appId: OK_APP_ID,
            appKey: OK_APP_KEY
        });
        
        showStatus(messageEl, 
            '✅ OK API инициализирован!<br>' +
            'Для реальной авторизации:<br>' +
            '1. Добавьте в OK.ru домен: ' + window.location.hostname + '<br>' +
            '2. Настройте Callback URL', 
            'success'
        );
    } catch (error) {
        showStatus(messageEl, `❌ Ошибка OK API: ${error.message}`, 'error');
    }
};

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showStatus(element, message, type = 'info') {
    element.innerHTML = message;
    element.className = 'status-message ' + type;
    
    // Автоочистка через 10 секунд
    setTimeout(() => {
        element.innerHTML = '';
        element.className = 'status-message';
    }, 10000);
    
    console.log(`📢 [${type.toUpperCase()}] ${message.replace(/<br>/g, ' ')}`);
}

// Делаем функции доступными глобально
window.checkSupabase = checkSupabase;
window.testOKAuth = testOKAuth;
