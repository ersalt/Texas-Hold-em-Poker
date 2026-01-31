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
        
        element.innerHTML = '';
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = 'card';
            
            if (isFaceUp) {
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
            
            element.appendChild(cardEl);
        });
    }

    updateBalance(players) {
        // Update chip counts on screen
    }
}
