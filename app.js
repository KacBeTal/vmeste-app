// Проверка контекста загрузки
console.log('=== КОНТЕКСТ ПРИЛОЖЕНИЯ ===');
console.log('Домен:', window.location.hostname);
console.log('В iframe:', window.self !== window.top);
console.log('User Agent:', navigator.userAgent);

// Определяем, мобильное или десктопное приложение
const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
console.log('Мобильное устройство:', isMobile);

// Для iframe OK.ru
if (window.self !== window.top) {
    console.log('🎯 Приложение запущено в OK.ru');
    
    // Отправляем сообщение родительскому окну (OK.ru)
    window.addEventListener('load', () => {
        try {
            window.parent.postMessage({
                type: 'app_loaded',
                appId: '512004353381',
                version: '1.0'
            }, '*');
        } catch (e) {
            console.log('Не удалось отправить сообщение в родительское окно');
        }
    });
}
