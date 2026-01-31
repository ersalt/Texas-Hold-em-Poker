// Settings Modal Logic

document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('btn-settings');
    const modal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close-modal');
    const menuItems = document.querySelectorAll('.settings-item');
    const panels = document.querySelectorAll('.panel');

    // Default Settings
    const DEFAULT_SETTINGS = {
        nickname: '我',
        playerChips: 1000,
        aiChips: 1000
    };

    let settings = loadSettingsFromStorage();

    // Open Modal
    settingsBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
        populateSettingsForm();
    });

    // Close Modal
    closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
    });

    // Close when clicking outside content
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !modal.classList.contains('hidden')) {
            modal.classList.add('hidden');
        }
    });

    // Switch Tabs
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            // Remove active class from all items and panels
            menuItems.forEach(i => i.classList.remove('active'));
            panels.forEach(p => p.classList.remove('active'));

            // Activate clicked item
            item.classList.add('active');

            // Show corresponding panel
            const targetId = item.getAttribute('data-target');
            document.getElementById(targetId).classList.add('active');
        });
    });

    // Elements for Game Settings
    const nicknameInput = document.getElementById('setting-nickname');
    const playerChipsInput = document.getElementById('setting-player-chips');
    const aiChipsInput = document.getElementById('setting-ai-chips');
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');

    function loadSettingsFromStorage() {
        try {
            const raw = localStorage.getItem('th_settings');
            if (!raw) return {...DEFAULT_SETTINGS};
            return Object.assign({}, DEFAULT_SETTINGS, JSON.parse(raw));
        } catch (e) {
            console.error('Failed to load settings', e);
            return {...DEFAULT_SETTINGS};
        }
    }

    function persistSettings() {
        try {
            localStorage.setItem('th_settings', JSON.stringify(settings));
        } catch (e) {
            console.error('Failed to save settings', e);
        }
    }

    function populateSettingsForm() {
        settings = loadSettingsFromStorage();
        nicknameInput.value = settings.nickname || DEFAULT_SETTINGS.nickname;
        playerChipsInput.value = settings.playerChips || DEFAULT_SETTINGS.playerChips;
        aiChipsInput.value = settings.aiChips || DEFAULT_SETTINGS.aiChips;
    }

    function applySettingsToGame() {
        // Expose current settings globally getter
        window.getGameSettings = () => ({...settings});

        if (window.game && window.game.players) {
            // Apply name and chips to existing players
            if (window.game.players[0]) {
                window.game.players[0].name = settings.nickname;
                window.game.players[0].chips = Number(settings.playerChips);
            }
            window.game.players.forEach(p => {
                if (p.isAI) p.chips = Number(settings.aiChips);
            });
            // Re-render players UI
            if (window.game.ui && typeof window.game.ui.initPlayers === 'function') {
                window.game.ui.initPlayers(window.game.players);
            }
        }
    }

    function saveSettings() {
        const nick = (nicknameInput.value || '').trim() || DEFAULT_SETTINGS.nickname;
        const playerChips = parseInt(playerChipsInput.value, 10) || DEFAULT_SETTINGS.playerChips;
        const aiChips = parseInt(aiChipsInput.value, 10) || DEFAULT_SETTINGS.aiChips;

        settings = {
            nickname: nick,
            playerChips: Math.max(1, playerChips),
            aiChips: Math.max(1, aiChips)
        };

        persistSettings();
        applySettingsToGame();
        modal.classList.add('hidden');
    }

    function resetSettings() {
        settings = {...DEFAULT_SETTINGS};
        persistSettings();
        populateSettingsForm();
        applySettingsToGame();
    }

    // Initial exposure
    window.getGameSettings = () => ({...settings});

    // Wire up buttons
    saveBtn.addEventListener('click', saveSettings);
    resetBtn.addEventListener('click', resetSettings);
});
