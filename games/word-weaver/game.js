/**
 * Word Weaver (墨韻織詞)
 * A word puzzle game with East Asian ink brush aesthetics
 * Focused on Chinese Idioms (成語)
 */

// ===== Game State =====
const GameState = {
    level: 1,
    score: 0,
    gridSize: 4,
    letters: [],
    targetWords: [],
    wordPositions: {}, // Map: word -> array of indices
    foundWords: [],
    selectedCells: [],
    isSelecting: false,
    hintsUsed: 0,
    timeLeft: 0,
    timerInterval: null
};

// ===== Word Lists by Level (Chinese Idioms) =====
// Curated list of 500+ Chinese idioms across 30 levels
const WORD_LISTS = [
    // Levels 1-5: 4x4 Grid
    {
        gridSize: 4, requiredWords: 3,
        words: ['一心一意', '三言兩語', '五顏六色', '七嘴八舌', '九牛一毛', '千方百計', '萬紫千紅', '一針見血', '十全十美', '百發百中']
    },
    {
        gridSize: 4, requiredWords: 3,
        words: ['龍飛鳳舞', '畫蛇添足', '守株待兔', '如魚得水', '狐假虎威', '盲人摸象', '走馬觀花', '井底之蛙', '亡羊補牢', '雞犬升天']
    },
    {
        gridSize: 4, requiredWords: 4,
        words: ['半途而廢', '持之以恆', '掩耳盜鈴', '破釜沉舟', '背水一戰', '東山再起', '胸有成竹', '草船借箭', '水到渠成', '順水推舟']
    },
    {
        gridSize: 4, requiredWords: 4,
        words: ['飲水思源', '志同道合', '見利忘義', '捨己為人', '光明磊落', '大公無私', '虛懷若谷', '精益求精', '助人為樂', '大智若愚']
    },
    {
        gridSize: 4, requiredWords: 4,
        words: ['聞雞起舞', '對牛彈琴', '狼心狗肺', '老馬識途', '談虎色變', '葉公好龍', '一箭雙雕', '事半功倍', '錦上添花', '雪中送炭']
    },

    // Levels 6-15: 5x5 Grid
    {
        gridSize: 5, requiredWords: 4,
        words: ['紙上談兵', '指鹿為馬', '朝三暮四', '臥薪嘗膽', '螳臂當車', '破鏡重圓', '名落孫山', '毛遂自薦', '完璧歸趙', '四面楚歌', '負荊請罪', '精忠報國', '破鏡重圓', '樂不思蜀', '初出茅廬']
    },
    {
        gridSize: 5, requiredWords: 4,
        words: ['海闊天空', '冰凍三尺', '夜長夢多', '獨木難支', '水中撈月', '遠水近火', '臨渴掘井', '船到橋頭', '火上澆油', '落井下石', '投石問路', '點石成金', '胸有成竹', '鐵證如山', '穩如泰山']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['山明水秀', '風和日麗', '雲消霧散', '鳥語花香', '青山綠水', '波濤洶湧', '冰天雪地', '烈日當空', '秋高氣爽', '春暖花開', '五彩繽紛', '五光十色', '琳瑯滿目', '萬籟俱寂', '震耳欲聾']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['名列前茅', '後起之秀', '登峰造極', '出類拔萃', '不可一世', '自命不凡', '自慚形穢', '垂頭喪氣', '昂首闊步', '意氣風發', '心曠神怡', '悠然自得', '逍遙自在', '泰然自若', '心平氣和']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['大顯身手', '大打出手', '大發雷霆', '大驚小怪', '大快人心', '大材小用', '大獲全勝', '大名鼎鼎', '大刀闊斧', '大言不慚', '大腹便便', '大搖大擺', '大張旗鼓', '大失所望', '大相徑庭']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['一馬當先', '一見鍾情', '一目了然', '一清二楚', '一舉兩得', '一帆風順', '一事無成', '一表人才', '一見如故', '一籌莫展', '一諾千金', '一鼓作氣', '一塵不染', '一敗塗地', '一鳴驚人']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['目瞪口呆', '耳聰目明', '口是心非', '手忙腳亂', '腳踏實地', '心直口快', '心煩意亂', '心領神會', '心心相印', '心不在焉', '心狠手辣', '心滿意足', '心靈手巧', '心悅誠服', '心安理得']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['天經地義', '天衣無縫', '天長地久', '天真爛漫', '天翻地覆', '天造地設', '天公地道', '天花亂墜', '天壤之別', '天時地利', '天旋地轉', '天衣無縫', '驚天動地', '地廣人稀', '改天換地']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['馬到成功', '龍馬精神', '馬不停蹄', '快馬加鞭', '老馬識途', '天馬行空', '指鹿為馬', '走馬觀花', '汗馬功勞', '青梅竹馬', '塞翁失馬', '懸崖勒馬', '千軍萬馬', '龍馬精神', '招兵買馬']
    },
    {
        gridSize: 5, requiredWords: 5,
        words: ['萬無一失', '萬眾一心', '萬古流芳', '萬劫不復', '萬念俱灰', '萬般無奈', '萬分焦急', '萬里長征', '萬馬奔騰', '萬事大吉', '萬全之策', '萬象更新', '萬水千山', '萬家燈火', '萬分榮幸']
    },

    // Levels 16-25: 6x6 Grid
    {
        gridSize: 6, requiredWords: 6,
        words: ['不卑不亢', '不折不扣', '不遺餘力', '不勞而獲', '不屈不撓', '不知所措', '不恥下問', '不可思議', '不相上下', '不假思索', '不學無術', '不期而遇', '不言而喻', '不可磨滅', '不卑不亢', '不約而同', '不屑一顧', '不省人事', '不以為然', '不合時宜']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['千變萬化', '千言萬語', '千山萬水', '千辛萬苦', '千真萬確', '千絲萬縷', '千呼萬喚', '千錘百鍊', '千篇一律', '千姿百態', '千嬌百媚', '千恩萬謝', '千方百計', '千奇百怪', '千均一髮', '千載難逢', '千慮一得', '千夫所指', '千河入海', '千古絕唱']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['其樂無窮', '其貌不揚', '其理自明', '其利斷金', '其心可嘉', '其才出眾', '其志不凡', '其勢洶湧', '其行可疑', '其情可憫', '如虎添翼', '如膠似漆', '如影隨形', '如履薄冰', '如願以償', '如日中天', '如釋重負', '如飢似渴', '如雷貫耳', '如魚得水']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['自強不息', '自力更生', '自食其力', '自鳴得意', '自欺欺人', '自知之明', '自圓其說', '自告奮勇', '自暴自棄', '自覺自願', '自生自滅', '自作自受', '自私自利', '自投羅網', '自始至終', '自命不凡', '自作聰明', '自給自足', '自得其樂', '自討苦吃']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['花言巧語', '甜言蜜語', '冷言冷語', '豪言壯語', '流言蜚語', '風言風語', '自言自語', '千言萬語', '輕言細語', '隻言片語', '多才多藝', '多災多難', '多姿多彩', '多種多樣', '多愁善感', '多多益善', '多管閒事', '多此一舉', '多才多藝', '多事之秋']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['名副其實', '名列前茅', '名落孫山', '名不虛傳', '名正言順', '名揚四海', '名垂青史', '名噪一時', '名存實亡', '名利雙收', '無影無蹤', '無憂無慮', '無邊無際', '無法無天', '無拘無束', '無可奈何', '無微不至', '無動於衷', '無窮無盡', '無濟於事']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['生龍活虎', '生搬硬套', '生離死別', '生吞活剝', '生機勃勃', '生生不息', '生財有道', '生花妙筆', '生死與共', '生靈塗炭', '相輔相成', '相得益彰', '相提並論', '相濡以沫', '相似之處', '相持不下', '相敬如賓', '相形見絀', '相見恨晚', '相依為命']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['高談闊論', '高瞻遠矚', '高不可攀', '高深莫測', '高枕無憂', '高朋滿座', '高風亮節', '高才大德', '高歌猛進', '高屋建瓴', '長篇大論', '長途跋涉', '長治久安', '長驅直入', '長生不老', '長吁短歎', '長袖善舞', '長年累月', '長盛不衰', '長吁短歎']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['風雨無阻', '風平浪靜', '風起雲湧', '風餐露宿', '風吹草動', '風花雪月', '風塵僕僕', '風捲殘雲', '風馳電掣', '風流倜儻', '雨過天晴', '雨後春筍', '雨露均沾', '雨打芭蕉', '呼風喚雨', '狂風暴雨', '斜風細雨', '未雨綢繆', '風調雨順', '櫛風沐雨']
    },
    {
        gridSize: 6, requiredWords: 6,
        words: ['精疲力竭', '精彩紛呈', '精益求精', '精打細算', '精雕細刻', '精兵簡政', '精神抖擻', '精忠報國', '精通門徑', '精明強幹', '力不從心', '力所能及', '力爭上游', '力挽狂瀾', '力排眾議', '力求完美', '戮力同心', '盡心盡力', '竭盡全力', '自食其力']
    },

    // Levels 26-30: 7x7 Grid
    {
        gridSize: 7, requiredWords: 7,
        words: ['理所當然', '理直氣壯', '理屈詞窮', '理解萬歲', '理賢下士', '理屈詞窮', '慢條斯理', '心安理得', '傷天害理', '通情達理', '意氣用事', '意氣風發', '意猶未盡', '意想不到', '意味深長', '意欲何為', '全神貫注', '言外之意', '出其不意', '心領神會', '情投意合', '虛情假意', '漫不經心', '一心一意', '三心二意']
    },
    {
        gridSize: 7, requiredWords: 7,
        words: ['前程似錦', '前所未有', '前功盡棄', '前仆後繼', '前呼後擁', '前因後果', '前思後想', '前怕狼後', '勇往直前', '空前絕後', '畏首畏尾', '首當其衝', '首屈一指', '首尾呼應', '自首從寬', '首鼠兩端', '馬首是瞻', '昂首闊步', '俯首帖耳', '改頭換面', '拋頭露面', '垂頭喪氣', '頭重腳輕', '頭破血流', '頭頭是道']
    },
    {
        gridSize: 7, requiredWords: 8,
        words: ['眼疾手快', '眼高手低', '眼見為實', '眼花繚亂', '眼明手快', '眼不見為', '傻眼瞪口', '眉開眼笑', '眉清目秀', '眉目如畫', '眉來眼去', '眉頭深鎖', '眉開眼笑', '揚眉吐氣', '燃眉之急', '火眼金睛', '目不轉睛', '目中無人', '目不暇接', '目瞪口呆', '光彩奪目', '耳聞目睹', '滿目瘡痍', '引人注目', '一目了然']
    },
    {
        gridSize: 7, requiredWords: 8,
        words: ['手足情深', '手到擒來', '手忙腳亂', '手無寸鐵', '手舞足蹈', '手下留情', '手腳俐落', '白手起家', '愛不釋手', '垂手可得', '妙手回春', '唾手可得', '束手就擒', '得心應手', '眼疾手快', '腳踏實地', '腳下留情', '礙手礙腳', '縮手縮腳', '笨手笨腳', '躡手躡腳', '七手八腳', '動手動腳', '摩拳擦掌', '各顯神通']
    },
    {
        gridSize: 7, requiredWords: 8,
        words: ['開門見山', '開誠布公', '開源節流', '開天闢地', '開卷有益', '開口見喉', '旗開得勝', '豁然開朗', '別開生面', '異想天開', '天花亂墜', '亂七八糟', '亂箭穿心', '亂跳如雷', '心亂如麻', '迷亂人心', '撥亂反正', '手忙腳亂', '心煩意亂', '眼花繚亂', '紛亂如麻', '荒亂不安', '秩序井然', '井然有序', '井底之蛙']
    }
];

// ===== DOM Elements =====
const DOM = {
    instructionsModal: document.getElementById('instructions-modal'),
    levelModal: document.getElementById('level-modal'),
    timeoutModal: document.getElementById('timeout-modal'),
    gameContainer: document.getElementById('game-container'),
    startBtn: document.getElementById('start-btn'),
    nextLevelBtn: document.getElementById('next-level-btn'),
    retryBtn: document.getElementById('retry-btn'),
    backBtn: document.getElementById('back-btn'),
    hintBtn: document.getElementById('hint-btn'),
    shuffleBtn: document.getElementById('shuffle-btn'),
    letterGrid: document.getElementById('letter-grid'),
    lineSvg: document.getElementById('line-svg'),
    currentWord: document.getElementById('current-word'),
    foundWords: document.getElementById('found-words'),
    wordsCount: document.getElementById('words-count'),
    levelDisplay: document.getElementById('level-display'),
    scoreDisplay: document.getElementById('score-display'),
    timerDisplay: document.getElementById('timer-display'),
    levelScoreText: document.getElementById('level-score-text')
};

// ===== Sound Effects (Web Audio API) =====
const AudioCtx = window.AudioContext || window.webkitAudioContext;
let audioCtx = null;

function initAudio() {
    if (!audioCtx) {
        audioCtx = new AudioCtx();
    }
}

function playSound(type) {
    if (!audioCtx) return;
    
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    
    const now = audioCtx.currentTime;
    
    switch (type) {
        case 'select':
            osc.frequency.setValueAtTime(400 + GameState.selectedCells.length * 50, now);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.exponentialDecayTo && gain.gain.exponentialDecayTo(0.01, now + 0.1);
            osc.start(now);
            osc.stop(now + 0.1);
            break;
        case 'success':
            osc.frequency.setValueAtTime(523, now);
            osc.frequency.setValueAtTime(659, now + 0.1);
            osc.frequency.setValueAtTime(784, now + 0.2);
            osc.type = 'sine';
            gain.gain.setValueAtTime(0.15, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.4);
            osc.start(now);
            osc.stop(now + 0.4);
            break;
        case 'fail':
            osc.frequency.setValueAtTime(200, now);
            osc.type = 'sawtooth';
            gain.gain.setValueAtTime(0.1, now);
            gain.gain.linearRampToValueAtTime(0.01, now + 0.2);
            osc.start(now);
            osc.stop(now + 0.2);
            break;
        case 'levelup':
            [523, 659, 784, 1047].forEach((freq, i) => {
                const o = audioCtx.createOscillator();
                const g = audioCtx.createGain();
                o.connect(g);
                g.connect(audioCtx.destination);
                o.frequency.setValueAtTime(freq, now + i * 0.15);
                o.type = 'sine';
                g.gain.setValueAtTime(0.12, now + i * 0.15);
                g.gain.linearRampToValueAtTime(0.01, now + i * 0.15 + 0.3);
                o.start(now + i * 0.15);
                o.stop(now + i * 0.15 + 0.3);
            });
            return;
    }
}

// ===== Game Logic =====
function initLevel() {
    const levelIndex = (GameState.level - 1) % WORD_LISTS.length;
    const levelData = WORD_LISTS[levelIndex];
    
    GameState.gridSize = levelData.gridSize;
    GameState.foundWords = [];
    GameState.selectedCells = [];
    GameState.isSelecting = false;
    
    // Set time limit based on level difficulty
    // Level 1-5: 60s, Level 6-15: 120s, Level 16-25: 180s, Level 26-30: 240s
    if (GameState.level <= 5) GameState.timeLeft = 60;
    else if (GameState.level <= 15) GameState.timeLeft = 120;
    else if (GameState.level <= 25) GameState.timeLeft = 180;
    else GameState.timeLeft = 240;
    
    stopTimer();
    updateTimerDisplay();
    
    // Select random words for this level
    const shuffledWords = [...levelData.words].sort(() => Math.random() - 0.5);
    GameState.targetWords = shuffledWords.slice(0, levelData.requiredWords);
    
    // Generate grid with target words
    generateGrid();
    
    // Update UI
    updateUI();
    renderGrid();
    renderFoundWords();
}

function generateGrid() {
    const size = GameState.gridSize;
    const totalCells = size * size;
    
    // Initialize empty grid and positions
    GameState.letters = Array(totalCells).fill('');
    GameState.wordPositions = {};
    
    // Place words in grid
    const placedWords = [];
    
    for (const word of GameState.targetWords) {
        const positions = tryPlaceWord(word);
        if (positions) {
            placedWords.push(word);
            GameState.wordPositions[word] = positions;
        }
    }
    
    // Update target words to only include placed ones
    GameState.targetWords = placedWords;
    
    // Fill remaining cells with random letters from all available idioms
    const alphabet = '的一是在不了有和人這中大來上個國到說們為子社分學下自長以行本發成多名後作理道起前所實文用事方於部出資政果加各業也世通其當時產地開發主能間制種現行成水之見一三四五六七八九十百千萬龍飛鳳舞畫蛇添足守株待兔如魚得水狐假虎威盲人摸象走馬觀花井底之蛙半途而廢持之以恆掩耳盜鈴破釜沉舟背水一戰東山再起胸有成竹草船借箭飲水思源志同道合見利忘義捨己為人光明磊落大公無私虛懷若谷精益求精亡羊補牢雞犬升天聞雞起舞對牛彈琴狼心狗肺老馬識途談虎色變葉公好龍水到渠成順水推舟未雨綢繆一箭雙雕事半功倍錦上添花雪中送炭紙上談兵指鹿為馬朝三暮四臥薪嘗膽螳臂當車破鏡重圓名落孫山毛遂自薦海闊天空冰凍三尺夜長夢多獨木難支水中撈月遠水近火臨渴掘井船到橋頭理所當然意氣風發前程似錦眼疾手快手足情深開門見山天下太平';
    for (let i = 0; i < totalCells; i++) {
        if (GameState.letters[i] === '') {
            GameState.letters[i] = alphabet[Math.floor(Math.random() * alphabet.length)];
        }
    }
}

function tryPlaceWord(word) {
    const size = GameState.gridSize;
    const directions = [
        [0, 1],   // right
        [1, 0],   // down
        [1, 1],   // diagonal down-right
        [-1, 1],  // diagonal up-right
        [0, -1],  // left
        [-1, 0],  // up
        [-1, -1], // diagonal up-left
        [1, -1]   // diagonal down-left
    ];
    
    // Try multiple random positions
    for (let attempt = 0; attempt < 100; attempt++) {
        const startRow = Math.floor(Math.random() * size);
        const startCol = Math.floor(Math.random() * size);
        const dir = directions[Math.floor(Math.random() * directions.length)];
        
        if (canPlaceWord(word, startRow, startCol, dir)) {
            return placeWord(word, startRow, startCol, dir);
        }
    }
    
    return null;
}

function canPlaceWord(word, row, col, [dr, dc]) {
    const size = GameState.gridSize;
    
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        
        if (r < 0 || r >= size || c < 0 || c >= size) return false;
        
        const idx = r * size + c;
        const existing = GameState.letters[idx];
        
        if (existing !== '' && existing !== word[i]) return false;
    }
    
    return true;
}

function placeWord(word, row, col, [dr, dc]) {
    const size = GameState.gridSize;
    const indices = [];
    
    for (let i = 0; i < word.length; i++) {
        const r = row + i * dr;
        const c = col + i * dc;
        const idx = r * size + c;
        GameState.letters[idx] = word[i];
        indices.push(idx);
    }
    return indices;
}

function renderGrid() {
    const size = GameState.gridSize;
    DOM.letterGrid.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
    DOM.letterGrid.innerHTML = '';
    
    GameState.letters.forEach((letter, index) => {
        const cell = document.createElement('div');
        cell.className = 'letter-cell';
        cell.textContent = letter;
        cell.dataset.index = index;
        
        // Touch events
        cell.addEventListener('touchstart', handleTouchStart, { passive: false });
        cell.addEventListener('touchmove', handleTouchMove, { passive: false });
        cell.addEventListener('touchend', handleTouchEnd);
        
        // Mouse events
        cell.addEventListener('mousedown', handleMouseDown);
        cell.addEventListener('mouseenter', handleMouseEnter);
        
        DOM.letterGrid.appendChild(cell);
    });
    
    // Mouse up on document
    document.addEventListener('mouseup', handleMouseUp);
}

function renderFoundWords() {
    DOM.foundWords.innerHTML = '';
    
    // Show found words
    GameState.foundWords.forEach(word => {
        const chip = document.createElement('span');
        chip.className = 'word-chip';
        chip.textContent = word;
        DOM.foundWords.appendChild(chip);
    });
    
    // Show placeholders for remaining words
    const remaining = GameState.targetWords.length - GameState.foundWords.length;
    for (let i = 0; i < remaining; i++) {
        const placeholder = document.createElement('span');
        placeholder.className = 'word-placeholder';
        placeholder.textContent = '???';
        DOM.foundWords.appendChild(placeholder);
    }
    
    DOM.wordsCount.textContent = `(${GameState.foundWords.length}/${GameState.targetWords.length})`;
}

function updateUI() {
    DOM.levelDisplay.textContent = `第 ${GameState.level} 關`;
    DOM.scoreDisplay.textContent = `${GameState.score} 分`;
}

function updateTimerDisplay() {
    const mins = Math.floor(GameState.timeLeft / 60).toString().padStart(2, '0');
    const secs = (GameState.timeLeft % 60).toString().padStart(2, '0');
    DOM.timerDisplay.textContent = `⏳ ${mins}:${secs}`;
    
    if (GameState.timeLeft <= 10) {
        DOM.timerDisplay.style.color = '#ff4466';
    } else {
        DOM.timerDisplay.style.color = '';
    }
}

function startTimer() {
    if (GameState.timerInterval) return;
    GameState.timerInterval = setInterval(() => {
        GameState.timeLeft--;
        updateTimerDisplay();
        if (GameState.timeLeft <= 0) {
            handleTimeout();
        }
    }, 1000);
}

function stopTimer() {
    clearInterval(GameState.timerInterval);
    GameState.timerInterval = null;
}

function handleTimeout() {
    stopTimer();
    playSound('fail');
    DOM.timeoutModal.classList.remove('hidden');
}

// ===== Selection Logic =====
function getCellFromPoint(x, y) {
    const element = document.elementFromPoint(x, y);
    if (element && element.classList.contains('letter-cell')) {
        return parseInt(element.dataset.index);
    }
    return -1;
}

function isAdjacent(idx1, idx2) {
    const size = GameState.gridSize;
    const row1 = Math.floor(idx1 / size);
    const col1 = idx1 % size;
    const row2 = Math.floor(idx2 / size);
    const col2 = idx2 % size;
    
    const dr = Math.abs(row1 - row2);
    const dc = Math.abs(col1 - col2);
    
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
}

function selectCell(index) {
    if (index < 0 || GameState.selectedCells.includes(index)) return;
    
    const lastSelected = GameState.selectedCells[GameState.selectedCells.length - 1];
    
    if (GameState.selectedCells.length > 0 && !isAdjacent(lastSelected, index)) {
        return;
    }
    
    GameState.selectedCells.push(index);
    updateSelectionUI();
    playSound('select');
}

function updateSelectionUI() {
    // Update cell styles
    document.querySelectorAll('.letter-cell').forEach((cell, idx) => {
        cell.classList.toggle('selected', GameState.selectedCells.includes(idx));
    });
    
    // Update current word display
    const word = GameState.selectedCells.map(i => GameState.letters[i]).join('');
    DOM.currentWord.textContent = word;
    
    // Draw lines
    renderLines();
}

function renderLines() {
    DOM.lineSvg.innerHTML = '';
    
    if (GameState.selectedCells.length < 2) return;
    
    const cells = document.querySelectorAll('.letter-cell');
    
    for (let i = 1; i < GameState.selectedCells.length; i++) {
        const prevIdx = GameState.selectedCells[i - 1];
        const currIdx = GameState.selectedCells[i];
        
        const prevCell = cells[prevIdx];
        const currCell = cells[currIdx];
        
        const prevRect = prevCell.getBoundingClientRect();
        const currRect = currCell.getBoundingClientRect();
        const svgRect = DOM.lineSvg.getBoundingClientRect();
        
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', prevRect.left + prevRect.width / 2 - svgRect.left);
        line.setAttribute('y1', prevRect.top + prevRect.height / 2 - svgRect.top);
        line.setAttribute('x2', currRect.left + currRect.width / 2 - svgRect.left);
        line.setAttribute('y2', currRect.top + currRect.height / 2 - svgRect.top);
        
        DOM.lineSvg.appendChild(line);
    }
}

function submitWord() {
    const word = GameState.selectedCells.map(i => GameState.letters[i]).join('');
    
    if (word.length >= 2 && 
        GameState.targetWords.includes(word) && 
        !GameState.foundWords.includes(word)) {
        
        // Valid word found!
        GameState.foundWords.push(word);
        
        // Calculate score
        let points = word.length * 100;
        GameState.score += points;
        
        playSound('success');
        createInkSplash();
        
        // Check level complete
        if (GameState.foundWords.length === GameState.targetWords.length) {
            stopTimer();
            setTimeout(showLevelComplete, 500);
        }
        
        renderFoundWords();
        updateUI();
    } else if (word.length >= 2) {
        playSound('fail');
    }
    
    // Clear selection
    GameState.selectedCells = [];
    updateSelectionUI();
}

function createInkSplash() {
    const splash = document.createElement('div');
    splash.className = 'ink-splash';
    
    const lastIdx = GameState.selectedCells[GameState.selectedCells.length - 1];
    const cell = document.querySelectorAll('.letter-cell')[lastIdx];
    const rect = cell.getBoundingClientRect();
    
    splash.style.left = rect.left + rect.width / 2 - 25 + 'px';
    splash.style.top = rect.top + rect.height / 2 - 25 + 'px';
    
    document.body.appendChild(splash);
    setTimeout(() => splash.remove(), 600);
}

function showLevelComplete() {
    playSound('levelup');
    
    // Bonus score
    const bonus = GameState.level * 100;
    GameState.score += bonus;
    
    DOM.levelScoreText.textContent = `得分：${GameState.score} 分（+${bonus} 過關獎勵）`;
    DOM.levelModal.classList.remove('hidden');
    
    updateUI();
}

// ===== Event Handlers =====
function handleTouchStart(e) {
    e.preventDefault();
    initAudio();
    startTimer();
    GameState.isSelecting = true;
    
    const touch = e.touches[0];
    const index = getCellFromPoint(touch.clientX, touch.clientY);
    selectCell(index);
}

function handleTouchMove(e) {
    e.preventDefault();
    if (!GameState.isSelecting) return;
    
    const touch = e.touches[0];
    const index = getCellFromPoint(touch.clientX, touch.clientY);
    selectCell(index);
}

function handleTouchEnd(e) {
    e.preventDefault();
    if (GameState.isSelecting) {
        GameState.isSelecting = false;
        submitWord();
    }
}

function handleMouseDown(e) {
    initAudio();
    startTimer();
    GameState.isSelecting = true;
    const index = parseInt(e.target.dataset.index);
    selectCell(index);
}

function handleMouseEnter(e) {
    if (!GameState.isSelecting) return;
    const index = parseInt(e.target.dataset.index);
    selectCell(index);
}

function handleMouseUp() {
    if (GameState.isSelecting) {
        GameState.isSelecting = false;
        submitWord();
    }
}

// ===== Hint System =====
function showHint() {
    // Find an unfound word
    const unfound = GameState.targetWords.find(w => !GameState.foundWords.includes(w));
    if (!unfound) return;
    
    // Get the actual positions of that word in the grid
    const positions = GameState.wordPositions[unfound];
    if (!positions || positions.length === 0) return;
    
    // Highlight the first letter's index
    const firstIndex = positions[0];
    const cells = document.querySelectorAll('.letter-cell');
    
    if (cells[firstIndex]) {
        cells[firstIndex].classList.add('hint');
        setTimeout(() => cells[firstIndex].classList.remove('hint'), 2000);
    }
    
    GameState.hintsUsed++;
}

// ===== Shuffle (Visual only - for fun) =====
function shuffleAnimation() {
    const cells = document.querySelectorAll('.letter-cell');
    cells.forEach(cell => {
        cell.style.transform = `rotate(${Math.random() * 20 - 10}deg) scale(0.9)`;
    });
    
    setTimeout(() => {
        cells.forEach(cell => {
            cell.style.transform = '';
        });
    }, 300);
}

// ===== Initialize =====
function init() {
    DOM.startBtn.addEventListener('click', () => {
        initAudio();
        DOM.instructionsModal.classList.add('hidden');
        DOM.gameContainer.classList.remove('hidden');
        initLevel();
    });
    
    DOM.nextLevelBtn.addEventListener('click', () => {
        DOM.levelModal.classList.add('hidden');
        GameState.level++;
        initLevel();
    });

    DOM.retryBtn.addEventListener('click', () => {
        DOM.timeoutModal.classList.add('hidden');
        initLevel();
    });
    
    DOM.hintBtn.addEventListener('click', showHint);
    DOM.shuffleBtn.addEventListener('click', shuffleAnimation);
    
    // Handle window resize for lines
    window.addEventListener('resize', () => {
        if (GameState.selectedCells.length > 1) {
            renderLines();
        }
    });
}

init();
