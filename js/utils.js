// Helpers and Hand Evaluation
const Utils = {
    // Basic function to get card value for comparison
    getCardValue: (rank) => {
        const values = {'2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14};
        return values[rank];
    },

    evaluateHand: (cards) => {
        // Placeholder for hand evaluation logic (Royal Flush, Straight, etc.)
        console.log("Evaluating hand...", cards);
        return {
            rank: 0, // High Card
            score: 0
        };
    }
};
