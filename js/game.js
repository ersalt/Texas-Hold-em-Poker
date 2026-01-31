// Game Controller
class Game {
    constructor() {
        this.deck = new Deck();
        this.players = [];
        this.communityCards = [];
        this.pot = 0;
        this.ui = new UI();
        this.state = 'IDLE'; // IDLE, PREFLOP, FLOP, TURN, RIVER, SHOWDOWN
        
        // Game Logic State
        this.dealerIndex = 5; // Fixed Dealer at Seat 5 (Opposite User 0)
        this.sbIndex = -1;    // Track Small Blind position
        
        this.currentActor = -1; // Index of player whose turn it is
        this.minBet = 0; // Current round minimum bet (to call)
        this.currentBet = 0; // Current highest bet on table this street
        this.lastRaise = 0; // Amount of last raise (for min raise calc)
        
        // Promises for turn handling
        this.resolveTurn = null;
    }

    init(overrideUserChips) {
        this.ui.log("Game Initializing...");
        
        // Reset state
        this.players = [];
        this.communityCards = [];
        this.deck = new Deck(); 
        this.pot = 0;
        this.ui.reset(); 
        
        // Setup Players
        const settings = (window.getGameSettings && typeof window.getGameSettings === 'function') ? window.getGameSettings() : {nickname: '我', playerChips: 1000, aiChips: 1000};

        // Use override chips if provided
        const userChips = (typeof overrideUserChips !== 'undefined') ? overrideUserChips : Number(settings.playerChips);

        // Name Pool
        const namePool = ['刀客', '镖师', '账房', '说书', '茶客', '赌坊', '码头', '客栈', '戏班', '码头', '盐商', '马帮'];
        // Shuffle names
        for (let i = namePool.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [namePool[i], namePool[j]] = [namePool[j], namePool[i]];
        }

        // Player 0 is Human
        this.players.push(new Player(settings.nickname, false, Number(settings.playerChips)));
        
        // Players 1-9 are AI
        for (let i = 1; i < 10; i++) {
            let name = namePool[i-1] || `玩家 ${i}`;
            this.players.push(new Player(name, true, Number(settings.aiChips)));
        }
        
        this.ui.initPlayers(this.players);
        
        // Fixed Dealer at Seat 5
        this.dealerIndex = 5;
        
        // Initial SB is Dealer's left (Clockwise next)
        // Dealer(5) -> 4
        this.sbIndex = this.getNextPlayerIndex(this.dealerIndex, 1);
        
        this.updateRoles();
        this.startGame();
    }

    // Helper to get next player index in Clockwise order (Decreasing Index)
    // 4 -> 3 -> 2 -> 1 -> 0 -> 9 -> 8 -> 7 -> 6 -> 5 -> 4
    getNextPlayerIndex(current, steps = 1) {
        let idx = current - steps;
        while (idx < 0) idx += 10;
        return idx % 10;
    }

    // Helper to get next player skipping Dealer(5)
    // Used for finding Next SB or Next BB
    getNextNonDealerIndex(current, steps = 1) {
        let idx = current;
        for(let i=0; i<steps; i++) {
            idx = this.getNextPlayerIndex(idx, 1);
            if (idx === this.dealerIndex) {
                idx = this.getNextPlayerIndex(idx, 1);
            }
        }
        return idx;
    }

    updateRoles() {
        // Clear roles
        this.players.forEach(p => p.role = null);
        
        const dealer = this.dealerIndex;
        const sb = this.sbIndex;
        
        // BB is next non-dealer after SB
        const bb = this.getNextNonDealerIndex(sb, 1);

        this.players[dealer].role = 'dealer';
        this.players[sb].role = 'small-blind';
        this.players[bb].role = 'big-blind';
        
        // Refresh UI
        this.ui.initPlayers(this.players); 
    }

    async startGame() {
        this.ui.log("--- New Hand ---");
        this.ui.reset();
        this.deck.init(); // Reset deck
        this.deck.shuffle();
        this.communityCards = [];
        this.pot = 0;
        this.state = 'PREFLOP';
        this.currentBet = 0;
        
        // Reset player states for new hand
        this.players.forEach(p => {
            p.folded = false;
            p.hand = [];
            p.currentBet = 0;
            p.handStrength = null;
        });
        
        // Blinds
        const sbIndex = this.sbIndex;
        const bbIndex = this.getNextNonDealerIndex(sbIndex, 1);
        
        // Hardcoded Blinds for now (should come from Room Config)
        const SB_AMOUNT = 10;
        const BB_AMOUNT = 20;
        
        this.postBlind(sbIndex, SB_AMOUNT);
        this.postBlind(bbIndex, BB_AMOUNT);
        this.minBet = BB_AMOUNT;
        this.currentBet = BB_AMOUNT;
        this.lastRaise = BB_AMOUNT; // Initial "raise" is the BB

        // Deal Cards
        await this.dealHoleCards();
        
        // Preflop Betting Round
        // Action starts Left of BB (Clockwise: BB -> Next)
        // Next from BB (Index - 1)
        let firstActor = this.getNextPlayerIndex(bbIndex, 1);
        await this.bettingRound(firstActor);

        if (this.countActivePlayers() > 1) {
            // Flop
            this.state = 'FLOP';
            await this.dealCommunityCards(3);
            // Action starts Left of Dealer (SB)
            await this.bettingRound(this.getNextPlayerIndex(this.dealerIndex, 1));
        }

        if (this.countActivePlayers() > 1) {
            // Turn
            this.state = 'TURN';
            await this.dealCommunityCards(1);
            await this.bettingRound(this.getNextPlayerIndex(this.dealerIndex, 1));
        }

        if (this.countActivePlayers() > 1) {
            // River
            this.state = 'RIVER';
            await this.dealCommunityCards(1);
            await this.bettingRound(this.getNextPlayerIndex(this.dealerIndex, 1));
        }

        // Showdown
        await this.showdown();
    }

    postBlind(playerIndex, amount) {
        const player = this.players[playerIndex];
        const actual = Math.min(player.chips, amount);
        player.chips -= actual;
        player.currentBet = actual; // Track bet for this round
        this.pot += actual;
        this.ui.updateBalance(this.players);
        this.ui.updatePot(this.pot);
        this.ui.updatePlayerBet(playerIndex, actual); // Update visual bet
        this.ui.log(`${player.name} posts blind ${actual}`);
    }

    async dealHoleCards() {
        // Deal Order: Starts from SB, goes Clockwise
        const sbIndex = this.sbIndex;
        
        const dealOrder = [];
        // We want order: SB, SB-1, SB-2...
        // So logic: getNextPlayerIndex(sbIndex, i)
        
        for (let i = 0; i < 10; i++) {
            const pIdx = this.getNextPlayerIndex(sbIndex, i);
            // Only deal to players with chips
            if (this.players[pIdx].chips > 0) {
                dealOrder.push(pIdx);
            } else {
                // Mark players with 0 chips as folded/inactive so they are skipped in logic
                this.players[pIdx].folded = true;
            }
        }

        // Card 1
        for (const playerIndex of dealOrder) {
            const player = this.players[playerIndex];
            const card = this.deck.deal();
            player.receiveCard(card);
            await this.ui.animateDeal(playerIndex, card, playerIndex === 0, 0);
        }

        // Card 2
        for (const playerIndex of dealOrder) {
            const player = this.players[playerIndex];
            const card = this.deck.deal();
            player.receiveCard(card);
            await this.ui.animateDeal(playerIndex, card, playerIndex === 0, 0);
        }

        this.setupControls();
    }
    
    async dealCommunityCards(count) {
        this.ui.log(`Dealing ${count} cards for ${this.state}`);
        const newCards = [];
        const startIndex = this.communityCards.length;
        
        for (let i = 0; i < count; i++) {
            newCards.push(this.deck.deal());
        }
        this.communityCards.push(...newCards);
        
        // Animate dealing
        for (let i = 0; i < newCards.length; i++) {
            await this.ui.animateCommunityDeal(newCards[i], startIndex + i);
        }
    }

    async bettingRound(startIndex) {
        this.ui.log(`--- Betting Round: ${this.state} ---`);
        
        let activePlayers = this.getActivePlayers();
        // Check active players with chips > 0
        const activeWithChips = activePlayers.filter(p => p.chips > 0);
        
        // If only 1 player left or (1 active player and others all-in/folded), round ends
        if (activePlayers.length <= 1 || (activeWithChips.length === 0 && activePlayers.length > 0)) {
             // Everyone is all-in or folded, proceed
             return;
        }
        // If only 1 player has chips and others are all-in, we still need to allow that player to call/check if needed?
        // Usually if everyone is All-In except maybe one, betting is done.
        
        if (this.state !== 'PREFLOP') {
            this.players.forEach(p => p.currentBet = 0);
            this.currentBet = 0;
            this.lastRaise = 0; 
            this.minBet = 20; 
        }
        
        // Build Queue of Actors in Clockwise Order starting from startIndex
        let actors = [];
        for (let i = 0; i < this.players.length; i++) {
            let idx = this.getNextPlayerIndex(startIndex, i);
            let player = this.players[idx];
            // Skip folded players and players with 0 chips (All-in)
            if (!player.folded && player.chips > 0) {
                 actors.push(idx);
            }
        }
        
        // If no actors can act (all-in or folded), return immediately
        if (actors.length === 0) return;
        
        let highestBet = this.currentBet;
        let raiserIndex = startIndex; 
        
        // Adjust raiserIndex logic for Preflop
        // In Preflop, we start at UTG. The 'aggressor' to match is BB.
        // BB is 2 steps BEFORE UTG (counter-clockwise).
        // UTG = BB - 1 (Clockwise 1 step)
        // So BB = UTG + 1 (Counter-Clockwise 1 step) => getNextPlayerIndex(UTG, -1)
        
        if (this.state === 'PREFLOP') {
             // startIndex is UTG
             // BB is previous player
             raiserIndex = this.getNextPlayerIndex(startIndex, -1);
        } else {
             raiserIndex = null; 
        }

        let i = 0;
        let actedCount = 0;
        let steps = 0;
        
        while (steps < 200) { 
            let pIdx = actors[i];
            let player = this.players[pIdx];
            
            if (player.folded || player.chips === 0) {
                // skip
            } else {
                this.currentActor = pIdx;
                const allSeats = document.querySelectorAll('.player-seat');
                allSeats.forEach(s => s.classList.remove('active-turn'));
                const seat = document.getElementById(`seat-${pIdx}`);
                if(seat) seat.classList.add('active-turn');

                let action = null;
                if (player.isAI) {
                    // Random delay 1-3 seconds
                    const delay = 1000 + Math.random() * 2000;
                    await new Promise(r => setTimeout(r, delay)); 
                    action = this.getAIAction(player, highestBet);
                } else {
                    this.enableControls(highestBet, player.currentBet);
                    action = await this.waitForHumanAction();
                    this.disableControls();
                }
                
                this.processAction(player, action, highestBet);
                
                highestBet = this.currentBet;
                if (action.type === 'raise' || action.type === 'bet' || action.type === 'allin') {
                     if (action.type === 'raise' || (action.type === 'allin' && player.currentBet > highestBet)) {
                         raiserIndex = pIdx;
                     }
                }
            }
            
            let nextIdx = actors[(i + 1) % actors.length];
            
            if (raiserIndex === null) {
                 if (actedCount >= actors.length - 1) break; 
            } else if (nextIdx === raiserIndex) {
                 break;
            }
            
            if (this.countActivePlayers() === 1) break;

            i = (i + 1) % actors.length;
            actedCount++;
            steps++;
        }
        
        document.querySelectorAll('.player-seat').forEach(s => s.classList.remove('active-turn'));
    }
    
    async processAction(player, action, highestBet) {
        this.ui.log(`${player.name}: ${action.type} ${action.amount || ''}`);
        
        // Handle logic & animation
        switch (action.type) {
            case 'fold':
                player.folded = true;
                // Maybe dim player
                break;
            case 'check':
                this.ui.playSound('过牌1.mp3');
                break;
            case 'call':
                let callAmt = highestBet - player.currentBet;
                if (callAmt > player.chips) callAmt = player.chips; 
                player.chips -= callAmt;
                player.currentBet += callAmt;
                this.pot += callAmt;
                this.ui.updateBalance(this.players); // Update chips immediately for visual correctness
                
                // Animate chips
                await this.ui.animateBet(this.players.indexOf(player), player.currentBet);
                this.ui.updatePlayerBet(this.players.indexOf(player), player.currentBet);
                
                // this.ui.playSound('下注1.mp3'); // Sound handled in animation
                break;
            case 'raise':
                let totalBet = action.amount;
                let added = totalBet - player.currentBet;
                
                player.chips -= added;
                player.currentBet += added;
                this.pot += added;
                
                let raiseDiff = totalBet - this.currentBet;
                if (raiseDiff > 0) this.lastRaise = raiseDiff;
                this.currentBet = totalBet;
                this.ui.updateBalance(this.players);

                // Animate chips
                await this.ui.animateBet(this.players.indexOf(player), player.currentBet);
                this.ui.updatePlayerBet(this.players.indexOf(player), player.currentBet);
                
                // this.ui.playSound('下注2.mp3'); // Sound handled in animation? (Maybe override)
                break;
             case 'allin':
                 let allInAmt = player.chips;
                 player.chips = 0;
                 player.currentBet += allInAmt;
                 this.pot += allInAmt;
                 if (player.currentBet > this.currentBet) {
                     let diff = player.currentBet - this.currentBet;
                     this.lastRaise = Math.max(this.lastRaise, diff);
                     this.currentBet = player.currentBet;
                 }
                 this.ui.updateBalance(this.players);
                 
                 // Animate chips
                 await this.ui.animateBet(this.players.indexOf(player), player.currentBet);
                 this.ui.updatePlayerBet(this.players.indexOf(player), player.currentBet);
                 
                 this.ui.playSound('all in.mp3');
                 break;
        }
        // Pot update logic
        this.ui.updatePot(this.pot);
    }
    
    getAIAction(player, highestBet) {
        const toCall = highestBet - player.currentBet;
        const random = Math.random();
        
        if (toCall > 0) {
            if (random < 0.1) return { type: 'fold' };
            if (random < 0.9) return { type: 'call' };
             let minRaise = highestBet + this.lastRaise;
             if (player.chips > minRaise) {
                 return { type: 'raise', amount: minRaise }; 
             }
             return { type: 'call' };
        } else {
            if (random < 0.8) return { type: 'check' };
            let minBet = this.minBet || 20;
            if (player.chips > minBet) {
                return { type: 'raise', amount: minBet }; 
            }
            return { type: 'check' };
        }
    }

    waitForHumanAction() {
        return new Promise(resolve => {
            this.resolveTurn = resolve;
        });
    }

    humanAction(actionType, amount) {
        if (!this.resolveTurn) return;
        
        let actionObj = { type: actionType };
        if (actionType === 'raise') {
             actionObj.amount = amount; 
        }
        
        this.resolveTurn(actionObj);
        this.resolveTurn = null;
    }

    setupControls() {
        const btnRaise = document.getElementById('btn-raise');
        const newBtnRaise = btnRaise.cloneNode(true);
        btnRaise.parentNode.replaceChild(newBtnRaise, btnRaise);
        
        newBtnRaise.addEventListener('click', () => {
             const player = this.players[0];
             const minRaiseAmt = this.currentBet + (this.lastRaise > 0 ? this.lastRaise : this.minBet);
             const maxRaise = player.chips + player.currentBet; 
             
             this.ui.showRaiseControl(minRaiseAmt, maxRaise, this.pot, (val) => {
                 this.humanAction('raise', val);
             });
        });

        ['fold', 'check', 'call', 'allin'].forEach(action => {
            const btn = document.getElementById(`btn-${action}`);
            if(btn) {
                const newBtn = btn.cloneNode(true);
                btn.parentNode.replaceChild(newBtn, btn);
                newBtn.addEventListener('click', () => {
                    this.humanAction(action);
                });
            }
        });
        
        this.disableControls();
    }
    
    enableControls(highestBet, currentBet) {
        const toCall = highestBet - currentBet;
        
        const btnCheck = document.getElementById('btn-check');
        const btnCall = document.getElementById('btn-call');
        const btnRaise = document.getElementById('btn-raise');
        const btnFold = document.getElementById('btn-fold');
        const btnAllin = document.getElementById('btn-allin');
        
        [btnCheck, btnCall, btnRaise, btnFold, btnAllin].forEach(b => {
             b.disabled = false;
             b.style.opacity = '1';
             b.style.display = 'inline-block';
        });

        if (toCall > 0) {
            btnCheck.disabled = true;
            btnCheck.style.opacity = '0.5';
            btnCall.textContent = `跟注 $${toCall}`;
            btnCall.style.display = 'inline-block';
        } else {
            btnCall.style.display = 'none'; 
        }
    }
    
    disableControls() {
        const btns = document.querySelectorAll('.game-btn');
        btns.forEach(b => {
            b.disabled = true;
            b.style.opacity = '0.5';
        });
    }

    getActivePlayers() {
        return this.players.filter(p => !p.folded);
    }
    
    countActivePlayers() {
        return this.getActivePlayers().length;
    }
    
    async showdown() {
        this.ui.log("--- Showdown ---");
        let active = this.getActivePlayers();
        if (active.length === 1) {
            this.distributePot([active[0]]);
            return;
        }
        
        active.forEach(p => {
            this.ui.renderCards(p.hand, `hand-${this.players.indexOf(p)}`, true);
        });
        
        active.forEach(p => {
            p.handStrength = evaluateHand([...p.hand, ...this.communityCards]);
            this.ui.log(`${p.name}: ${p.handStrength.name}`);
        });
        
        active.sort((a,b) => b.handStrength.score - a.handStrength.score);
        let bestScore = active[0].handStrength.score;
        let winners = active.filter(p => p.handStrength.score === bestScore);
        
        this.distributePot(winners);
    }
    
    async distributePot(winners) {
        const share = Math.floor(this.pot / winners.length);
        this.ui.log(`Winner(s): ${winners.map(w=>w.name).join(', ')} win $${share}`);
        
        // Animate Pot to Winner(s)
        // If multiple, just animate to first for now or loop
        for (const w of winners) {
            await this.ui.animatePotWin(this.players.indexOf(w));
        }

        winners.forEach(w => {
            w.chips += share;
        });
        this.ui.updateBalance(this.players);
        this.pot = 0;
        this.ui.updatePot(0);
        
        let msg = `Winner: ${winners[0].name}`;
        if (winners[0].handStrength) msg += `
${winners[0].handStrength.name}`;
        
        setTimeout(() => alert(msg), 500);
        
        setTimeout(() => {
             // Rotation Logic: SB moves clockwise, skipping Dealer
             // Dealer (5) is fixed
             // Move SB
             this.sbIndex = this.getNextNonDealerIndex(this.sbIndex, 1);
             
             this.updateRoles();
             this.startGame();
        }, 3000);
    }
}
