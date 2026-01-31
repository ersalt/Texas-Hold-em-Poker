// Player Logic (Human and AI)
class Player {
    constructor(name, isAI = false, chips = 1000) {
        this.name = name;
        this.isAI = isAI;
        this.chips = chips;
        this.hand = [];
        this.currentBet = 0;
        this.folded = false; // Changed from isFolded to folded to match Game logic
        this.role = null; // 'dealer', 'small-blind', 'big-blind', or null
        this.handStrength = null; // To store evaluation result
    }

    receiveCard(card) {
        this.hand.push(card);
    }

    resetHand() {
        this.hand = [];
        this.folded = false;
        this.currentBet = 0;
        this.handStrength = null;
    }
}
