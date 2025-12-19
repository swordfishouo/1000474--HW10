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

// ===== 渲染棋盤（只渲染棋子，不重建棋盤以保動畫） =====
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
                cell.onclick = () => playerMove(r, c, moves.get(key));
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

// ===== 玩家落子 =====
async function playerMove(r, c, flips) {
    await placePieceWithAnimation(r, c, flips, current);
    current = 2;
    render();
    aiTurn();
}

// ===== AI 回合 =====
async function aiTurn() {
    const moves = getLegalMoves(2);
    if (moves.size === 0) {
        current = 1;
        render();
        return;
    }

    await new Promise(res => setTimeout(res, 400)); // 模擬思考

    if (aiLevelEl.value === "easy") {
        const arr = [...moves];
        const [key, flips] = arr[Math.floor(Math.random() * arr.length)];
        const [r, c] = key.split(",").map(Number);
        await placePieceWithAnimation(r, c, flips, 2);
    } else {
        await aiHardMove();
    }

    current = 1;
    render();
}

// ===== 放置棋子 + 翻轉動畫 =====
async function placePieceWithAnimation(r, c, flips, player) {
    // 放置新棋子
    board[r][c] = player;
    const cell = boardEl.children[r * SIZE + c];
    const piece = document.createElement("div");
    piece.className = "piece " + (player === 1 ? "black" : "white");
    piece.style.transform = "rotateY(90deg)";
    cell.appendChild(piece);

    // 落子動畫
    await new Promise(res => {
        piece.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0deg)" }],
            { duration: 300, fill: "forwards" }).onfinish = res;
    });

    // 翻轉對手棋子
    for (const [rr, cc] of flips) {
        const fcell = boardEl.children[rr * SIZE + cc];
        const fpiece = fcell.querySelector(".piece");
        if (!fpiece) continue;

        await new Promise(res => {
            fpiece.animate([{ transform: "rotateY(0deg)" }, { transform: "rotateY(90deg)" }],
                { duration: 200, fill: "forwards" }).onfinish = () => {
                // 中間換顏色
                board[rr][cc] = player;
                fpiece.className = "piece " + (player === 1 ? "black" : "white");
                fpiece.animate([{ transform: "rotateY(90deg)" }, { transform: "rotateY(0deg)" }],
                    { duration: 200, fill: "forwards" }).onfinish = res;
            };
        });
    }
}

// ===== 困難 AI =====
async function aiHardMove() {
    const moves = getLegalMoves(2);
    if (!moves.size) return;

    let bestScore = -Infinity;
    let bestMove = null;

    for (const [key, flips] of moves) {
        const [r, c] = key.split(",").map(Number);
        let score = flips.length * 10;

        if ((r === 0 && c === 0) || (r === 0 && c === SIZE-1) || (r === SIZE-1 && c === 0) || (r === SIZE-1 && c === SIZE-1)) {
            score += 1000;
        }

        if (r === 0 || r === SIZE-1 || c === 0 || c === SIZE-1) score += 50;

        const backup = board.map(row => row.slice());
        board[r][c] = 2;
        for (const [rr, cc] of flips) board[rr][cc] = 2;
        score -= getLegalMoves(1).size * 5;
        board = backup;

        if (score > bestScore) {
            bestScore = score;
            bestMove = [r, c, flips];
        }
    }

    if (bestMove) {
        await placePieceWithAnimation(bestMove[0], bestMove[1], bestMove[2], 2);
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

// ===== 重新開始 =====
restartBtn.onclick = initBoard;

// ===== 初始啟動 =====
initBoard();

