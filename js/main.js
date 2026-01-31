// Main Entry Point
document.addEventListener('DOMContentLoaded', () => {
    console.log("Texas Hold'em Poker - System Ready");
    
    // Initialize Start Page
    initStartPage();

    // Initialize Game but don't start it yet
    window.game = new Game();
    
    // Wire up game back button
    const backBtn = document.getElementById('btn-back-home');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            // Confirm if game is in progress? For now just go back
            if (confirm('确定要退出当前牌局返回大厅吗？')) {
                returnToLobby();
            }
        });
    }

});

function initStartPage() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Room Buttons
    const roomBtns = document.querySelectorAll('.room-btn');
    roomBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const roomType = e.target.getAttribute('data-room');
            startGame(roomType);
        });
    });
}

function updateDateTime() {
    const now = new Date();
    const timeDisplay = document.getElementById('time-display');
    const dateDisplay = document.getElementById('date-display');
    const greetingDisplay = document.getElementById('greeting-display');

    if (timeDisplay && dateDisplay && greetingDisplay) {
        // Time: HH:mm
        const hours = now.getHours();
        const minutes = String(now.getMinutes()).padStart(2, '0');
        timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${minutes}`;

        // Date: YYYY年M月D日 星期X
        const days = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
        const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${days[now.getDay()]}`;
        dateDisplay.textContent = dateStr;

        // Greeting
        let greeting = '';
        if (hours >= 5 && hours < 11) {
            greeting = '早上好，新的一天开始了！';
        } else if (hours >= 11 && hours < 13) {
            greeting = '中午好，吃过午饭了吗？';
        } else if (hours >= 13 && hours < 18) {
            greeting = '下午好，来局牌放松一下吧。';
        } else if (hours >= 18 && hours < 23) {
            greeting = '晚上好，祝你好运！';
        } else {
            greeting = '夜深了，注意休息哦。';
        }
        greetingDisplay.textContent = greeting;
    }
}

function startGame(roomType) {
    const startPage = document.getElementById('start-page');
    const app = document.getElementById('app');

    // Fade out start page
    startPage.classList.add('hidden');
    
    // Show game
    setTimeout(() => {
        // startPage.style.display = 'none'; // done by css
        app.classList.remove('hidden');
        
        // Initialize Game Logic with room settings if needed
        // For now, just init the standard game
        // If the game was already running, we might need to reset it
        if (window.game) {
            // Apply room config based on type
            let bigBlind = 20;
            let minChips = 1000;

            if (roomType === '1') { // Primary
                bigBlind = 20;
                minChips = 1000;
            } else if (roomType === '2') { // Medium
                bigBlind = 100;
                minChips = 5000;
            } else if (roomType === '3') { // Advanced
                bigBlind = 400;
                minChips = 20000;
            }

            // We might need to extend Game class to accept config
            // For now, we'll just start it. 
            // Ideally, we reset the game state here.
            window.game.init(); 
            
            // TODO: Pass room configuration to game
            console.log(`Starting room ${roomType}`);
        }
    }, 500);
}

function returnToLobby() {
    const startPage = document.getElementById('start-page');
    const app = document.getElementById('app');
    
    app.classList.add('hidden');
    startPage.classList.remove('hidden');
    
    // Reset game state if possible so next start is fresh
    // window.game = new Game(); // Re-instantiate?
}
