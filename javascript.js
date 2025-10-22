// === CÀI ĐẶT TRÒ CHƠI ===
const GRID_SIZE = 25; // Sửa về 25x25 (625 ô) để đồng bộ với HTML/CSS đã sửa
const INITIAL_TILES = GRID_SIZE * GRID_SIZE;
const MAX_SEASONS = 8;
const MIN_FARMLAND_THRESHOLD = 0.1; // Thua nếu còn dưới 10% đất

let season = 1;
let funds = 0;
let actions = 0;
let farmland = 0;
let score = 0;
let difficulty = 'medium';
let selectedAction = null;
let board = []; 
let upgrades = { funds: 0, actions: 0, resistance: 0 }; 
const ACTION_COSTS = { 'dyke': 150, 'mangrove': 100, 'rice': 50 };

// Tinh chỉnh độ khó: RecoveryRate là cơ hội để đất hồi phục xung quanh Rừng
const difficultySettings = {
    easy: { 
        baseFunds: 1500, actions: 12, baseRisk: 0.1, recoveryRate: 0.6, 
        chainMultiplier: 0.5, damagePenalty: 0.8, description: "Dễ: Ít rủi ro, Khôi phục nhanh, Tiền nhiều."
    },
    medium: { 
        baseFunds: 1000, actions: 10, baseRisk: 0.2, recoveryRate: 0.3, 
        chainMultiplier: 1.0, damagePenalty: 1.0, description: "Trung Bình: Cân bằng."
    },
    hard: { 
        baseFunds: 800, actions: 8, baseRisk: 0.4, recoveryRate: 0.1, 
        chainMultiplier: 1.5, damagePenalty: 1.5, description: "Khó: Rủi ro cao, Khôi phục chậm."
    },
    hell: { 
        baseFunds: 600, actions: 6, baseRisk: 0.6, recoveryRate: 0.05, 
        chainMultiplier: 2.0, damagePenalty: 2.0, description: "Địa Ngục: Rủi ro cực cao, Lan truyền mạnh."
    },
    destruction: { 
        baseFunds: 500, actions: 5, baseRisk: 0.8, recoveryRate: 0, 
        chainMultiplier: 3.0, damagePenalty: 3.0, description: "Hủy Diệt: Rủi ro tối đa, Không Khôi phục tự nhiên."
    }
};

// --- CHỨC NĂNG CƠ BẢN ---

function showScreen(id) {
    document.querySelectorAll('.screen').forEach(el => el.classList.add('hidden'));
    document.getElementById(id).classList.remove('hidden');
}

function updateMessageLog(msg) {
    const logEl = document.getElementById('message-log');
    logEl.textContent = msg; // Giữ lại tin nhắn mới nhất
}

function updateTile(x, y) {
    const tiles = document.querySelectorAll('#game-board .tile');
    const index = x * GRID_SIZE + y;
    const tileValue = board[x][y];
    
    let className = 'tile ';
    if (tileValue === 1) className += 'dyke';
    else if (tileValue === 2) className += 'mangrove';
    else if (tileValue === 3) className += 'rice';
    else if (tileValue === -1) className += 'damaged';
    
    // Đảm bảo không truy cập index ngoài mảng
    if (tiles[index]) {
        tiles[index].className = className;
    }
}

function updateUI() {
    document.getElementById('current-season').textContent = season;
    document.getElementById('funds-display').textContent = funds;
    document.getElementById('time-display').textContent = actions;
    document.getElementById('farmland-health-display').textContent = `${farmland}/${INITIAL_TILES}`;
    document.getElementById('score-display').textContent = score;
}

// --- KHỞI TẠO GAME ---

function initBoard() {
    const boardElement = document.getElementById('game-board');
    boardElement.innerHTML = '';
    board = Array(GRID_SIZE).fill().map(() => Array(GRID_SIZE).fill(0)); 
    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const tile = document.createElement('div');
            tile.className = 'tile';
            tile.dataset.x = i;
            tile.dataset.y = j;
            tile.addEventListener('click', () => buildOnTile(i, j));
            boardElement.appendChild(tile);
        }
    }
}

function startGame(diff) {
    difficulty = diff;
    const settings = difficultySettings[difficulty];

    season = 1;
    // Luật mới: Tiền khởi điểm = BaseFunds * 2 + Nâng cấp
    funds = settings.baseFunds * 2; 
    actions = settings.actions + upgrades.actions;
    farmland = INITIAL_TILES;
    score = 0;
    selectedAction = null;
    
    initBoard();
    updateUI();
    
    document.getElementById('menu-screen').classList.add('hidden');
    document.getElementById('play-screen').classList.remove('hidden');
    document.getElementById('upgrade-panel').style.display = 'none';
    document.getElementById('event-banner').style.display = 'none';
    updateMessageLog(`Chiến dịch bắt đầu! Độ khó: ${settings.description}`);
}

// --- LOGIC HÀNH ĐỘNG ---

function selectAction(action) {
    document.querySelectorAll('.action-btn').forEach(btn => btn.style.border = '2px solid transparent');

    if (selectedAction === action || action === null) {
        selectedAction = null;
        updateMessageLog('Hủy chọn.');
        return;
    }

    selectedAction = action;
    const cost = ACTION_COSTS[action] - upgrades.costReduction * 10;
    const actionName = action === 'dyke' ? 'Xây Đê' : action === 'mangrove' ? 'Trồng Rừng' : 'Trồng Lúa Chịu Mặn';
    updateMessageLog(`Đã chọn: ${actionName}. Chi phí: ${cost} Tiền.`);
    document.getElementById(`${action}-btn`).style.border = '2px solid #ff9800';
}

function buildOnTile(x, y) {
    if (!selectedAction || actions <= 0) {
        updateMessageLog('Không có hành động nào được chọn hoặc đã hết hành động!');
        return;
    }
    
    const cost = ACTION_COSTS[selectedAction] - upgrades.costReduction * 10;
    const tileStatus = board[x][y];

    if (funds < cost) {
        updateMessageLog('Không đủ tiền!');
        return;
    }
    
    // Kiểm tra và xử lý Hồi phục đất bằng Lúa
    if (tileStatus === -1 && selectedAction === 'rice') {
        farmland++;
        updateMessageLog(`Đất tại (${x}, ${y}) đã được hồi phục và trồng lúa chịu mặn!`);
    } else if (tileStatus === -1 && (selectedAction === 'dyke' || selectedAction === 'mangrove')) {
        updateMessageLog('Không thể xây đê/rừng trên đất hư hại, hãy trồng lúa để hồi phục trước.');
        return;
    } else if (tileStatus !== 0 && tileStatus !== -1) {
        updateMessageLog('Ô này đã được xây dựng!');
        return;
    }

    // Cập nhật trạng thái
    board[x][y] = selectedAction === 'dyke' ? 1 : selectedAction === 'mangrove' ? 2 : 3;
    funds -= cost;
    actions--;
    
    updateTile(x, y);
    updateUI();
    
    // Tự động hủy chọn sau khi xây
    selectAction(null); 
}

// --- LOGIC THIÊN TAI & HỒI PHỤC ---

function getAdjacentProtection(x, y) {
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]]; 
    let dykeNearby = false;
    let mangroveNearby = false;

    for (const [dx, dy] of directions) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < GRID_SIZE && ny >= 0 && ny < GRID_SIZE) {
            const status = board[nx][ny];
            if (status === 1) dykeNearby = true; // Dyke
            if (status === 2) mangroveNearby = true; // Mangrove
        }
    }
    // Luật mới: Lực bảo vệ tổng thể
    return { dyke: dykeNearby, mangrove: mangroveNearby };
}

function handleClimateEvent() {
    const settings = difficultySettings[difficulty];
    const eventBanner = document.getElementById('event-banner');
    let totalDamage = 0;

    // Chọn sự kiện ngẫu nhiên
    const eventType = Math.random() < 0.5 ? 'flood' : 'salinity';
    const eventName = eventType === 'flood' ? 'LŨ LỤT' : 'XÂM NHẬP MẶN';
    const baseDamageChance = settings.baseRisk * settings.damagePenalty * (1 - upgrades.resistance * 0.05);

    eventBanner.textContent = `THIÊN TAI: ${eventName} TẤN CÔNG!`;
    eventBanner.style.backgroundColor = '#f44336';
    eventBanner.style.color = 'white';
    eventBanner.style.display = 'block';

    for (let i = 0; i < GRID_SIZE; i++) {
        for (let j = 0; j < GRID_SIZE; j++) {
            const tileStatus = board[i][j];
            
            // Chỉ ảnh hưởng đến đất thường (0) hoặc lúa (3)
            if (tileStatus === 0 || tileStatus === 3) {
                let currentDamageChance = baseDamageChance;
                const protection = getAdjacentProtection(i, j);

                // Lúa chịu mặn miễn nhiễm với Mặn
                if (tileStatus === 3 && eventType === 'salinity') continue; 

                // Giảm nhờ công trình lân cận
                if ((eventType === 'flood' && protection.dyke) || (eventType === 'salinity' && protection.mangrove)) {
                    currentDamageChance *= 0.4 * (1 - upgrades.protectionBoost * 0.1); // Giảm rủi ro
                }

                if (Math.random() < currentDamageChance) {
                    if (tileStatus !== -1) { 
                        farmland--;
                    }
                    board[i][j] = -1; // Hư hỏng
                    totalDamage++;
                    updateTile(i, j);

                    // Lan truyền Thiệt hại (Damage Chain)
                    spreadDamage(i, j, settings.chainMultiplier);
                }
            }
        }
    }
    updateMessageLog(`MÙA BÃO TỐ: ${eventName}. Thiệt hại: ${totalDamage} ô đất.`);
    
    // Cố gắng Khôi phục đất sau sự kiện
    recoverDamagedLand(settings.recoveryRate);
}

function spreadDamage(r, c, multiplier) {
    const directions = [[-1,0],[1,0],[0,-1],[0,1]];
    for (let [dr, dc] of directions) {
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE && board[nr][nc] === 0) {
            // Ngăn chặn lan truyền nếu có Đê hoặc Rừng xung quanh ô bị lan truyền
            const protection = getAdjacentProtection(nr, nc);
            if (protection.dyke || protection.mangrove) continue; 
            
            if (Math.random() < 0.2 * multiplier) {
                board[nr][nc] = -1;
                state.farmlandCount--;
                updateTile(nr, nc);
            }
        }
    }
}

function recoverDamagedLand(rate) {
    let recoveredCount = 0;
    for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            // Chỉ đất hư (damaged -1) được hồi phục
            if (board[r][c] === -1) { 
                const protection = getAdjacentProtection(r, c);
                // Đất hồi phục nếu có Rừng Ngập Mặn xung quanh
                if (protection.mangrove && Math.random() < rate) {
                    board[r][c] = 0; // Trở lại đất nông nghiệp
                    farmland++;
                    recoveredCount++;
                    updateTile(r, c);
                }
            }
        }
    }
    if (recoveredCount > 0) {
        updateMessageLog(`🌿 Đất đai đang tự phục hồi: ${recoveredCount} ô đất đã được cứu nhờ Rừng Ngập Mặn.`);
    }
}

// --- KẾT THÚC VÀ NÂNG CẤP ---

function endTurn() {
    // 1. Kiểm tra GAME OVER (Thất bại)
    if (farmland <= INITIAL_TILES * MIN_FARMLAND_THRESHOLD) {
        return endGame('DEFEAT');
    }

    // 2. Thu nhập dựa trên đất và Rừng
    let income = farmland * 10; 
    let mangroveCount = 0;
     for (let r = 0; r < GRID_SIZE; r++) {
        for (let c = 0; c < GRID_SIZE; c++) {
            if (board[r][c] === 2) mangroveCount++; // 2 = Mangrove
        }
    }
    // Luật mới: Tiền được nhân cho Rừng đã trồng (20 tiền/rừng)
    income += mangroveCount * 20; 
    state.funds += income; 

    // 3. Xử lý Sự kiện Khí hậu
    handleClimateEvent();

    state.season++;
    state.actions = difficultySettings[difficulty].actions + upgrades.actions; 
    state.score = farmland * 10 + funds; 
    
    // 4. Kiểm tra GAME OVER (Chiến thắng)
    if (state.season > MAX_SEASONS) {
        return endGame('VICTORY');
    }
    
    updateUI();
    updateMessageLog(`📅 Kết thúc mùa ${state.season - 1}. Thu nhập: ${income}. Bắt đầu Mùa ${state.season}.`);
}

function endGame(status) {
    document.getElementById('play-screen').classList.add('hidden');
    document.getElementById('results-screen').classList.remove('hidden');
    
    document.getElementById('final-season').textContent = season - 1;
    document.getElementById('final-farmland').textContent = farmland;
    document.getElementById('final-funds').textContent = funds;
    document.getElementById('final-score').textContent = score;
    
    document.getElementById('final-status').textContent = status === 'VICTORY' ? 'THẮNG LỢI VĨ ĐẠI!' : 'THẤT BẠI THẢM KHỐC!';
    
    // Hiển thị panel nâng cấp
    showUpgradePanel();
}

function showUpgradePanel() {
    const panel = document.getElementById('upgrade-panel');
    panel.innerHTML = `
        <h3>Nâng Cấp Sau Khi Kết Thúc</h3>
        <p>Điểm hiện có: ${score}</p>
        <button class="action-btn" onclick="applyUpgrade('funds', 200)">Tăng Tiền Ban Đầu (+200 Điểm, Lần ${upgrades.funds + 1})</button>
        <button class="action-btn" onclick="applyUpgrade('costReduction', 100)">Giảm Chi Phí Xây Dựng (-10 Tiền, Lần ${upgrades.costReduction + 1})</button>
        <button class="action-btn" onclick="applyUpgrade('resistance', 50)">Tăng Kháng Khí Hậu (-5% rủi ro, Lần ${upgrades.resistance + 1})</button>
        <button class="action-btn" onclick="closeUpgrade()">Đóng</button>
    `;
    panel.style.display = 'block';
}

function applyUpgrade(type, cost) {
    if (score >= cost) {
        score -= cost;
        if (type === 'funds') upgrades.funds++;
        if (type === 'costReduction') upgrades.costReduction++;
        if (type === 'resistance') upgrades.resistance++;
        updateMessageLog(`Đã nâng cấp ${type}! Chi phí: ${cost} điểm.`);
        updateUI();
        showUpgradePanel(); // Cập nhật lại panel
    } else {
        updateMessageLog('Không đủ điểm để nâng cấp!');
    }
}

function closeUpgrade() {
    document.getElementById('upgrade-panel').style.display = 'none';
}

function restartGame() {
    document.getElementById('results-screen').classList.add('hidden');
    document.getElementById('menu-screen').classList.remove('hidden');
    document.getElementById('upgrade-panel').style.display = 'none';
}

// Khởi động Menu khi tải trang
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('menu-screen').classList.remove('hidden');
});