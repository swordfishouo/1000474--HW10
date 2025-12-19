/* jshint loopfunc:true */

const SIZE = 8;
let board = [];
let current = 1; // 1=玩家黑棋, 2=AI白棋

const boardEl = document.getElementById("board");
const currentPlayerEl = document.getElementById("currentPlayer");
const blackScoreEl = document.getElementById("blackScore");
const whiteScoreEl = document.getElementById("whiteScore");
const restartBtn = document.getElementById("restartBtn");
const aiLevelEl = document.getElementById("aiLevel");

const DIRS = [
    [-1, -1], [-1, 0], [-1, 1],
    [0, -1],          [0, 1],
    [1, -1], [1, 0], [1, 1]
];

// ===== 初始化棋盤 =====
function initBoard() {
    board = Array.from({ length: SIZE }, () => Array(SIZE).fill(0));
    const m = SIZE / 2;
    board[m - 1][m - 1] = board[m][m] = 2;
    board[m - 1][m] = board[m][m - 1] = 1;
    current = 1;
    render();
}

// ===== 判斷是否在棋盤內 =====
function within(r, c) {
    return r >= 0 && r < SIZE && c >= 0 && c < SIZE;
}

// ===== 計算落子可翻轉棋子 =====
function flipsForMove(r, c, p) {
    if (board[r][c] !== 0) return [];
    const o = p === 1 ? 2 : 1;
    let res = [];
    for (const [dr, dc] of DIRS) {
        let rr = r + dr, cc = c + dc, line = [];
        while (within(rr, cc) && board[rr][cc] === o) {
            line.push([rr, cc]);
            rr += dr;
            cc += dc;
        }
        if (line.length && within(rr, cc) && board[rr][cc] === p) res = res.concat(line);
    }
    return res;
}

// ===== 取得玩家所有合法落子 =====
function getLegalMoves(p) {
    const m = new Map();
    for (let r = 0; r < SIZE; r++)
        for (let c = 0; c < SIZE; c++) {
            const f = flipsForMove(r, c, p);
            if (f.length) m.set(`${r},${c}`, f);
        }
    return m;
}

// ===== 計算分數 =====
function computeScore() {
    let b = 0, w = 0;
    for (const row of board)
        for (const v of row) {
            if (v === 1) b++;
            else if (v === 2) w++;
        }
    return { b, w };
}

// ===== 渲染棋盤 =====
function render() {
    boardEl.innerHTML = "";
    const moves = getLegalMoves(current);

    for (let r = 0; r < SIZE; r++) {
        for (let c = 0; c < SIZE; c++) {
            const cell = document.createElement("div");
            cell.className = "cell";
            const v = board[r][c];

            if (v) {
                const p = document.createElement("div");
                p.className = "piece " + (v === 1 ? "black" : "white");
                cell.appendChild(p);
            }

            const key = `${r},${c}`;
            if (moves.has(key) && current === 1) {
                cell.classList.add("possible", "available");
                const hint = document.createElement("div");
                hint.className = "hint";
                hint.textContent = moves.get(key).length;
                cell.appendChild(hint);
                cell.onclick = () => onCellClick(r, c, moves.get(key));
            } else {
                cell.classList.add("disabled");
            }
            boardEl.appendChild(cell);
        }
    }

    const s = computeScore();
    blackScoreEl.textContent = s.b;
    whiteScoreEl.textContent = s.w;
    currentPlayerEl.textContent = current === 1 ? "黑" : "白";

    checkForEndOrPass();
}

// ===== 落子事件 =====
function onCellClick(r, c, flips) {
    board[r][c] = current;
    for (const [rr, cc] of flips) board[rr][cc] = current;
    current = current === 1 ? 2 : 1;
    render();

    // AI 回合
    if (current === 2) {
        const aiMoves = getLegalMoves(2);
        if (aiMoves.size > 0) {
            setTimeout(() => {
                if (aiLevelEl.value === "easy") aiEasyMove();
                else aiHardMove();
            }, 400);
        } else {
            // AI 無法下子時直接跳過
            current = 1;
            setTimeout(render, 300);
        }
    }
}

// ===== 判斷是否跳過回合或遊戲結束 =====
function checkForEndOrPass() {
    if (getLegalMoves(current).size) return;
    const other = current === 1 ? 2 : 1;
    if (getLegalMoves(other).size) {
        setTimeout(() => {
            alert((current === 1 ? "黑" : "白") + " 無子可下，回合跳過");
            current = other;
            render();
        }, 50);
    } else {
        const s = computeScore();
        setTimeout(() => {
            alert(`遊戲結束 黑 ${s.b} : 白 ${s.w}`);
        }, 50);
    }
}

/* ===== AI ===== */

// 簡單隨機模式
function aiEasyMove() {
    const moves = [...getLegalMoves(2)];
    if (!moves.length) return;
    const [key, flips] = moves[Math.floor(Math.random() * moves.length)];
    const [r, c] = key.split(",").map(Number);
    onCellClick(r, c, flips);
}

// 困難模式：角落優先 + 翻子數 + 行動力
function aiHardMove() {
    const moves = getLegalMoves(2);
    if (!moves.size) return;

    let bestScore = -Infinity;
    let bestMove = null;

    for (const [key, flips] of moves) {
        const [r, c] = key.split(",").map(Number);
        let score = flips.length * 10;

        // 角落超高權重
        if ((r === 0 && c === 0) || (r === 0 && c === SIZE-1) || (r === SIZE-1 && c === 0) || (r === SIZE-1 && c === SIZE-1)) {
            score += 1000;
        }

        // 邊線加分
        if (r === 0 || r === SIZE-1 || c === 0 || c === SIZE-1) score += 50;

        // 模擬落子減少玩家行動力
        const backup = board.map(row => row.slice());
        board[r][c] = 2;
        for (const [rr, cc] of flips) board[rr][cc] = 2;
        const opponentMoves = getLegalMoves(1).size;
        score -= opponentMoves * 5;
        board = backup;

        if (score > bestScore) {
            bestScore = score;
            bestMove = [r, c, flips];
        }
    }

    if (bestMove) onCellClick(bestMove[0], bestMove[1], bestMove[2]);
}

// ===== 重新開始按鈕 =====
restartBtn.onclick = initBoard;

// ===== 初始啟動 =====
initBoard();
