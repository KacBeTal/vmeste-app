// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pyhatmplhbogwufatdga.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d';
const OK_APP_ID = '512004353381';

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let supabaseClient = null;
let isInitialized = false;
let isProcessing = false;

// ========== ИНИЦИАЛИЗАЦИЯ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен');
    
    // Инициализируем Supabase
    initSupabase();
    
    // Инициализируем OK API (FAPI5)
    initOKAPI();
});

function initSupabase() {
    try {
        supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
        console.log('✅ Supabase инициализирован');
    } catch (error) {
        console.error('❌ Ошибка Supabase:', error);
        showStatus('Ошибка подключения к базе данных', 'error');
    }
}

function initOKAPI() {
    // Проверяем что SDK загружен
    if (typeof FAPI === 'undefined') {
        console.error('❌ SDK OK.ru не загружен');
        showStatus('SDK OK.ru не загружен', 'error');
        initDevMode();
        return;
    }
    
    console.log('✅ SDK OK.ru загружен');
    
    // Получаем параметры из URL (OK.ru передает их в iframe)
    var rParams = FAPI.Util.getRequestParameters();
    console.log('📋 Параметры OK.ru:', rParams);
    
    // Проверяем параметры (если их нет - мы не в OK.ru iframe)
    if (!rParams["api_server"] || !rParams["apiconnection"]) {
        console.warn('⚠️ Не в OK.ru iframe. Запускаем режим разработки.');
        initDevMode();
        return;
    }
    
    // Инициализируем FAPI
    FAPI.init(
        rParams["api_server"], 
        rParams["apiconnection"],
        
        // Успешная инициализация
        function() {
            console.log('✅ FAPI инициализирован успешно');
            document.getElementById('loading').style.display = 'none';
            isInitialized = true;
            
            // Проверяем авторизацию
            checkOKAuth();
        },
        
        // Ошибка инициализации
        function(error) {
            console.error('❌ Ошибка инициализации FAPI:', error);
            showStatus('Ошибка подключения к OK.ru API: ' + error, 'error');
            initDevMode();
        }
    );
}

// ========== АВТОРИЗАЦИЯ OK.RU ==========

function checkOKAuth() {
    if (isProcessing) return;
    isProcessing = true;
    
    console.log('🔍 Проверяем авторизацию OK.ru');
    
    // Проверяем текущего пользователя
    FAPI.Client.call(
        { 
            "method": "users.getCurrentUser", 
            "fields": "uid,first_name,last_name,pic_1,location,gender,birthday" 
        },
        function(method, result, data) {
            isProcessing = false;
            
            if (result) {
                // Пользователь авторизован
                console.log('✅ Пользователь OK.ru авторизован:', result);
                handleOKUser(result);
            } else {
                // Пользователь не авторизован
                console.log('ℹ️ Пользователь не авторизован');
                document.getElementById('auth-section').style.display = 'block';
                showStatus('Войдите через Одноклассники', 'info');
            }
        }
    );
}

function loginWithOK() {
    console.log('🔐 Запуск авторизации OK.ru');
    
    // Запрашиваем дополнительные права если нужно
    FAPI.UI.showPermissions({
        perms: 'VALUABLE',
        callback: function(result) {
            if (result) {
                console.log('✅ Права предоставлены');
                showStatus('Права предоставлены', 'success');
                setTimeout(checkOKAuth, 1000); // Даем время на обновление сессии
            } else {
                console.log('❌ Права не предоставлены');
                showStatus('Права не предоставлены', 'error');
            }
        }
    });
}

function handleOKUser(user) {
    if (isProcessing) return;
    isProcessing = true;
    
    console.log('👤 Обработка пользователя:', user);
    
    // Проверяем что это новый вызов, а не повторный
    if (currentUser && currentUser.ok_id === user.uid) {
        console.log('⚠️ Пользователь уже обработан');
        isProcessing = false;
        return;
    }
    
    currentUser = {
        ok_id: user.uid,
        first_name: user.first_name || 'Пользователь',
        last_name: user.last_name || 'OK',
        avatar_url: user.pic_1 || '',
        gender: user.gender,
        location: user.location ? user.location.city : null,
        birthday: user.birthday
    };
    
    // Сохраняем в Supabase
    saveUserToSupabase(currentUser);
    
    // Показываем интерфейс приложения
    setTimeout(() => {
        showAppContent();
        isProcessing = false;
    }, 500);
}

async function saveUserToSupabase(user) {
    if (!supabaseClient) {
        console.error('❌ Supabase не инициализирован');
        return;
    }
    
    try {
        console.log('💾 Сохраняем пользователя в Supabase:', user.ok_id);
        
        const { data, error } = await supabaseClient
            .from('ok_users')
            .upsert({
                ok_id: user.ok_id,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar_url: user.avatar_url,
                gender: user.gender,
                location: user.location,
                last_login: new Date().toISOString()
            }, {
                onConflict: 'ok_id'
            })
            .select();
            
        if (error) {
            console.error('❌ Ошибка сохранения пользователя:', error);
            
            // Если ошибка "relation does not exist" - таблица не создана
            if (error.message.includes('does not exist')) {
                showStatus('Таблица пользователей не создана. Создайте таблицу в Supabase.', 'error');
            } else {
                showStatus('Ошибка базы данных: ' + error.message, 'error');
            }
        } else {
            console.log('✅ Пользователь сохранен в Supabase:', data);
        }
    } catch (error) {
        console.error('💥 Исключение при сохранении:', error);
    }
}

// ========== ИНТЕРФЕЙС ПРИЛОЖЕНИЯ ==========

function showAppContent() {
    console.log('🎨 Показываем интерфейс приложения');
    
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    document.getElementById('content').innerHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
            <h2>👋 Привет, ${currentUser.first_name}!</h2>
            <p>Добро пожаловать в <strong>ВМесте</strong> 🌊</p>
        </div>
        
        <div class="app-section">
            <h3>💬 Отправить послание</h3>
            <p>Бросьте ваше сообщение в океан случайностей</p>
            <textarea id="message-input" 
                      placeholder="Напишите ваше послание..." 
                      rows="4"
                      style="width:100%; padding:12px; border-radius:8px; border:1px solid #ddd; margin:10px 0;"></textarea>
            <button onclick="sendMessage()" class="ok-button" style="width:100%;">
                🌊 Отправить в океан
            </button>
        </div>
        
        <div class="app-section">
            <h3>🎣 Поймать послание</h3>
            <p>Выловите случайное сообщение от другого пользователя</p>
            <button onclick="catchMessage()" class="ok-button" style="width:100%; margin-bottom:15px;">
                🎣 Поймать случайное послание
            </button>
            <div id="random-message" style="min-height: 60px;"></div>
        </div>
        
        <div class="app-section">
            <h3>📊 Статистика</h3>
            <div id="stats">
                <p>Загрузка статистики...</p>
            </div>
            <button onclick="loadStats()" class="ok-button">
                Обновить статистику
            </button>
        </div>
    `;
    
    // Загружаем статистику
    loadStats();
}

// ========== ФУНКЦИИ ПРИЛОЖЕНИЯ ==========

function sendMessage() {
    const input = document.getElementById('message-input');
    const text = input?.value.trim();
    
    if (!text) {
        showStatus('Введите текст сообщения', 'error');
        return;
    }
    
    if (!supabaseClient) {
        showStatus('База данных не подключена', 'error');
        return;
    }
    
    if (!currentUser) {
        showStatus('Вы не авторизованы', 'error');
        return;
    }
    
    console.log('📤 Отправка сообщения:', text.substring(0, 50) + '...');
    
    // Сохраняем сообщение в Supabase
    supabaseClient
        .from('ok_messages')
        .insert({
            content: text,
            sender_ok_id: currentUser.ok_id,
            is_anonymous: true,
            created_at: new Date().toISOString()
        })
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Ошибка отправки:', error);
                showStatus('Ошибка: ' + error.message, 'error');
            } else {
                console.log('✅ Сообщение отправлено:', data);
                showStatus('🎉 Послание отправлено в океан!', 'success');
                input.value = '';
                loadStats(); // Обновляем статистику
            }
        });
}

function catchMessage() {
    if (!supabaseClient || !currentUser) {
        showStatus('Система не готова', 'error');
        return;
    }
    
    console.log('🎣 Ищем случайное сообщение...');
    
    supabaseClient
        .from('ok_messages')
        .select('*')
        .neq('sender_ok_id', currentUser.ok_id) // Не свои сообщения
        .order('created_at', { ascending: false })
        .limit(5)
        .then(({ data, error }) => {
            if (error) {
                console.error('❌ Ошибка поиска:', error);
                showStatus('Ошибка: ' + error.message, 'error');
            } else if (data && data.length > 0) {
                // Выбираем случайное сообщение из последних 5
                const randomIndex = Math.floor(Math.random() * data.length);
                const message = data[randomIndex];
                
                document.getElementById('random-message').innerHTML = `
                    <div style="background:#f8f9fa; padding:15px; border-radius:8px; margin-top:10px;">
                        <p style="font-size:16px; margin-bottom:10px;">"${message.content}"</p>
                        <small style="color:#666;">
                            📅 ${new Date(message.created_at).toLocaleString('ru-RU')}
                        </small>
                    </div>
                `;
                
                showStatus('🎉 Вы поймали послание!', 'success');
            } else {
                document.getElementById('random-message').innerHTML = `
                    <div style="text-align:center; padding:20px; color:#666;">
                        🌊 Океан пуст...<br>
                        Будьте первым, кто бросит послание!
                    </div>
                `;
                showStatus('В океане пока нет сообщений', 'info');
            }
        });
}

function loadStats() {
    if (!supabaseClient) return;
    
    supabaseClient
        .from('ok_messages')
        .select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                console.error('❌ Ошибка загрузки статистики:', error);
                document.getElementById('stats').innerHTML = '<p>Ошибка загрузки статистики</p>';
            } else {
                document.getElementById('stats').innerHTML = `
                    <p>📊 Всего посланий в океане: <strong>${count || 0}</strong></p>
                    <p>👤 Ваш ID: <code>${currentUser?.ok_id || 'неизвестен'}</code></p>
                    <p>🌐 Статус: ${isInitialized ? '✅ Подключен к OK.ru' : '⚠️ Режим разработки'}</p>
                `;
            }
        });
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    if (!statusEl) return;
    
    const icon = type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️';
    const bgColor = type === 'error' ? '#f8d7da' : type === 'success' ? '#d4edda' : '#d1ecf1';
    const borderColor = type === 'error' ? '#dc3545' : type === 'success' ? '#28a745' : '#17a2b8';
    
    statusEl.innerHTML = `
        <div style="background:${bgColor}; color:#000; padding:10px 15px; border-radius:8px; border-left:4px solid ${borderColor}; margin:10px 0;">
            ${icon} ${message}
        </div>
    `;
    
    // Автоочистка через 5 секунд
    setTimeout(() => {
        if (statusEl.innerHTML.includes(message)) {
            statusEl.innerHTML = '';
        }
    }, 5000);
}

function initDevMode() {
    console.log('🔧 Запускаем режим разработки');
    
    document.getElementById('loading').innerHTML = `
        <div style="background: #fff3cd; padding: 20px; border-radius: 10px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <h3 style="color:#856404; margin-top:0;">🔧 Режим разработки</h3>
            <p>Приложение запущено <strong>вне OK.ru iframe</strong>.</p>
            <p>Для тестирования внутри OK.ru:</p>
            <ol>
                <li>Настройте приложение в OK.ru</li>
                <li>Укажите URL: <code>${window.location.href}</code></li>
                <li>Откройте через: <a href="https://ok.ru/app/${OK_APP_ID}" target="_blank">ok.ru/app/${OK_APP_ID}</a></li>
            </ol>
            <p style="margin-top:15px;">Для тестирования функционала:</p>
            <button onclick="simulateOKLogin()" class="ok-button" style="margin:5px;">
                👤 Тестовый вход
            </button>
            <button onclick="checkSupabaseConnection()" class="ok-button" style="background:#3ecf8e; margin:5px;">
                🗄 Проверить Supabase
            </button>
        </div>
    `;
}

function simulateOKLogin() {
    console.log('🎮 Тестовый вход');
    
    const testUser = {
        uid: 'ok_test_' + Date.now(),
        first_name: 'Тест',
        last_name: 'Пользователь',
        pic_1: '',
        gender: 'male',
        location: { city: 'Москва' }
    };
    
    handleOKUser(testUser);
}

function checkSupabaseConnection() {
    if (!supabaseClient) {
        showStatus('Supabase не инициализирован', 'error');
        return;
    }
    
    supabaseClient
        .from('ok_users')
        .select('count', { count: 'exact', head: true })
        .then(({ count, error }) => {
            if (error) {
                showStatus('❌ Ошибка Supabase: ' + error.message, 'error');
            } else {
                showStatus(`✅ Supabase подключен. Таблиц: ${count !== null ? 'созданы' : 'не созданы'}`, 'success');
            }
        });
}

// Делаем функции глобальными
window.loginWithOK = loginWithOK;
window.sendMessage = sendMessage;
window.catchMessage = catchMessage;
window.loadStats = loadStats;
window.simulateOKLogin = simulateOKLogin;
window.checkSupabaseConnection = checkSupabaseConnection;
