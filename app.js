// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pyhatmplhbogwufatdga.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d';
const OK_APP_ID = '5158712';
const OK_APP_KEY = '5FkHyaZz4fMv2tWESi0o';
// ===================================

// Инициализация
let supabase = null;
let currentUser = null;

// DOM элементы
const domainEl = document.getElementById('domain');
const httpsEl = document.getElementById('https');
const repoEl = document.getElementById('repo');
const deployDateEl = document.getElementById('deploy-date');

// При загрузке страницы
document.addEventListener('DOMContentLoaded', async () => {
    // Показываем информацию
    domainEl.textContent = window.location.hostname;
    httpsEl.textContent = window.location.protocol === 'https:' ? '✅ Да' : '❌ Нет';
    repoEl.textContent = 'github.com/ваш-ник/vmeste-app';
    deployDateEl.textContent = new Date().toLocaleDateString('ru-RU');
    
    // Инициализируем Supabase
    try {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase инициализирован');
    } catch (error) {
        console.error('❌ Ошибка инициализации Supabase:', error);
    }
    
    // Инициализируем OK API
    if (typeof OK !== 'undefined') {
        OK.init({
            appId: OK_APP_ID,
            appKey: OK_APP_KEY
        });
        console.log('✅ OK API инициализирован');
    } else {
        console.warn('⚠️ OK API не загружен');
    }
});

// ========== ФУНКЦИИ ==========

// Проверка подключения к Supabase
async function checkSupabase() {
    const statusDiv = document.getElementById('supabase-status');
    const messageEl = statusDiv.querySelector('.status-message');
    
    if (!supabase) {
        showStatus(messageEl, 'Supabase не инициализирован', 'error');
        statusDiv.classList.add('visible');
        statusDiv.classList.remove('hidden');
        return;
    }
    
    showStatus(messageEl, 'Проверяем подключение к Supabase...', 'info');
    statusDiv.classList.add('visible');
    statusDiv.classList.remove('hidden');
    
    try {
        // Пытаемся получить список таблиц через system query
        const { data, error } = await supabase.from('ok_users').select('count');
        
        if (error) {
            if (error.message.includes('relation "ok_users" does not exist')) {
                showStatus(messageEl, '✅ Supabase подключен, но таблица ok_users не создана<br>Создайте таблицу через SQL Editor в Supabase', 'info');
            } else {
                showStatus(messageEl, '❌ Ошибка Supabase: ' + error.message, 'error');
            }
        } else {
            showStatus(messageEl, '✅ Supabase подключение успешно!<br>Можно создавать таблицы и работать с базой', 'success');
            
            // Показываем интерфейс приложения
            document.getElementById('app-content').classList.add('visible');
            document.getElementById('app-content').classList.remove('hidden');
        }
    } catch (err) {
        showStatus(messageEl, '❌ Ошибка: ' + err.message, 'error');
    }
}

// Тест авторизации OK.ru
async function testOKAuth() {
    const statusDiv = document.getElementById('ok-status');
    const messageEl = statusDiv.querySelector('.status-message');
    
    if (typeof OK === 'undefined') {
        showStatus(messageEl, 'OK API не загружен. Проверьте подключение к интернету', 'error');
        statusDiv.classList.add('visible');
        statusDiv.classList.remove('hidden');
        return;
    }
    
    showStatus(messageEl, 'Открываем окно авторизации OK.ru...', 'info');
    statusDiv.classList.add('visible');
    statusDiv.classList.remove('hidden');
    
    // Открываем окно авторизации (имитация)
    setTimeout(() => {
        showStatus(messageEl, 
            '✅ OK API готов к работе!<br>' +
            'Для реальной авторизации нужно настроить:<br>' +
            '1. Callback URL в настройках OK.ru: ' + window.location.origin + '<br>' +
            '2. CORS в Supabase для домена: ' + window.location.hostname, 
            'success'
        );
    }, 1500);
}

// Отправка тестового сообщения
async function sendTestMessage() {
    const messageInput = document.getElementById('messageInput');
    const messageResult = document.getElementById('message-result');
    const text = messageInput.value.trim() || 'Тестовое сообщение с Vercel! ' + new Date().toLocaleTimeString();
    
    if (!supabase) {
        messageResult.innerHTML = '<div class="status-message error">Supabase не инициализирован</div>';
        return;
    }
    
    messageResult.innerHTML = '<div class="status-message info">Отправляем сообщение...</div>';
    
    try {
        const { data, error } = await supabase
            .from('ok_messages')
            .insert({
                content: text,
                sender_ok_id: 'test_user_' + Date.now(),
                is_anonymous: true,
                created_at: new Date().toISOString()
            })
            .select();
        
        if (error) {
            if (error.message.includes('relation "ok_messages" does not exist')) {
                messageResult.innerHTML = `
                    <div class="status-message info">
                        ❓ Таблица 'ok_messages' не создана<br>
                        <strong>Создайте таблицу в Supabase:</strong><br>
                        <pre style="background:#1e1e1e;color:#fff;padding:10px;border-radius:5px;margin-top:10px;font-size:12px;">
CREATE TABLE ok_messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    content TEXT NOT NULL,
    sender_ok_id TEXT,
    is_anonymous BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW()
);</pre>
                    </div>
                `;
            } else {
                messageResult.innerHTML = `<div class="status-message error">Ошибка: ${error.message}</div>`;
            }
        } else {
            messageResult.innerHTML = `
                <div class="status-message success">
                    ✅ Сообщение отправлено!<br>
                    ID: ${data[0].id}<br>
                    Время: ${new Date(data[0].created_at).toLocaleString('ru-RU')}
                </div>
            `;
            messageInput.value = '';
        }
    } catch (err) {
        messageResult.innerHTML = `<div class="status-message error">Исключение: ${err.message}</div>`;
    }
}

// Вспомогательная функция для отображения статуса
function showStatus(element, message, type = 'info') {
    element.innerHTML = message;
    element.className = 'status-message ' + type;
}
