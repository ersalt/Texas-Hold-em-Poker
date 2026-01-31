// Game Controller
class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.ui = new UI();
        this.state = 'IDLE'; // IDLE, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
    }

    init() {
        this.ui.log("Game Initializing...");
        
        // Reset state
        this.players = [];
        this.communityCards = [];
        this.deck = new Deck(); // Fresh deck
        
        // Setup 10 Players using user settings (nickname and initial chips)
        const settings = (window.getGameSettings && typeof window.getGameSettings === 'function') ? window.getGameSettings() : {nickname: '我', playerChips: 1000, aiChips: 1000};

        // Player 0 is Human
        this.players.push(new Player(settings.nickname, false, Number(settings.playerChips)));
        
        // Players 1-9 are AI
        for (let i = 1; i < 10; i++) {
            this.players.push(new Player(`玩家 ${i}`, true, Number(settings.aiChips)));
        }

        // Assign initial roles for demo purposes (Dealer, SB, BB)
        // In a real game, this rotates.
        // Dealer is opposite to User (Seat 5)
        // SB is to the right of Dealer (Seat 4)
        // BB is to the right of SB (Seat 3)
        this.players[5].role = 'dealer';
        this.players[4].role = 'small-blind';
        this.players[3].role = 'big-blind';

        this.ui.initPlayers(this.players);
        this.startGame();
    }

    startGame() {
        this.deck.shuffle();
        this.state = 'PREFLOP';
        this.dealHoleCards();
        this.ui.log("Game Started. Dealing hole cards.");
    }

    async dealHoleCards() {
        // Clear existing hands in UI first (in case of restart)
        this.players.forEach((_, index) => {
            const container = document.getElementById(`hand-${index}`);
            if (container) container.innerHTML = '';
        });

        // Deal 2 cards to each player sequentially with animation
        // Order: Small Blind -> Big Blind -> ... -> Dealer (Standard is start left of Dealer)
        // For simplicity in this array-based setup, we'll just go 0-9 twice
        // Or strictly: We should deal card 1 to all players, then card 2 to all players
        
        // Note: Our Dealer is index 5. So start at index 6, loop to 9, then 0 to 5.
        // Let's just do 0-9 for simplicity as requested, or maybe realistic order.
        // Let's do simple 0-9 loop for visual clarity.

        const dealOrder = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]; // Can be rotated based on Dealer button
        
        // Card 1
        for (const playerIndex of dealOrder) {
            const player = this.players[playerIndex];
            const card = this.deck.deal();
            player.receiveCard(card);
            
            // Animate
            // Player 0 is human, cards face up. Others face down.
            // Wait for animation to finish before moving to next player? Or rapid fire?
            // "Rapid fire with small delay" looks best.
            await this.ui.animateDeal(playerIndex, card, playerIndex === 0, 0);
            // await new Promise(r => setTimeout(r, 100)); // 100ms gap between cards
        }

        // Card 2
        for (const playerIndex of dealOrder) {
            const player = this.players[playerIndex];
            const card = this.deck.deal();
            player.receiveCard(card);
            
            await this.ui.animateDeal(playerIndex, card, playerIndex === 0, 0);
        }
    }
}
