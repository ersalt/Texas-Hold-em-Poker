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
        
        // Setup 10 Players
        // Player 0 is Human
        this.players.push(new Player("我")); 
        
        // Players 1-9 are AI
        for (let i = 1; i < 10; i++) {
            this.players.push(new Player(`玩家 ${i}`, true));
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

    dealHoleCards() {
        // Deal 2 cards to each player
        for (let i = 0; i < 2; i++) {
            this.players.forEach(player => {
                player.receiveCard(this.deck.deal());
            });
        }
        
        // Update UI for all players
        this.players.forEach((player, index) => {
            // Player 0 is human, cards face up. Others face down.
            const isFaceUp = (index === 0);
            this.ui.renderCards(player.hand, `hand-${index}`, isFaceUp);
        });
    }
}
