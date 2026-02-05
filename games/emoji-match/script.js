const board = document.getElementById('board');
const movesEl = document.getElementById('moves');
const timerEl = document.getElementById('timer');

const emojis = ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼'];
let cards = [];
let flippedCards = [];
let matchedPairs = 0;
let moves = 0;
let timerInterval;
let seconds = 0;
let isLocked = false;
let isGameActive = false;

function shuffle(array) {
    let currentIndex = array.length, randomIndex;
    while (currentIndex != 0) {
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }
    return array;
}

function createCard(emoji) {
    const card = document.createElement('div');
    card.classList.add('card');
    
    const inner = document.createElement('div');
    inner.classList.add('card-inner');
    
    const front = document.createElement('div');
    front.classList.add('card-front');
    front.innerText = '?';
    
    const back = document.createElement('div');
    back.classList.add('card-back');
    back.innerText = emoji;
    
    inner.appendChild(front);
    inner.appendChild(back);
    card.appendChild(inner);
    
    card.addEventListener('click', () => flipCard(card, emoji));
    
    return card;
}

function startTimer() {
    if (isGameActive) return;
    isGameActive = true;
    seconds = 0;
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        seconds++;
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        timerEl.innerText = `${mins}:${secs}`;
    }, 1000);
}

function stopTimer() {
    isGameActive = false;
    clearInterval(timerInterval);
}

function flipCard(card, emoji) {
    if (isLocked || card.classList.contains('flipped') || card.classList.contains('matched')) return;
    
    if (!isGameActive) startTimer();

    card.classList.add('flipped');
    flippedCards.push({ element: card, value: emoji });

    if (flippedCards.length === 2) {
        moves++;
        movesEl.innerText = moves;
        checkMatch();
    }
}

function checkMatch() {
    isLocked = true;
    const [card1, card2] = flippedCards;

    if (card1.value === card2.value) {
        card1.element.classList.add('matched');
        card2.element.classList.add('matched');
        matchedPairs++;
        flippedCards = [];
        isLocked = false;
        
        if (matchedPairs === emojis.length) {
            stopTimer();
            setTimeout(() => alert(`恭喜！你用了 ${moves} 步和 ${timerEl.innerText} 完成了遊戲！🎉`), 500);
        }
    } else {
        setTimeout(() => {
            card1.element.classList.remove('flipped');
            card2.element.classList.remove('flipped');
            flippedCards = [];
            isLocked = false;
        }, 1000);
    }
}

function restartGame() {
    stopTimer();
    timerEl.innerText = "00:00";
    moves = 0;
    movesEl.innerText = 0;
    matchedPairs = 0;
    flippedCards = [];
    isLocked = false;
    isGameActive = false;
    
    board.innerHTML = '';
    
    // Double the emojis to create pairs
    const deck = [...emojis, ...emojis];
    shuffle(deck);
    
    deck.forEach(emoji => {
        const card = createCard(emoji);
        board.appendChild(card);
    });
}

// Init
restartGame();
