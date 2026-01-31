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
        if (potDisplay) {
            potDisplay.textContent = `底池（POT）：$${amount}`;
        }
    }

    reset() {
        // Clear community cards
        if (this.communityCardsArea) {
            // Keep the slots, clear content if any? 
            // Actually the slots are structural. We should probably clear cards inside them if we appended them there.
            // But currently renderCards clears innerHTML.
            // If we are just resetting for a new hand or lobby return:
            const slots = this.communityCardsArea.querySelectorAll('.card-slot');
            slots.forEach(slot => slot.innerHTML = '');
            // Also clear direct children if we used appendChild
            this.communityCardsArea.innerHTML = `
                <div class="card-slot"></div>
                <div class="card-slot"></div>
                <div class="card-slot"></div>
                <div class="card-slot"></div>
                <div class="card-slot"></div>
            `;
        }

        // Clear player hands
        document.querySelectorAll('.hand-cards').forEach(el => el.innerHTML = '');

        // Reset Pot Display
        this.updatePot(0);
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
