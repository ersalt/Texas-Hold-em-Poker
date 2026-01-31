// Settings Modal Logic

document.addEventListener('DOMContentLoaded', () => {
    const settingsBtn = document.getElementById('btn-settings');
    const modal = document.getElementById('settings-modal');
    const closeModal = document.querySelector('.close-modal');
    const menuItems = document.querySelectorAll('.settings-item');
    const panels = document.querySelectorAll('.panel');

    // Open Modal
    settingsBtn.addEventListener('click', () => {
        modal.classList.remove('hidden');
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
});
