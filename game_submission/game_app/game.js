// Chờ DOM load xong thì mới thực thi
document.addEventListener('DOMContentLoaded', () => {

    // ===================================
    //  QUẢN LÝ CÁC PHẦN TỬ DOM
    // ===================================
    const screens = {
        menu: document.getElementById('menu-screen'),
        play: document.getElementById('play-screen'),
        result: document.getElementById('result-screen'),
    };

    const buttons = {
        play: document.getElementById('play-btn'),
        about: document.getElementById('about-btn'),
        restart: document.getElementById('restart-btn'),
        menuPlay: document.getElementById('menu-btn-play'),
        playAgain: document.getElementById('play-again-btn'),
        menuResult: document.getElementById('menu-btn-result'),
    };

    const gameBoard = document.getElementById('game-board');
    const scoreEl = document.getElementById('score');
    const pairsLeftEl = document.getElementById('pairs-left');
    const finalScoreEl = document.getElementById('final-score');
    const quoteEl = document.getElementById('quote');

    // ===================================
    //  DỮ LIỆU GAME
    // ===================================
    // 6 cặp = 12 thẻ (phù hợp grid 4x3 hoặc 3x4)
    const CARD_VALUES = [
        'Tử Tế ❤️', 'Đồng Cảm 🤗', 'Tự Tin 🧠', 
        'Yêu Thương 💖', 'Gia Đình 👨‍👩‍👧', 'Tôn Trọng 🤝'
    ];
    
    const QUOTES = [
        "Phụ nữ Việt Nam giỏi việc nước, đảm việc nhà.",
        "Nơi nào có phụ nữ, nơi đó có vẻ đẹp.",
        "Anh hùng, bất khuất, trung hậu, đảm đang.",
        "Phụ nữ là để yêu thương và trân trọng."
    ];

    // ===================================
    //  TRẠNG THÁI GAME (STATE)
    // ===================================
    let hasFlippedCard = false;
    let lockBoard = false; // Khóa bảng khi đang lật 2 thẻ
    let firstCard, secondCard;
    let score = 0;
    let totalPairs = CARD_VALUES.length;
    let pairsMatched = 0;


    // ===================================
    //  ĐIỀU HƯỚNG MÀN HÌNH
    // ===================================
    
    /** Chuyển đến màn hình được chỉ định */
    function navigateTo(screenName) {
        // Ẩn tất cả màn hình
        Object.values(screens).forEach(screen => {
            screen.classList.remove('active');
        });
        // Hiển thị màn hình mong muốn
        if (screens[screenName]) {
            screens[screenName].classList.add('active');
        }
    }

    // Gán sự kiện cho các nút điều hướng
    buttons.play.onclick = () => initGame();
    buttons.restart.onclick = () => initGame();
    buttons.playAgain.onclick = () => initGame();
    buttons.menuPlay.onclick = () => navigateTo('menu');
    buttons.menuResult.onclick = () => navigateTo('menu');
    buttons.about.onclick = () => {
        alert(
            'Game Kỷ Niệm 20/10\n\n' +
            'Lật các thẻ để tìm cặp thẻ giống nhau.\n' +
            'Chúc bạn chơi game vui vẻ và ý nghĩa!'
        );
    };

    // ===================================
    //  LOGIC GAME
    // ===================================

    /** Khởi tạo và bắt đầu game mới */
    function initGame() {
        navigateTo('play'); // Chuyển đến màn hình chơi
        resetGameState(); // Reset các biến
        updateStats(); // Cập nhật điểm
        generateGameBoard(); // Tạo bảng chơi
    }
    
    /** Reset các biến trạng thái game */
    function resetGameState() {
        hasFlippedCard = false;
        lockBoard = false;
        firstCard = null;
        secondCard = null;
        score = 0;
        pairsMatched = 0;
    }

    /** Cập nhật hiển thị điểm và số cặp còn lại */
    function updateStats() {
        scoreEl.textContent = score;
        pairsLeftEl.textContent = totalPairs - pairsMatched;
    }
    
    /** Tạo bảng chơi với các thẻ đã xáo trộn */
    function generateGameBoard() {
        gameBoard.innerHTML = ''; // Xóa bảng cũ
        
        // Gấp đôi mảng thẻ và xáo trộn
        const gameCards = [...CARD_VALUES, ...CARD_VALUES];
        shuffle(gameCards);

        // Tạo HTML cho mỗi thẻ
        gameCards.forEach(value => {
            const card = document.createElement('div');
            card.classList.add('card');
            card.dataset.value = value; // Lưu giá trị vào data-attribute

            card.innerHTML = `
                <div class="card-face card-front">
                    <span>${value}</span>
                </div>
                <div class="card-face card-back"></div>
            `;
            
            // Gán sự kiện click
            card.addEventListener('click', flipCard);
            gameBoard.appendChild(card);
        });
    }

    /** Thuật toán xáo trộn Fisher-Yates */
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    /** Xử lý khi click lật thẻ */
    function flipCard(event) {
        // Bỏ qua nếu bảng đang khóa hoặc click vào thẻ đã lật
        if (lockBoard) return;
        const targetCard = event.currentTarget;
        if (targetCard === firstCard) return; // Bỏ qua nếu click 2 lần 1 thẻ

        targetCard.classList.add('is-flipped');

        if (!hasFlippedCard) {
            // Lần lật đầu tiên
            hasFlippedCard = true;
            firstCard = targetCard;
        } else {
            // Lần lật thứ hai
            secondCard = targetCard;
            checkForMatch();
        }
    }

    /** Kiểm tra xem 2 thẻ có khớp không */
    function checkForMatch() {
        const isMatch = firstCard.dataset.value === secondCard.dataset.value;
        
        if (isMatch) {
            disableCards();
        } else {
            unflipCards();
        }
    }

    /** Xử lý khi 2 thẻ khớp */
    function disableCards() {
        firstCard.removeEventListener('click', flipCard);
        secondCard.removeEventListener('click', flipCard);
        
        firstCard.classList.add('is-matched');
        secondCard.classList.add('is-matched');

        score += 10;
        pairsMatched++;
        updateStats();
        
        resetBoardState();
        
        // Kiểm tra thắng
        if (pairsMatched === totalPairs) {
            setTimeout(showResultScreen, 1000);
        }
    }

    /** Xử lý khi 2 thẻ không khớp */
    function unflipCards() {
        lockBoard = true; // Khóa bảng
        
        // Chờ 1.2 giây rồi lật lại
        setTimeout(() => {
            firstCard.classList.remove('is-flipped');
            secondCard.classList.remove('is-flipped');
            resetBoardState();
        }, 1200);
    }
    
    /** Reset trạng thái lật thẻ */
    function resetBoardState() {
        [hasFlippedCard, lockBoard] = [false, false];
        [firstCard, secondCard] = [null, null];
    }

    /** Hiển thị màn hình kết quả */
    function showResultScreen() {
        finalScoreEl.textContent = score;
        // Lấy 1 câu quote ngẫu nhiên
        quoteEl.textContent = QUOTES[Math.floor(Math.random() * QUOTES.length)];
        navigateTo('result');
    }

    // ===================================
    //  KHỞI ĐỘNG BAN ĐẦU
    // ===================================
    navigateTo('menu'); // Bắt đầu ở màn hình Menu

});