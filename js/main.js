// Main Entry Point
document.addEventListener('DOMContentLoaded', () => {
    console.log("Texas Hold'em Poker - System Ready");
    
    // Initialize Game and expose to window so settings can modify it
    window.game = new Game();
    window.game.init();
});
