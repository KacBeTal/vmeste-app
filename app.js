// ========== КОНФИГУРАЦИЯ ДЛЯ OK.RU ==========

// Проверяем контекст
const isOKEnvironment = window.location.href.includes('ok.ru') || 
                       window.self !== window.top ||
                       document.referrer.includes('ok.ru');

console.log('=== OK.RU ENVIRONMENT ===');
console.log('In iframe:', window.self !== window.top);
console.log('Referrer:', document.referrer);
console.log('Is OK env:', isOKEnvironment);

// Конфигурация
const CONFIG = {
    OK_APP_ID: '512004353381',
    OK_PUBLIC_KEY: '', // Получить в настройках OK.ru
    OK_PROTECTED_KEY: '', // Получить в настройках OK.ru
    SUPABASE_URL: 'https://pyhatmplhbogwufatdga.supabase.co',
    SUPABASE_KEY: 'sb_publishable_rEZH-AdtzcBxBGeEA1hthQ_Ev3YtQ6d'
};

// ========== ИНИЦИАЛИЗАЦИЯ ==========

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM загружен для OK.ru');
    
    if (isOKEnvironment) {
        initOKApp();
    } else {
        // Режим вне OK.ru (для разработки)
        initDevMode();
    }
});

// ========== РЕЖИМ OK.RU ==========

function initOKApp() {
    console.log('Инициализация для OK.ru');
    
    // Проверяем доступность OK API
    if (typeof OK === 'undefined') {
        showError('Библиотека OK.ru не загружена. Проверьте подключение к интернету.');
        return;
    }
    
    // Настраиваем кнопку входа
    const loginBtn = document.getElementById('ok-login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', handleOKLogin);
    }
    
    // Проверяем авторизацию
    checkOKAuthStatus();
}

function handleOKLogin() {
    console.log('Запуск авторизации OK.ru');
    
    // ОБЯЗАТЕЛЬНЫЕ параметры для OK.ru
    OK.login(function(response) {
        if (response.session) {
            console.log('✅ Пользователь авторизован:', response);
            
            // Получаем информацию о пользователе
            OK.Api.call('users.getCurrentUser', 
                { fields: 'uid,first_name,last_name,pic_1' }, 
                function(result) {
                    if (result && result.uid) {
                        handleOKUser(result);
                    }
                }
            );
        } else {
            console.log('❌ Авторизация отменена');
            showError('Авторизация отменена или не удалась.');
        }
    }, 'VALUABLE'); // Права доступа
}

function checkOKAuthStatus() {
    // Проверяем текущую сессию OK
    OK.getAuthStatus(function(status) {
        console.log('Статус авторизации OK:', status);
        
        if (status.session) {
            // Пользователь уже авторизован
            OK.Api.call('users.getCurrentUser', {}, handleOKUser);
        }
    });
}

function handleOKUser(user) {
    console.log('Пользователь OK.ru:', user);
    
    // Сохраняем данные пользователя
    const userData = {
        ok_id: user.uid,
        first_name: user.first_name,
        last_name: user.last_name,
        avatar_url: user.pic_1,
        auth_source: 'ok.ru'
    };
    
    // Показываем контент приложения
    showAppContent(userData);
    
    // Сохраняем в Supabase
    saveUserToSupabase(userData);
}

// ========== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ==========

function showAppContent(userData) {
    document.getElementById('auth-section').style.display = 'none';
    document.getElementById('content').style.display = 'block';
    
    document.getElementById('content').innerHTML = `
        <h2>Добро пожаловать, ${userData.first_name}!</h2>
        <p>Ваш ID: ${userData.ok_id}</p>
        
        <div class="message-box">
            <textarea id="message-input" placeholder="Напишите послание..."></textarea>
            <button onclick="sendMessage()">Отправить</button>
        </div>
    `;
}

async function saveUserToSupabase(userData) {
    try {
        const supabase = window.supabase.createClient(
            CONFIG.SUPABASE_URL, 
            CONFIG.SUPABASE_KEY
        );
        
        const { data, error } = await supabase
            .from('ok_users')
            .upsert({
                ok_id: userData.ok_id,
                first_name: userData.first_name,
                last_name: userData.last_name,
                avatar_url: userData.avatar_url,
                last_login: new Date().toISOString()
            })
            .select();
            
        if (error) {
            console.error('Ошибка Supabase:', error);
        } else {
            console.log('Пользователь сохранен:', data);
        }
    } catch (error) {
        console.error('Ошибка сохранения:', error);
    }
}

function showError(message) {
    document.getElementById('status').innerHTML = `
        <div style="color: red; padding: 10px; border: 1px solid red; margin: 10px 0;">
            ❌ ${message}
        </div>
    `;
}

// ========== РЕЖИМ РАЗРАБОТКИ (без OK.ru) ==========

function initDevMode() {
    console.log('Режим разработки (вне OK.ru)');
    
    document.getElementById('status').innerHTML = `
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h3>Режим разработки</h3>
            <p>Приложение запущено вне OK.ru.</p>
            <p>Для тестирования используйте:</p>
            <button onclick="simulateOKLogin()">Тестовый вход</button>
        </div>
    `;
}

function simulateOKLogin() {
    const testUser = {
        uid: 'test_' + Date.now(),
        first_name: 'Тест',
        last_name: 'Пользователь',
        pic_1: 'https://example.com/avatar.jpg'
    };
    
    handleOKUser(testUser);
}

// Делаем функции глобальными для OK.ru
window.handleOKLogin = handleOKLogin;
window.sendMessage = async function() {
    const text = document.getElementById('message-input')?.value;
    if (!text) return;
    
    alert('Сообщение отправлено: ' + text);
    // Здесь будет реальная логика отправки
};
