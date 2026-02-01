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
        // Audio
        masterVolume: 100,
        bgmVolume: 100,
        sfxVolume: 100
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
    const saveBtn = document.getElementById('save-settings');
    const resetBtn = document.getElementById('reset-settings');
    
    // Audio Elements
    const masterVolInput = document.getElementById('setting-master-vol');
    const bgmVolInput = document.getElementById('setting-bgm-vol');
    const sfxVolInput = document.getElementById('setting-sfx-vol');
    const masterVolVal = document.getElementById('master-vol-val');
    const bgmVolVal = document.getElementById('bgm-vol-val');
    const sfxVolVal = document.getElementById('sfx-vol-val');

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
        // Game Settings
        nicknameInput.value = settings.nickname || DEFAULT_SETTINGS.nickname;
        playerChipsInput.value = settings.playerChips || DEFAULT_SETTINGS.playerChips;

        // Audio Settings
        updateAudioUI();
    }

    function updateAudioUI() {
        masterVolInput.value = settings.masterVolume ?? DEFAULT_SETTINGS.masterVolume;
        bgmVolInput.value = settings.bgmVolume ?? DEFAULT_SETTINGS.bgmVolume;
        sfxVolInput.value = settings.sfxVolume ?? DEFAULT_SETTINGS.sfxVolume;

        masterVolVal.textContent = `${masterVolInput.value}%`;
        bgmVolVal.textContent = `${bgmVolInput.value}%`;
        sfxVolVal.textContent = `${sfxVolInput.value}%`;
    }

    function applySettingsToGame() {
        // Expose current settings globally getter
        window.getGameSettings = () => ({...settings});

        // Update global user chips variable
        window.currentUserChips = Number(settings.playerChips);
        
        // Update UI display in lobby/start page if function is available
        if (typeof window.updateUserStats === 'function') {
            window.updateUserStats();
        }

        if (window.game && window.game.players) {
            // Apply name and chips to existing players
            if (window.game.players[0]) {
                window.game.players[0].name = settings.nickname;
                // If we are mid-game, changing settings chips might be weird.
                // Usually we only update init chips for NEXT game.
                // But for now let's sync if user explicitly changed it.
                window.game.players[0].chips = Number(settings.playerChips);
            }
            // Re-render players UI
            if (window.game.ui && typeof window.game.ui.initPlayers === 'function') {
                window.game.ui.initPlayers(window.game.players);
            }
        }
    }

    function saveSettings() {
        const nick = (nicknameInput.value || '').trim() || DEFAULT_SETTINGS.nickname;
        const playerChips = parseInt(playerChipsInput.value, 10) || DEFAULT_SETTINGS.playerChips;

        // Merge, keeping audio settings
        settings = {
            ...settings,
            nickname: nick,
            playerChips: Math.max(1, playerChips)
        };

        persistSettings();
        applySettingsToGame();
        modal.classList.add('hidden');
    }

    function saveAudioSettings() {
        settings = {
            ...settings,
            masterVolume: parseInt(masterVolInput.value, 10),
            bgmVolume: parseInt(bgmVolInput.value, 10),
            sfxVolume: parseInt(sfxVolInput.value, 10)
        };
        persistSettings();
    }

    function resetSettings() {
        settings = {...DEFAULT_SETTINGS};
        persistSettings();
        populateSettingsForm();
        applySettingsToGame();
    }

    // Audio Slider listeners for live preview and auto-save
    [masterVolInput, bgmVolInput, sfxVolInput].forEach(input => {
        input.addEventListener('input', () => {
            masterVolVal.textContent = `${masterVolInput.value}%`;
            bgmVolVal.textContent = `${bgmVolInput.value}%`;
            sfxVolVal.textContent = `${sfxVolInput.value}%`;
            
            // Auto-save audio settings in real-time
            saveAudioSettings();
        });
    });

    // Initial exposure
    window.getGameSettings = () => ({...settings});

    // Expose populateSettingsForm globally for lobby button
    window.populateSettingsForm = populateSettingsForm;

    // Wire up buttons
    saveBtn.addEventListener('click', saveSettings);
    resetBtn.addEventListener('click', resetSettings);
});
