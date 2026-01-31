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

            // Start game with current user balance if available
            window.game.init(window.currentUserChips); 
            
            // TODO: Pass room configuration to game
            console.log(`Starting room ${roomType}`);
        }
    }, 500);
}

function returnToLobby() {
    const startPage = document.getElementById('start-page');
    const app = document.getElementById('app');
    
    // Save current user chips before leaving
    if (window.game && window.game.players && window.game.players.length > 0) {
        // Player 0 is always human
        window.currentUserChips = window.game.players[0].chips;
        updateUserStats();
    }

    app.classList.add('hidden');
    startPage.classList.remove('hidden');
    
    // Reset game state UI
    if (window.game && window.game.ui) {
        window.game.ui.reset();
    }
    // Logic reset will happen on next startGame() -> game.init()
}

function updateUserStats() {
    const statsDiv = document.getElementById('user-stats');
    const nickSpan = document.getElementById('start-nickname');
    const balanceSpan = document.getElementById('start-balance');
    
    // Get settings
    const settings = (window.getGameSettings && typeof window.getGameSettings === 'function') ? window.getGameSettings() : {nickname: '我', playerChips: 1000};
    
    // Use saved chips if available, otherwise default
    const currentChips = (typeof window.currentUserChips !== 'undefined') ? window.currentUserChips : settings.playerChips;
    // Update global var if not set
    if (typeof window.currentUserChips === 'undefined') {
        window.currentUserChips = currentChips;
    }

    if (nickSpan) nickSpan.textContent = settings.nickname;
    if (balanceSpan) balanceSpan.textContent = `$${currentChips}`;
    
    if (statsDiv) statsDiv.classList.remove('hidden');
}

// Call on init
updateUserStats();
