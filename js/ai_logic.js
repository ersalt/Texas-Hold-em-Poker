/**
 * AI Logic Controller
 * Implements advanced decision making for Poker Bot based on difficulty levels
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
        
        // 2. Short Stack Logic check (< 20BB logic is handled by is_short_stack flag in params, or dynamic calc)
        // The params calculation already sets 'is_short_stack' if bb_depth < 20
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
            // Open Bet Threshold = Playable Range * Position Factor
            // Position Factor: Late positions (High factor) should make threshold LOWER? 
            // Wait, usually Late position = wider range = lower threshold.
            // My getPositionFactor returns > 1 for Late.
            // If threshold = range * factor, then Late (1.3) * 0.5 = 0.65 (Stricter?)
            // Usually we want Late to be looser.
            // Let's invert the logic or adjust factor.
            // User pseudocode: open_threshold = params.playable_range * GetPositionFactor(ai.position, stage)
            // Let's assume User's GetPositionFactor returns < 1 for Late?
            // "playable_range" is "top X% hands". e.g. 0.55 means top 55%.
            // If HandStrength is 0-1 where 1 is best.
            // If I have top 55% hands, that means strength > (1 - 0.55) = 0.45?
            // Or does playable_range mean "Min Strength required"?
            // "playable_range: 0.55 // 可玩前55%起手牌" -> This suggests VPIP.
            // If HandStrength is absolute (0-1), then a lower threshold means wider range.
            // So for Late position, we want LOWER threshold.
            // So OpenThreshold = BaseThreshold / PositionFactor.
            
            // Let's interpret "playable_range" as "Minimum Strength to Play". 
            // T0 (Tight) has playable_range 0.55? Wait.
            // T0 (Aggressive/Strong): playable_range 0.55 (Wider?)
            // T2 (Weak): playable_range 0.30 (Tighter?) 
            // Usually Fish play wide (High VPIP). T2 VPIP is 0.22 (Low?).
            // The provided config: T0 VPIP 0.45 (Loose/Aggro), T2 VPIP 0.22 (Tight/Passive).
            
            // So T0 plays more hands. Threshold should be lower.
            // If playable_range = 0.55. Does it mean Strength > 0.45?
            // Let's stick to the user's pseudo-code structure but adapt the math to make sense.
            // User: IF hand_strength > open_threshold
            // User: open_threshold = params.playable_range * GetPositionFactor
            // If T0 range is 0.55. If factor is 1. 0.55 threshold.
            // If T2 range is 0.30. Threshold 0.30.
            // This would mean T2 plays MORE hands (anything > 0.3) than T0 (> 0.55).
            // This contradicts T0 VPIP 0.45 vs T2 VPIP 0.22.
            
            // INTERPRETATION: params.playable_range is actually "1 - Threshold" or similar "Percentile".
            // But let's look at the check: hand_strength > open_threshold.
            // To match VPIP 0.45 (T0), we need threshold around 0.55 (assuming uniform distribution).
            // To match VPIP 0.22 (T2), we need threshold around 0.78.
            
            // The user's `playable_range` values are: T0: 0.55, T1: 0.40, T2: 0.30.
            // If I use `threshold = 1 - params.playable_range`:
            // T0: 1 - 0.55 = 0.45. Strength > 0.45. (Matches VPIP ~45%)
            // T2: 1 - 0.30 = 0.70. Strength > 0.70. (Matches VPIP ~30%)
            // This makes perfect sense.
            
            // Position Factor:
            // Late Position -> Play looser -> Lower Threshold.
            // My PositionFactor: Early 0.8, Late 1.3.
            // So: threshold = (1 - params.playable_range) / positionFactor.
            
            const baseThreshold = 1.0 - params.playable_range;
            const openThreshold = baseThreshold / positionFactor;
            
            if (handStrength > openThreshold) {
                // Raise Size affected by PFR (Aggression)
                // params.pfr is 0.15 - 0.28.
                // User Logic: raise_size = CalculateRaiseSize(stage, pot_size, params.pfr)
                
                // Let's calculate a raise amount
                // More PFR -> Larger raise? Or just frequency?
                // Logic: Raise amount usually relative to pot.
                // PFR is PreFlop Raise frequency. 
                // Let's use pfr as a scalar for sizing? 
                // Or maybe just random bet within range?
                
                // My interpretation: Raise between Min and (Pot * (1 + pfr))
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
            
            // Call Threshold influenced by VPIP
            // User: call_threshold = 0.35 * (0.8 + params.vpip * 0.5)
            // T0 (VPIP 0.45) -> 0.35 * (0.8 + 0.225) = 0.35 * 1.025 = 0.36
            // T2 (VPIP 0.22) -> 0.35 * (0.8 + 0.11) = 0.35 * 0.91 = 0.31
            // T0 (Aggro) requires HIGHER strength to Call? (Maybe prefers raising?)
            // Or maybe strictness. 
            // Let's just use the formula provided.
            const callThreshold = 0.35 * (0.8 + params.vpip * 0.5);
            
            if (handStrength > callThreshold && handStrength > potOdds) {
                // Check for 3-Bet / Raise
                // User: three_bet_threshold = 0.70 * (0.9 - params.three_bet * 0.3)
                // T0 (3bet 0.05) -> 0.7 * (0.9 - 0.015) = 0.62
                // T2 (3bet 0.20) -> 0.7 * (0.9 - 0.06) = 0.58
                // T2 raises with weaker hands? (Aggressive Fish?)
                
                const threeBetThreshold = 0.70 * (0.9 - params.three_bet * 0.3);
                
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
        // Strong defined as > 0.7
        if (handStrength > 0.7) {
            return { type: 'fold' }; // Big Mistake
        } else {
            // Call with weak hand
            // If toCall is huge (Allin), maybe don't suicide completely unless very high error rate?
            // But "mistake" implies doing it anyway.
            if (toCall < stack) {
                return { type: 'call' };
            } else {
                return { type: 'fold' }; // Save from all-in suicide on error?
            }
        }
    }

    shortStackLogic(handStrength, stack, toCall) {
        // User Logic:
        // > 0.75 -> All In
        // > 0.60 AND toCall < 30% Stack -> Call
        // Else -> Fold
        
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
        
        // Add some randomness so AI doesn't bet exact formulas always
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
            // High Card: 0 - 1M -> 0.0 - 0.2
            // Pair: 1M - 2M -> 0.2 - 0.4
            // Two Pair: 2M - 3M -> 0.4 - 0.5
            // Three of a Kind: 3M - 4M -> 0.5 - 0.6
            // Straight: 4M - 5M -> 0.6 - 0.7
            // Flush: 5M - 6M -> 0.7 - 0.8
            // Full House: 6M - 7M -> 0.8 - 0.9
            // Quads+: -> 0.9 - 1.0
            
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
            case 'early': base = 0.8; break;
            case 'middle': base = 1.0; break;
            case 'late': base = 1.3; break;
            case 'blind': base = 0.9; break;
        }
        if (stage === 'RIVER') base *= 0.9;
        return base;
    }
}
