// ========== КОНФИГУРАЦИЯ ==========
const SUPABASE_URL = 'https://pyhatmplhbogwufatdga.supabase.co';
const SUPABASE_KEY = 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d';
const OK_APP_ID = '512004353381';

// ========== ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ ==========
let currentUser = null;
let supabaseClient = null;

// ========== ИНИЦИАЛИЗАЦИЯ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен');
    
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
        showStatus('SDK OK.ru не загружен. Проверьте подключение к интернету.', 'error');
        return;
    }
    
    console.log('SDK OK.ru загружен:', FAPI);
    
    // Получаем параметры из URL (OK.ru передает их в iframe)
    var rParams = FAPI.Util.getRequestParameters();
    console.log('Параметры OK.ru:', rParams);
    
    // Инициализируем FAPI
    FAPI.init(
        rParams["api_server"], 
        rParams["apiconnection"],
        
        // Успешная инициализация
        function() {
            console.log('✅ FAPI инициализирован успешно');
            document.getElementById('loading').style.display = 'none';
            
            // Проверяем авторизацию
            checkOKAuth();
        },
        
        // Ошибка инициализации
        function(error) {
            console.error('❌ Ошибка инициализации FAPI:', error);
            showStatus('Ошибка подключения к OK.ru API', 'error');
            
            // Режим разработки (вне OK.ru)
            initDevMode();
        }
    );
}

// ========== АВТОРИЗАЦИЯ OK.RU ==========

function checkOKAuth() {
    // Проверяем текущего пользователя
    FAPI.Client.call(
        { "method": "users.getCurrentUser", "fields": "uid,first_name,last_name,pic_1" },
        function(method, result, data) {
            if (result) {
                // Пользователь авторизован
                console.log('Пользователь OK.ru:', result);
                handleOKUser(result);
            } else {
                // Пользователь не авторизован
                console.log('Пользователь не авторизован');
                document.getElementById('auth-section').style.display = 'block';
                showStatus('Войдите через Одноклассники', 'info');
            }
        }
    );
}

function loginWithOK() {
    // Запрашиваем дополнительные права если нужно
    FAPI.UI.showPermissions({
        perms: 'VALUABLE',
        callback: function(result) {
            if (result) {
                console.log('Права предоставлены');
                checkOKAuth(); // Проверяем снова
            } else {
                showStatus('Права не предоставлены', 'error');
            }
        }
    });
}

function handleOKUser(user) {
    console.log('Обработка пользователя:', user);
    
    currentUser = {
        ok_id: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.pic_1
    };
    
    // Сохраняем в Supabase
    saveUserToSupabase(currentUser);
    
    // Показываем интерфейс приложения
    showAppContent();
}

async function saveUserToSupabase(user) {
    if (!supabaseClient) return;
    
    try {
        const { data, error } = await supabaseClient
            .from('ok_users')
            .upsert({
                ok_id: user.ok_id,
                first_name: user.first_name,
                last_name: user.last_name,
                avatar_url: user.avatar_url,
                last_login: new Date().toISOString()
            })
            .select();
            
        if (error) {
            console.error('Ошибка сохранения пользователя:', error);
        } else {
            console.log('Пользователь сохранен в Supabase:', data);
        }
    } catch (error) {
        console.error('Исключение при сохранении:', error);
    }
}

// ========== ИНТЕРФЕЙС ПРИЛОЖЕНИЯ ==========

function showAppContent() {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    document.getElementById('content').innerHTML = `
        <h2>👋 Привет, ${currentUser.first_name}!</h2>
        
        <div class="app-section">
            <h3>💬 Отправить послание</h3>
            <textarea id="message-input" placeholder="Напишите ваше послание..." rows="4"></textarea>
            <button onclick="sendMessage()" class="ok-button">Отправить в океан</button>
        </div>
        
        <div class="app-section">
            <h3>🎣 Поймать послание</h3>
            <button onclick="catchMessage()" class="ok-button">Поймать случайное послание</button>
            <div id="random-message"></div>
        </div>
        
        <div class="app-section">
            <h3>👥 Найти друзей</h3>
            <button onclick="getFriends()" class="ok-button">Показать друзей</button>
            <div id="friends-list"></div>
        </div>
    `;
}

// ========== ФУНКЦИИ ПРИЛОЖЕНИЯ ==========

function sendMessage() {
    const text = document.getElementById('message-input')?.value;
    if (!text || !text.trim()) {
        showStatus('Введите текст сообщения', 'error');
        return;
    }
    
    if (!supabaseClient) {
        showStatus('База данных не подключена', 'error');
        return;
    }
    
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
                showStatus('Ошибка: ' + error.message, 'error');
            } else {
                showStatus('✅ Послание отправлено в океан!', 'success');
                document.getElementById('message-input').value = '';
            }
        });
}

function catchMessage() {
    if (!supabaseClient) return;
    
    supabaseClient
        .from('ok_messages')
        .select('*')
        .neq('sender_ok_id', currentUser.ok_id)
        .limit(1)
        .then(({ data, error }) => {
            if (error) {
                showStatus('Ошибка: ' + error.message, 'error');
            } else if (data && data.length > 0) {
                document.getElementById('random-message').innerHTML = `
                    <div class="message-card">
                        <p>${data[0].content}</p>
                        <small>${new Date(data[0].created_at).toLocaleString()}</small>
                    </div>
                `;
            } else {
                showStatus('В океане пока пусто...', 'info');
            }
        });
}

function getFriends() {
    // Используем OK API для получения друзей
    FAPI.Client.call(
        { "method": "friends.get", "fields": "uid,first_name,last_name,pic_1" },
        function(method, result, data) {
            if (result && result.length > 0) {
                let html = '<div class="friends-grid">';
                result.slice(0, 10).forEach(friend => {
                    html += `
                        <div class="friend-card">
                            <img src="${friend.pic_1 || ''}" alt="${friend.first_name}" width="50" height="50">
                            <div>${friend.first_name} ${friend.last_name}</div>
                        </div>
                    `;
                });
                html += '</div>';
                document.getElementById('friends-list').innerHTML = html;
            } else {
                document.getElementById('friends-list').innerHTML = '<p>Друзья не найдены</p>';
            }
        }
    );
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('status');
    
    statusEl.innerHTML = `
        <div class="status-${type}">
            ${type === 'error' ? '❌' : type === 'success' ? '✅' : 'ℹ️'} ${message}
        </div>
    `;
    
    // Автоочистка через 5 секунд
    setTimeout(() => {
        statusEl.innerHTML = '';
    }, 5000);
}

function initDevMode() {
    console.log('Режим разработки (вне OK.ru iframe)');
    
    document.getElementById('loading').innerHTML = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h3>Режим разработки</h3>
            <p>Приложение запущено вне OK.ru iframe.</p>
            <p>Для тестирования используйте:</p>
            <button onclick="simulateOKLogin()" class="ok-button">Тестовый вход</button>
        </div>
    `;
}

function simulateOKLogin() {
    const testUser = {
        uid: 'test_' + Date.now(),
        first_name: 'Тест',
        last_name: 'Пользователь',
        pic_1: ''
    };
    
    handleOKUser(testUser);
}

// Делаем функции глобальными
window.loginWithOK = loginWithOK;
window.sendMessage = sendMessage;
window.catchMessage = catchMessage;
window.getFriends = getFriends;
window.simulateOKLogin = simulateOKLogin;
