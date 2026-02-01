/**
 * AI Logic Controller
 * Implements advanced decision making for Poker Bot based on difficulty levels
 *  修正版：修复了 Call Threshold 与 VPIP 关系颠倒的问题
 */

class AILogic {
    constructor(game) {
        this.game = game;
    }

    // Main Decision Function
    decide(player, highestBet, stage, communityCards, potSize) {
        // Get AI params (assigned in Game.init) or default to T1
        const params = player.aiParams || GAME_CONFIG.BASE_PARAMS['T1'];
        
        const holeCards = player.hand;
        const stack = player.chips;
        const toCall = highestBet - player.currentBet;
        
        // 1. Calculate Hand Strength
        const handStrength = this.calculateHandStrength(holeCards, communityCards, stage);
        
        // 2. Short Stack Logic check
        if (params.is_short_stack) {
            return this.shortStackLogic(handStrength, stack, toCall);
        }

        // 3. Error Injection (Simulate Human Mistakes)
        if (Math.random() < params.error_rate) {
            return this.randomWeakDecision(handStrength, toCall, stack);
        }

        const position = this.getPosition(player);
        const positionFactor = this.getPositionFactor(position, stage);

        // 4. Decision Tree
        
        // Case: No one bet yet (toCall == 0)
        if (toCall <= 0) {
            // Open Bet Threshold
            // playable_range: 可玩前 X% 起手牌 (如 0.55 = 前 55%)
            // 阈值 = 1 - playable_range → 值越低表示玩得越松
            // Late 位置 (factor > 1) → 阈值更低 → 范围更宽 ✅
            const baseThreshold = 1.0 - params.playable_range;
            const openThreshold = baseThreshold / positionFactor;
            
            if (handStrength > openThreshold) {
                // Raise Size influenced by PFR (Pre-Flop Raise frequency)
                const maxBet = potSize * (1 + params.pfr * 2); 
                return { type: 'raise', amount: this.calculateRaiseAmount(maxBet, highestBet) };
            } else {
                return { type: 'check' };
            }
        } 
        // Case: Someone bet (toCall > 0)
        else {
            // Pot Odds = Call Amount / (Total Pot after Call)
            const potOdds = toCall / (potSize + toCall);
            
            //  修正：VPIP 越高 → 跟注阈值越低（玩得更松）
            // T0 (VPIP=0.45) → 0.365 | T2 (VPIP=0.22) → 0.434
            const callThreshold = Math.max(0.25, 0.5 - params.vpip * 0.3);
            
            if (handStrength > callThreshold && handStrength > potOdds) {
                //  修正：three_bet 越高 → 3-bet 阈值越低（更激进）
                // T0 (3bet=0.05) → 0.71 | T2 (3bet=0.20) → 0.60
                const threeBetThreshold = Math.max(0.5, 0.75 - params.three_bet * 0.3);
                
                if (handStrength > threeBetThreshold && Math.random() < params.three_bet) {
                    return { type: 'raise', amount: this.calculateRaiseAmount(toCall * 2.8, highestBet) };
                }
                
                return { type: 'call' };
            }
            
            // Bluff Logic (Medium/Weak hand + Dry Board)
            if (handStrength < 0.4 && this.isDryBoard(communityCards) && Math.random() < params.bluff) {
                return { type: 'raise', amount: this.calculateRaiseAmount(toCall * 2.0, highestBet) };
            }
            
            return { type: 'fold' };
        }
    }

    // --- Specific Logic Implementations ---

    randomWeakDecision(handStrength, toCall, stack) {
        // 20% probability to Fold Strong or Call Weak (Mistake)
        if (handStrength > 0.7) {
            return { type: 'fold' }; // Big Mistake: 强牌弃牌
        } else {
            // Call with weak hand
            if (toCall < stack) {
                return { type: 'call' }; // Mistake: 弱牌跟注
            } else {
                return { type: 'fold' }; // 避免全下自杀
            }
        }
    }

    shortStackLogic(handStrength, stack, toCall) {
        // Short stack logic: 全下/跟注/弃牌
        if (handStrength > 0.75) {
            return { type: 'allin' };
        } else if (handStrength > 0.60 && toCall < stack * 0.3) {
            return { type: 'call' };
        } else {
            return { type: 'fold' };
        }
    }

    // --- Helpers ---

    getMinRaise(highestBet) {
        const minRaise = highestBet + (this.game.lastRaise > 0 ? this.game.lastRaise : this.game.minBet);
        return minRaise;
    }
    
    calculateRaiseAmount(targetAmount, highestBet) {
        const min = this.getMinRaise(highestBet);
        const max = min + this.game.pot; // Reasonable Cap
        let amount = Math.max(min, targetAmount);
        
        // Add randomness to avoid predictable betting patterns
        amount = amount * (0.9 + Math.random() * 0.2);
        
        return Math.floor(amount);
    }

    isDryBoard(communityCards) {
        if (communityCards.length < 3) return true; // Preflop/Early
        
        // Check for Flush Draws
        const suits = {};
        communityCards.forEach(c => suits[c.suit] = (suits[c.suit] || 0) + 1);
        const maxSuit = Math.max(...Object.values(suits));
        
        // Check for Straight possibilities (Close ranks)
        const ranks = communityCards.map(c => this.getRankValue(c.rank)).sort((a,b) => a-b);
        let connected = 0;
        for (let i = 0; i < ranks.length - 1; i++) {
            if (ranks[i+1] - ranks[i] <= 2) connected++;
        }
        
        // Dry if no flush draw (maxSuit < 3) and few connections
        return maxSuit < 3 && connected < 2;
    }

    calculateHandStrength(hole, board, stage) {
        if (stage === 'PREFLOP') {
            return this.preflopHandRank(hole);
        } else {
            // Use existing evaluator
            const currentEval = evaluateHand([...hole, ...board]);
            
            // Normalize score (0 - ~9M) to 0.0 - 1.0
            let baseScore = currentEval.score;
            let normalized = 0;
            
            if (baseScore < 1000000) normalized = (baseScore / 1000000) * 0.2;
            else if (baseScore < 2000000) normalized = 0.2 + ((baseScore - 1000000) / 1000000) * 0.2;
            else if (baseScore < 3000000) normalized = 0.4 + ((baseScore - 2000000) / 1000000) * 0.1;
            else if (baseScore < 4000000) normalized = 0.5 + ((baseScore - 3000000) / 1000000) * 0.1;
            else if (baseScore < 5000000) normalized = 0.6 + ((baseScore - 4000000) / 1000000) * 0.1;
            else if (baseScore < 6000000) normalized = 0.7 + ((baseScore - 5000000) / 1000000) * 0.1;
            else if (baseScore < 7000000) normalized = 0.8 + ((baseScore - 6000000) / 1000000) * 0.1;
            else normalized = 0.9 + ((baseScore - 7000000) / 3000000) * 0.1;
            
            return normalized;
        }
    }

    preflopHandRank(hole) {
        const c1 = hole[0];
        const c2 = hole[1];
        const v1 = this.getRankValue(c1.rank);
        const v2 = this.getRankValue(c2.rank);
        const maxV = Math.max(v1, v2);
        
        // Pairs
        if (v1 === v2) {
            if (v1 >= 10) return 0.95; // JJ+
            if (v1 >= 7) return 0.7; // 77-TT
            return 0.5; // 22-66
        }
        
        const isSuited = c1.suit === c2.suit;
        
        // High Cards
        if (maxV >= 13) { // K, A
             if (v1 + v2 > 24) return 0.85; // AK, AQ, KQ
             if (isSuited) return 0.75;
             return 0.6;
        }
        
        if (maxV >= 11) { // J, Q
            if (isSuited) return 0.55;
            return 0.4;
        }
        
        // Connectors
        if (Math.abs(v1 - v2) <= 1) {
            if (isSuited) return 0.5;
            return 0.35;
        }
        
        // Suited Gappers
        if (isSuited && Math.abs(v1 - v2) <= 3) return 0.3;

        return 0.1; 
    }
    
    getRankValue(rank) {
        const rankValue = {
            '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7, '8': 8, '9': 9, '10': 10,
            'J': 11, 'Q': 12, 'K': 13, 'A': 14
        };
        return rankValue[rank] || 0;
    }
    
    getPosition(player) {
        const dealerIdx = this.game.dealerIndex;
        const playerIdx = this.game.players.indexOf(player);
        let dist = (playerIdx - dealerIdx + 10) % 10;
        
        if (dist === 1 || dist === 2) return 'blind';
        if (dist >= 3 && dist <= 5) return 'early';
        if (dist >= 6 && dist <= 8) return 'middle';
        return 'late';
    }
    
    getPositionFactor(position, stage) {
        let base = 1.0;
        switch(position) {
            case 'early': base = 0.8; break;   // Early: 紧 (阈值更高)
            case 'middle': base = 1.0; break;  // Middle: 标准
            case 'late': base = 1.3; break;    // Late: 松 (阈值更低)
            case 'blind': base = 0.9; break;   // Blind: 稍紧
        }
        if (stage === 'RIVER') base *= 0.9;    // River 阶段更谨慎
        return base;
    }
}