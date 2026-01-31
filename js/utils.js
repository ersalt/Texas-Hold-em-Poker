// Poker Hand Logic and Game Utilities

// Rank values for comparison
const RANK_VALUE = {
    '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
    'J': 11, 'Q': 12, 'K': 13, 'A': 14
};

const HAND_RANK = {
    HIGH_CARD: 0,
    PAIR: 1,
    TWO_PAIR: 2,
    THREE_OF_A_KIND: 3,
    STRAIGHT: 4,
    FLUSH: 5,
    FULL_HOUSE: 6,
    FOUR_OF_A_KIND: 7,
    STRAIGHT_FLUSH: 8,
    ROYAL_FLUSH: 9
};

const HAND_NAMES = [
    "高牌 (High Card)",
    "一对 (Pair)",
    "两对 (Two Pair)",
    "三条 (Three of a Kind)",
    "顺子 (Straight)",
    "同花 (Flush)",
    "葫芦 (Full House)",
    "四条 (Four of a Kind)",
    "同花顺 (Straight Flush)",
    "皇家同花顺 (Royal Flush)"
];

/**
 * Evaluates the best 5-card hand from a set of cards (2 hole + 3-5 community).
 * Returns an object { rank: number, name: string, score: number, kickers: array }
 * Score is a numerical value for comparing hands of same rank.
 */
function evaluateHand(cards) {
    if (!cards || cards.length === 0) return { rank: -1, name: "Empty", score: 0 };

    // Need at least 5 cards to make a full poker hand, but can eval partials
    // For this game, we assume we always evaluate best 5 out of (available cards)
    // If < 5 cards (e.g. Flop), we eval what we have? 
    // Standard eval usually takes 7 cards. If < 5, just High Card or Pair etc.
    
    // Sort by Rank Descending
    const sorted = [...cards].sort((a, b) => RANK_VALUE[b.rank] - RANK_VALUE[a.rank]);
    
    // Helper to get flush suit
    const suits = {};
    sorted.forEach(c => suits[c.suit] = (suits[c.suit] || 0) + 1);
    let flushSuit = Object.keys(suits).find(s => suits[s] >= 5);

    // Helper to check straight
    // Returns array of 5 cards if straight, else null
    function getStraight(cardList) {
        // Remove duplicates for rank checking
        const uniqueRanks = [];
        const seen = new Set();
        cardList.forEach(c => {
            if (!seen.has(c.rank)) {
                uniqueRanks.push(c);
                seen.add(c.rank);
            }
        });
        
        if (uniqueRanks.length < 5) return null;

        // Check for normal straight
        for (let i = 0; i <= uniqueRanks.length - 5; i++) {
            const v1 = RANK_VALUE[uniqueRanks[i].rank];
            const v5 = RANK_VALUE[uniqueRanks[i+4].rank];
            if (v1 - v5 === 4) {
                return uniqueRanks.slice(i, i+5);
            }
        }
        
        // Check Ace Low Straight (A-5-4-3-2)
        // A is at index 0 (value 14). Need 5-4-3-2.
        if (uniqueRanks[0].rank === 'A') {
            const wheel = uniqueRanks.filter(c => ['5','4','3','2'].includes(c.rank));
            if (wheel.length === 4) {
                // Return 5-4-3-2-A (A is low)
                return [...wheel, uniqueRanks[0]]; 
            }
        }
        return null;
    }

    // Check Straight Flush
    if (flushSuit) {
        const flushCards = sorted.filter(c => c.suit === flushSuit);
        const sf = getStraight(flushCards);
        if (sf) {
            // Check Royal
            if (sf[0].rank === 'A' && sf[1].rank === 'K') {
                return { rank: HAND_RANK.ROYAL_FLUSH, name: HAND_NAMES[9], score: 9000000 };
            }
            return { 
                rank: HAND_RANK.STRAIGHT_FLUSH, 
                name: HAND_NAMES[8], 
                score: 8000000 + RANK_VALUE[sf[0].rank] 
            };
        }
    }

    // Check 4 of a Kind
    const counts = {};
    sorted.forEach(c => counts[c.rank] = (counts[c.rank] || 0) + 1);
    
    let quad = Object.keys(counts).find(r => counts[r] === 4);
    if (quad) {
        // High kicker
        const kicker = sorted.find(c => c.rank !== quad);
        return {
            rank: HAND_RANK.FOUR_OF_A_KIND,
            name: HAND_NAMES[7],
            score: 7000000 + (RANK_VALUE[quad] * 100) + (kicker ? RANK_VALUE[kicker.rank] : 0)
        };
    }

    // Check Full House (3 + 2)
    let trips = Object.keys(counts).filter(r => counts[r] === 3);
    let pairs = Object.keys(counts).filter(r => counts[r] === 2);
    
    // Sort trips/pairs descending
    trips.sort((a,b) => RANK_VALUE[b] - RANK_VALUE[a]);
    pairs.sort((a,b) => RANK_VALUE[b] - RANK_VALUE[a]);

    if (trips.length > 0) {
        let mainTrips = trips[0];
        let secondary = null;
        
        if (trips.length > 1) secondary = trips[1]; // Two trips -> FH
        else if (pairs.length > 0) secondary = pairs[0];

        if (secondary) {
            return {
                rank: HAND_RANK.FULL_HOUSE,
                name: HAND_NAMES[6],
                score: 6000000 + (RANK_VALUE[mainTrips] * 100) + RANK_VALUE[secondary]
            };
        }
    }

    // Check Flush
    if (flushSuit) {
        const flushCards = sorted.filter(c => c.suit === flushSuit).slice(0, 5);
        // Score based on all 5 cards
        let score = 5000000;
        flushCards.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(10, 4-i));
        
        return { rank: HAND_RANK.FLUSH, name: HAND_NAMES[5], score: score };
    }

    // Check Straight
    const straight = getStraight(sorted);
    if (straight) {
        return {
            rank: HAND_RANK.STRAIGHT,
            name: HAND_NAMES[4],
            score: 4000000 + RANK_VALUE[straight[0].rank]
        };
    }

    // Check Three of a Kind
    if (trips.length > 0) {
        const t = trips[0];
        const kickers = sorted.filter(c => c.rank !== t).slice(0, 2);
        let score = 3000000 + (RANK_VALUE[t] * 1000);
        kickers.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(10, 1-i));
        
        return { rank: HAND_RANK.THREE_OF_A_KIND, name: HAND_NAMES[3], score: score };
    }

    // Check Two Pair
    if (pairs.length >= 2) {
        const p1 = pairs[0];
        const p2 = pairs[1];
        const kicker = sorted.find(c => c.rank !== p1 && c.rank !== p2);
        
        let score = 2000000 + (RANK_VALUE[p1] * 10000) + (RANK_VALUE[p2] * 100) + (kicker ? RANK_VALUE[kicker.rank] : 0);
        return { rank: HAND_RANK.TWO_PAIR, name: HAND_NAMES[2], score: score };
    }

    // Check Pair
    if (pairs.length === 1) {
        const p = pairs[0];
        const kickers = sorted.filter(c => c.rank !== p).slice(0, 3);
        let score = 1000000 + (RANK_VALUE[p] * 100000);
        kickers.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(10, 2-i));
        
        return { rank: HAND_RANK.PAIR, name: HAND_NAMES[1], score: score };
    }

    // High Card
    const kickers = sorted.slice(0, 5);
    let score = 0;
    kickers.forEach((c, i) => score += RANK_VALUE[c.rank] * Math.pow(10, 4-i));
    
    return { rank: HAND_RANK.HIGH_CARD, name: HAND_NAMES[0], score: score };
}
