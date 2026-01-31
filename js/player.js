// Player Logic (Human and AI)
class Player {
    constructor(name, isAI = false, chips = 1000) {
        this.name = name;
        this.isAI = isAI;
        this.chips = chips;
        this.hand = [];
        this.currentBet = 0;
        this.isFolded = false;
        this.role = null; // 'dealer', 'small-blind', 'big-blind', or null
    }

    receiveCard(card) {
        this.hand.push(card);
    }

    resetHand() {
        this.hand = [];
        this.isFolded = false;
        this.currentBet = 0;
    }

    // Placeholder for AI decision making
    makeDecision(gameState) {
        if (!this.isAI) return;
        console.log(`${this.name} is thinking...`);
        // Logic to call, raise, or fold
    }
}
