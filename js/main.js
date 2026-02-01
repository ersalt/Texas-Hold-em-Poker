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
            // Skip confirmation if game is over (triggered automatically)
            if (window.game && window.game.isGameOver) {
                returnToLobby();
                return;
            }

            // Confirm if game is in progress
            if (confirm('确定要退出当前牌局返回大厅吗？')) {
                returnToLobby();
            }
        });
    }

});

function initStartPage() {
    updateDateTime();
    setInterval(updateDateTime, 1000);

    // Enter Lobby Button
    const enterLobbyBtn = document.getElementById('btn-enter-lobby');
    if (enterLobbyBtn) {
        enterLobbyBtn.addEventListener('click', () => {
             enterLobby();
        });
    }

    // Lobby Room Buttons
    const roomBtns = document.querySelectorAll('.room-btn');
    roomBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            // Traverse up to find button if clicked on span
            const targetBtn = e.target.closest('.room-btn');
            if (!targetBtn) return;
            
            const roomType = targetBtn.getAttribute('data-room');
            const minReq = parseInt(targetBtn.getAttribute('data-min') || '0', 10);
            
            // Get current chips for validation
            const settings = (window.getGameSettings && typeof window.getGameSettings === 'function') ? window.getGameSettings() : {playerChips: 1000};
            let currentChips = (typeof window.currentUserChips !== 'undefined') ? window.currentUserChips : settings.playerChips;
            currentChips = Number(currentChips);

            // Max Balance Restrictions
            if (roomType === '1' && currentChips > 1000000) {
                alert('您的余额已超过100万，高手请前往进阶场或大师场！');
                return;
            }
            if (roomType === '2' && currentChips > 10000000) {
                alert('您的余额已超过1000万，大神请前往大师场！');
                return;
            }
            
            // Check balance
            if (checkBalanceForRoom(minReq)) {
                startGame(roomType);
            } else {
                alert(`您的余额不足！进入此房间需要至少 $${minReq}`);
            }
        });
    });

    // Lobby Buttons Placeholders
    ['btn-work', 'btn-shop', 'btn-backpack'].forEach(id => {
        const btn = document.getElementById(id);
        if (btn) {
            btn.addEventListener('click', () => {
                alert('功能开发中，敬请期待！');
            });
        }
    });

    // Lobby Settings Button
    // We attach this via event delegation or direct if exists, but we need to ensure
    // settings logic is initialized. Since settings.js runs after main.js usually (in HTML order),
    // we should wait or verify.
    // However, initStartPage runs on DOMContentLoaded.
    // Let's re-verify the element ID.
    const lobbySettingsBtn = document.getElementById('btn-lobby-settings');
    if (lobbySettingsBtn) {
        lobbySettingsBtn.addEventListener('click', () => {
             console.log("Lobby settings clicked");
             const settingsModal = document.getElementById('settings-modal');
             if (settingsModal) {
                 settingsModal.classList.remove('hidden');
                 // Ensure we are on Game Settings tab by default or just show it
                 // Populate settings in case they were changed elsewhere or need refresh
                 if (typeof window.populateSettingsForm === 'function') {
                     window.populateSettingsForm();
                 } else {
                     console.warn("populateSettingsForm not found on window");
                 }
             } else {
                 console.error("Settings modal not found");
             }
        });
    }
}

function enterLobby() {
    const startPage = document.getElementById('start-page');
    const lobbyPage = document.getElementById('lobby-page');
    
    startPage.classList.add('hidden');
    lobbyPage.classList.remove('hidden');
    
    // Ensure user stats are updated (using same stats container?)
    // Note: User stats are currently in start-left. If we want them in lobby, we might need to duplicate or move them.
    // The requirement didn't specify user stats in lobby, but logically they should be there.
    // However, the prompt only asked for specific layout. I will stick to what was asked.
    
    // Update global balance just in case
    updateUserStats();
}

function checkBalanceForRoom(minReq) {
    const settings = (window.getGameSettings && typeof window.getGameSettings === 'function') ? window.getGameSettings() : {nickname: '我', playerChips: 1000};
    let currentChips = (typeof window.currentUserChips !== 'undefined') ? window.currentUserChips : settings.playerChips;
    
    // Ensure number
    currentChips = Number(currentChips);
    
    console.log(`Check Balance: Current=${currentChips}, MinReq=${minReq}, Result=${currentChips >= minReq}`);
    
    return currentChips >= minReq;
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
    const lobbyPage = document.getElementById('lobby-page');
    const app = document.getElementById('app');

    // Fade out start/lobby page
    startPage.classList.add('hidden');
    lobbyPage.classList.add('hidden');
    
    // Show game
    // setTimeout(() => { // Removed delay for snappier feel
        app.classList.remove('hidden');
        
        if (window.game) {
            // Apply room config based on type
            let bigBlind = 20;
            // Room configs (passed to game if implemented, for now just logic)
            if (roomType === '1') { bigBlind = 100; }
            else if (roomType === '2') { bigBlind = 1000; }
            else if (roomType === '3') { bigBlind = 10000; }

            // Start game with current user balance if available
            window.game.init(window.currentUserChips, roomType); 
            
            console.log(`Starting room ${roomType} (BB: ${bigBlind})`);
        }
    // }, 500);
}

function returnToLobby() {
    const lobbyPage = document.getElementById('lobby-page');
    const app = document.getElementById('app');
    
    // Save current user chips before leaving
    if (window.game && window.game.players && window.game.players.length > 0) {
        // Player 0 is always human
        window.currentUserChips = window.game.players[0].chips;
        updateUserStats();
    }

    app.classList.add('hidden');
    lobbyPage.classList.remove('hidden');
    
    // Reset game state UI
    if (window.game && window.game.ui) {
        window.game.ui.reset();
    }
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
    if (balanceSpan) balanceSpan.textContent = `$${Number(currentChips).toLocaleString('en-US')}`;
    
    // Also update Lobby Balance if exists
    const lobbyBalance = document.getElementById('lobby-balance-display');
    if (lobbyBalance) {
        lobbyBalance.textContent = `$${Number(currentChips).toLocaleString('en-US')}`;
    }

    if (statsDiv) statsDiv.classList.remove('hidden');
}

// Expose updateUserStats globally
window.updateUserStats = updateUserStats;

// Call on init
updateUserStats();
