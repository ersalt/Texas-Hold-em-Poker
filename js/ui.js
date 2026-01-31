// UI Handling
class UI {
    constructor() {
        this.tableElement = document.getElementById('game-table');
        this.playerArea = document.getElementById('players-area');
        this.communityCardsArea = document.getElementById('community-cards');
    }

    log(message) {
        console.log(`[Game]: ${message}`);
        // Could also update a status display on screen
    }

    initPlayers(players) {
        this.playerArea.innerHTML = '';
        players.forEach((player, index) => {
            const seatEl = document.createElement('div');
            seatEl.className = `player-seat seat-${index}`;
            seatEl.id = `seat-${index}`;
            
            // Identify User
            if (!player.isAI) {
                seatEl.classList.add('is-user');
            }

            // Identify Role (if assigned)
            if (player.role) {
                seatEl.classList.add(`role-${player.role}`);
            }
            
            // Avatar (Display Name inside) - NOW A BUTTON
            const avatar = document.createElement('button');
            avatar.className = 'avatar';
            avatar.innerText = player.name; // Full name inside circle
            avatar.disabled = true; // Make it non-clickable/inactive behavior
            // Remove disabled styling if browser applies opacity
            avatar.style.opacity = '1'; 
            
            // Info (Chips only)
            const info = document.createElement('div');
            info.className = 'player-info';
            info.innerHTML = `
                <div class="player-chips">$${player.chips}</div>
            `;

            // Role Indicator
            let roleText = '';
            if (player.role === 'dealer') roleText = 'D (庄)';
            else if (player.role === 'small-blind') roleText = 'SB (小盲)';
            else if (player.role === 'big-blind') roleText = 'BB (大盲)';

            const roleEl = document.createElement('div');
            roleEl.className = 'role-indicator';
            roleEl.innerText = roleText;
            roleEl.style.display = roleText ? 'block' : 'none'; // Hide if no role

            // Hand Container
            const handEl = document.createElement('div');
            handEl.className = 'hand-cards';
            handEl.id = `hand-${index}`;
            
            // Bet Chips Display (Hidden initially)
            const betChips = document.createElement('div');
            betChips.className = 'chip-stack bet-chips hidden';
            betChips.id = `bet-chips-${index}`;
            
            // Append Bet Chips to Hand Element for relative positioning
            handEl.appendChild(betChips);

            seatEl.appendChild(avatar);
            seatEl.appendChild(info);
            seatEl.appendChild(roleEl); // Add role below info
            seatEl.appendChild(handEl);
            
            this.playerArea.appendChild(seatEl);
        });
    }

    renderPlayer(player) {
        // Update specific player UI if needed
    }

    renderCards(cards, elementId, isFaceUp = true) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        if (elementId === 'community-cards') {
            const slots = element.querySelectorAll('.card-slot');
            // If slots exist, fill them instead of wiping the container
            if (slots.length > 0) {
                slots.forEach(slot => slot.innerHTML = '');
                cards.forEach((card, index) => {
                    if (slots[index]) {
                        slots[index].appendChild(this.createCardElement(card, isFaceUp));
                    }
                });
                return;
            }
        }

        element.innerHTML = '';
        cards.forEach(card => {
            element.appendChild(this.createCardElement(card, isFaceUp));
        });
    }

    createCardElement(card, isFaceUp = true) {
        const cardEl = document.createElement('div');
        cardEl.className = 'card';
        
        if (isFaceUp && card) {
            // Determine color
            const isRed = card.suit === 'Hearts' || card.suit === 'Diamonds';
            cardEl.classList.add(isRed ? 'red' : 'black');
            
            // Get symbol
            let symbol = '';
            switch(card.suit) {
                case 'Hearts': symbol = '♥'; break;
                case 'Diamonds': symbol = '♦'; break;
                case 'Clubs': symbol = '♣'; break;
                case 'Spades': symbol = '♠'; break;
            }
            
            cardEl.innerHTML = `
                <div class="card-rank">${card.rank}</div>
                <div class="card-suit">${symbol}</div>
            `;
        } else {
            cardEl.classList.add('back');
        }
        return cardEl;
    }

    // Play sound helper
    playSound(soundFile) {
        // Use encodeURIComponent to handle Chinese characters and spaces in filenames
        const audio = new Audio(`assets/audio/${encodeURIComponent(soundFile)}`);
        audio.play().catch(e => console.warn('Audio play failed', e));
    }

    // New method for dealing animation
    animateDeal(playerIndex, card, isFaceUp = false, delay = 0) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.playSound('发牌2.mp3');
                const deckPile = document.getElementById('deck-pile');
                const targetContainer = document.getElementById(`hand-${playerIndex}`);
                
                if (!deckPile || !targetContainer) {
                    resolve();
                    return;
                }

                // Create a temporary flying card
                const flyingCard = document.createElement('div');
                flyingCard.className = 'card back flying-card';
                document.body.appendChild(flyingCard);

                // Get start position (Deck)
                const startRect = deckPile.getBoundingClientRect();
                flyingCard.style.left = `${startRect.left}px`;
                flyingCard.style.top = `${startRect.top}px`;

                // Force reflow
                flyingCard.offsetHeight;

                // Get end position (Player Hand)
                const existingCards = targetContainer.children.length;
                
                // Get container rect
                const targetRect = targetContainer.getBoundingClientRect();
                
                // Simple calculation: center of container + offset
                const cardWidth = 50; 
                const cardMargin = 4; // 2px margin on both sides
                const leftOffset = existingCards * (cardWidth + cardMargin);
                
                const endLeft = targetRect.left + leftOffset;
                const endTop = targetRect.top;

                // Animate
                flyingCard.style.transform = `translate(${endLeft - startRect.left}px, ${endTop - startRect.top}px)`;
                
                // When animation finishes
                setTimeout(() => {
                    document.body.removeChild(flyingCard);
                    
                    // Add actual card to player hand
                    const realCard = this.createCardElement(card, isFaceUp);
                    targetContainer.appendChild(realCard);
                    resolve();
                }, 500); // Matches CSS transition time

            }, delay);
        });
    }

    animateCommunityDeal(card, index, delay = 0) {
        return new Promise(resolve => {
            setTimeout(() => {
                this.playSound('发牌2.mp3');
                const deckPile = document.getElementById('deck-pile');
                const communityArea = this.communityCardsArea;
                
                // Find specific slot
                const slots = communityArea.querySelectorAll('.card-slot');
                const targetSlot = slots[index];

                if (!deckPile || !communityArea || !targetSlot) {
                     resolve();
                     return;
                }

                const flyingCard = document.createElement('div');
                flyingCard.className = 'card back flying-card';
                document.body.appendChild(flyingCard);

                const startRect = deckPile.getBoundingClientRect();
                flyingCard.style.left = `${startRect.left}px`;
                flyingCard.style.top = `${startRect.top}px`;
                
                flyingCard.offsetHeight;

                // Target is the slot itself
                const targetRect = targetSlot.getBoundingClientRect();
                
                const endLeft = targetRect.left;
                const endTop = targetRect.top;

                flyingCard.style.transform = `translate(${endLeft - startRect.left}px, ${endTop - startRect.top}px)`;

                setTimeout(() => {
                    document.body.removeChild(flyingCard);
                    const realCard = this.createCardElement(card, true);
                    // Append to the SLOT, not the area
                    targetSlot.innerHTML = ''; 
                    targetSlot.appendChild(realCard);
                    resolve();
                }, 500);

            }, delay);
        });
    }

    updateBalance(players) {
        // Update chip counts on screen
        players.forEach((player, index) => {
            const chipDisplay = document.querySelector(`#seat-${index} .player-chips`);
            if (chipDisplay) {
                chipDisplay.textContent = `$${player.chips}`;
            }
        });
    }

    updatePot(amount) {
        const potDisplay = document.getElementById('pot-display');
        const potChips = document.getElementById('pot-chips');
        
        if (potDisplay) {
            potDisplay.textContent = `底池（POT）：$${amount}`;
        }

        if (potChips) {
            if (amount <= 0) {
                potChips.classList.add('hidden');
                potChips.innerText = '';
            } else {
                potChips.classList.remove('hidden');
                potChips.innerText = this.formatChipText(amount);
                this.updateChipStyle(potChips, amount);
            }
        }
    }

    // Helper to format chip text (e.g., 1k for 1000 if needed, but requirements say 1-1000 so maybe just number)
    formatChipText(amount) {
        if (amount >= 10000) return (amount / 1000).toFixed(1) + 'k';
        return amount;
    }

    // Helper to update chip style based on amount
    updateChipStyle(element, amount) {
        // Clear previous content
        element.innerHTML = '';
        
        // Add text label
        const text = document.createElement('div');
        text.className = 'chip-text';
        text.innerText = this.formatChipText(amount);
        element.appendChild(text);

        // Determine stack size (Small, Medium, Large)
        let count = 0;
        if (amount >= 5000) {
            count = 8; // Big stack
        } else if (amount >= 1001) {
            count = 5; // Medium stack
        } else {
            count = 2; // Small stack
        }

        // Generate chips with random colors
        const colors = ['#e74c3c', '#3498db', '#f1c40f', '#2ecc71', '#9b59b6']; // Red, Blue, Gold, Green, Purple
        
        for (let i = 0; i < count; i++) {
            const chip = document.createElement('div');
            chip.className = 'chip-token';
            // Random color
            const randomColor = colors[Math.floor(Math.random() * colors.length)];
            chip.style.backgroundColor = randomColor;
            
            // Stack them vertically with slight random offset
            const offsetY = -i * 3; 
            const offsetX = (Math.random() - 0.5) * 4; 
            
            chip.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
            chip.style.zIndex = i;
            
            element.appendChild(chip);
        }
    }

    // Show Betting Chips for a Player
    updatePlayerBet(playerIndex, amount) {
        const chipEl = document.getElementById(`bet-chips-${playerIndex}`);
        if (!chipEl) return;

        if (amount <= 0) {
            chipEl.classList.add('hidden');
            chipEl.innerHTML = '';
        } else {
            chipEl.classList.remove('hidden');
            this.updateChipStyle(chipEl, amount);
        }
    }

    clearPlayerBets() {
        document.querySelectorAll('.bet-chips').forEach(el => {
            el.classList.add('hidden');
            el.innerText = '';
        });
    }

    // Animation for Betting
    animateBet(playerIndex, amount) {
        // Only animate if amount > 0
        if (amount <= 0) return Promise.resolve();

        return new Promise(resolve => {
            const playerSeat = document.getElementById(`seat-${playerIndex}`);
            const chipEl = document.getElementById(`bet-chips-${playerIndex}`);
            
            if (!playerSeat || !chipEl) {
                resolve();
                return;
            }

            // Create flying chip
            const flyingChip = document.createElement('div');
            flyingChip.className = 'chip-stack flying-chip';
            this.updateChipStyle(flyingChip, amount);
            // text added by updateChipStyle
            
            document.body.appendChild(flyingChip);

            // Start position (Player Avatar Center)
            const avatar = playerSeat.querySelector('.avatar');
            const startRect = avatar.getBoundingClientRect();
            
            flyingChip.style.left = `${startRect.left + startRect.width/2 - 20}px`; 
            flyingChip.style.top = `${startRect.top + startRect.height/2 - 20}px`;

            // Force reflow
            flyingChip.offsetHeight;

            // End position (Bet Chips Location)
            const wasHidden = chipEl.classList.contains('hidden');
            if (wasHidden) {
                chipEl.classList.remove('hidden'); 
                chipEl.style.opacity = '0'; 
            }
            
            const targetRect = chipEl.getBoundingClientRect();
            
            if (wasHidden) {
                chipEl.classList.add('hidden');
                chipEl.style.opacity = '1';
            }

            const endLeft = targetRect.left;
            const endTop = targetRect.top;

            // Animate
            const currentLeft = parseFloat(flyingChip.style.left);
            const currentTop = parseFloat(flyingChip.style.top);
            
            flyingChip.style.transform = `translate(${endLeft - currentLeft}px, ${endTop - currentTop}px)`;

            this.playSound('下注1.mp3'); 

            setTimeout(() => {
                document.body.removeChild(flyingChip);
                resolve();
            }, 600);
        });
    }

    // Animation for Pot to Winner
    animatePotWin(winnerIndex) {
        return new Promise(resolve => {
            const potChips = document.getElementById('pot-chips');
            const winnerSeat = document.getElementById(`seat-${winnerIndex}`);
            
            if (!potChips || !winnerSeat) {
                resolve();
                return;
            }

            const potRect = potChips.getBoundingClientRect();
            const winnerRect = winnerSeat.getBoundingClientRect();

            // Clone pot chips
            const flyingPot = potChips.cloneNode(true);
            flyingPot.className = 'chip-stack flying-chip';
            // Ensure clone is positioned correctly fixed
            flyingPot.style.position = 'fixed';
            flyingPot.style.left = `${potRect.left}px`;
            flyingPot.style.top = `${potRect.top}px`;
            flyingPot.style.transform = 'none';
            flyingPot.style.margin = '0';
            
            document.body.appendChild(flyingPot);
            
            // Hide real pot
            potChips.classList.add('hidden');

            flyingPot.offsetHeight;

            // Target: Winner Avatar
            const endLeft = winnerRect.left + winnerRect.width/2 - 20; 
            const endTop = winnerRect.top + winnerRect.height/2 - 20;

            flyingPot.style.transition = 'all 1s ease-in-out';
            flyingPot.style.transform = `translate(${endLeft - potRect.left}px, ${endTop - potRect.top}px)`;
            
            this.playSound('all in.mp3'); 

            setTimeout(() => {
                document.body.removeChild(flyingPot);
                resolve();
            }, 1000);
        });
    }

    reset() {
        // Clear community cards
        if (this.communityCardsArea) {
            const slots = this.communityCardsArea.querySelectorAll('.card-slot');
            slots.forEach(slot => slot.innerHTML = '');
            // We do NOT reset innerHTML completely because we added pot-container
        }

        // Clear player hands BUT keep bet chips structure
        document.querySelectorAll('.hand-cards').forEach(el => {
            // Remove cards but keep bet chips div
            const cards = el.querySelectorAll('.card');
            cards.forEach(card => card.remove());
            
            // Reset bet chips
            const betChips = el.querySelector('.bet-chips');
            if (betChips) {
                betChips.classList.add('hidden');
                betChips.innerText = '';
            }
        });

        // Reset Pot Display
        this.updatePot(0);
        
        // Clear any betting chips on table (if any remained)
        document.querySelectorAll('.bet-chips').forEach(el => {
            el.classList.add('hidden');
            el.innerText = '';
        });
    }

    // Raise Control UI
    showRaiseControl(minRaise, maxRaise, currentPot, onConfirm) {
        const modal = document.getElementById('raise-control');
        if (!modal) return;

        const slider = document.getElementById('raise-slider');
        const input = document.getElementById('raise-amount-input');
        const confirmBtn = document.getElementById('confirm-raise');
        const closeBtn = document.getElementById('close-raise');
        const shortcuts = document.querySelectorAll('.shortcut-btn');
        const minDisplay = document.getElementById('raise-min');
        const maxDisplay = document.getElementById('raise-max');

        // Setup ranges
        // Ensure minRaise <= maxRaise. If user has less than minRaise, they can only All-in.
        const actualMin = Math.min(minRaise, maxRaise);
        
        slider.min = actualMin;
        slider.max = maxRaise;
        slider.value = actualMin;
        input.value = actualMin;

        minDisplay.textContent = `Min: ${actualMin}`;
        maxDisplay.textContent = `Max: ${maxRaise}`;

        modal.classList.remove('hidden');

        // Handlers
        const updateValue = (val) => {
            // Snap to increments if needed? For now just raw value.
            // Maybe snap to 50s?
            let numVal = parseInt(val, 10);
            if (isNaN(numVal)) numVal = actualMin;
            
            // Clamp
            numVal = Math.max(actualMin, Math.min(numVal, maxRaise));
            
            slider.value = numVal;
            input.value = numVal;
        };

        slider.oninput = (e) => updateValue(e.target.value);
        input.onchange = (e) => updateValue(e.target.value);

        // Shortcuts
        shortcuts.forEach(btn => {
            btn.onclick = () => {
                const action = btn.dataset.action;
                let targetVal = actualMin;
                
                if (action === 'min') targetVal = actualMin;
                else if (action === 'pot') targetVal = Math.min(maxRaise, Math.floor(currentPot / 2));
                else if (action === 'pot-full') targetVal = Math.min(maxRaise, currentPot);
                else if (action === 'allin') targetVal = maxRaise;

                // Ensure it's at least min (unless pot calc was lower, but min is absolute floor)
                if (action !== 'allin' && targetVal < actualMin) targetVal = actualMin;

                updateValue(targetVal);
            };
        });

        // Confirm
        confirmBtn.onclick = () => {
            const finalAmount = parseInt(input.value, 10);
            modal.classList.add('hidden');
            if (onConfirm) onConfirm(finalAmount);
        };

        // Close
        closeBtn.onclick = () => {
            modal.classList.add('hidden');
            // Maybe treat as cancel/fold? Or just close modal? 
            // Usually close = do nothing.
        };
    }
}
