/**
 * 定数定義
 */
const AISLE = 0;      // 通路 (白)
const FLG_START = 1;  // スタート
const FLG_GOAL = 2;   // ゴール
const WALL = 3;       // 壁 (黒)
const PATH = 8;       // 正解ルート (緑)
const VISITED = 9;    // 探索済み (黄)

// 色設定
const COLORS = {
    [AISLE]: '#FFFFFF',
    [WALL]: '#000000',
    [FLG_START]: '#FF0000', 
    [FLG_GOAL]: '#0000FF',
    // [VISITED]: '#FFFF00',
    [VISITED]: '#ff9100',
    [PATH]: '#00FF00'
};

// グローバル変数
let maze = [];
let rows = 0;
let cols = 0;
let cellSize = 0;
let isAnimating = false;

// キャンバスの固定サイズ
const CANVAS_SIZE = 600;

// DOM要素
const canvas = document.getElementById('mazeCanvas');
const ctx = canvas.getContext('2d');
const btnCreate = document.getElementById('btnCreate');
const btnSolve = document.getElementById('btnSolve');
const inputGridSize = document.getElementById('gridSize');
const rangeSpeed = document.getElementById('speedRange');
// 分岐率スライダー要素
const rangeBranch = document.getElementById('branchRate');

/**
 * 初期化イベント
 */
window.onload = () => {
    createMaze();
    
    btnCreate.onclick = createMaze;
    btnSolve.onclick = solveMaze;
};

/**
 * 迷路作成
 */
function createMaze() {
    if (isAnimating) return;

    let val = parseInt(inputGridSize.value);
    if (val % 2 === 0) val += 1; 
    
    rows = val;
    cols = val;
    cellSize = CANVAS_SIZE / rows;

    // スライダーから分岐率を取得 (0~100 を 0.0~1.0 に変換)
    const branchRate = parseInt(rangeBranch.value) / 100;

    // 配列初期化 (全て壁)
    maze = [];
    for (let y = 0; y < rows; y++) {
        maze[y] = [];
        for (let x = 0; x < cols; x++) {
            maze[y][x] = WALL;
        }
    }

    // --- 迷路生成ロジック ---
    let activeCells = [];
    const startY = 1;
    const startX = 1;
    maze[startY][startX] = AISLE;
    activeCells.push({y: startY, x: startX});

    const directions = [
        { dy: -2, dx: 0 },
        { dy: 2, dx: 0 }, 
        { dy: 0, dx: -2 },
        { dy: 0, dx: 2 } 
    ];

    while (activeCells.length > 0) {
        let index;

        // 定数ではなく変数 branchRate を使用
        if (Math.random() < branchRate) {
            index = Math.floor(Math.random() * activeCells.length); // ランダム (分岐重視)
        } else {
            index = activeCells.length - 1; // 最新 (直進・うねり重視)
        }
        
        const cell = activeCells[index];
        const cy = cell.y;
        const cx = cell.x;

        shuffleArray(directions);

        let found = false;

        for (let i = 0; i < directions.length; i++) {
            const ny = cy + directions[i].dy;
            const nx = cx + directions[i].dx;

            if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                if (maze[ny][nx] === WALL) {
                    const wallY = cy + directions[i].dy / 2;
                    const wallX = cx + directions[i].dx / 2;
                    maze[wallY][wallX] = AISLE;
                    maze[ny][nx] = AISLE;

                    activeCells.push({ y: ny, x: nx });
                    found = true;
                    break;
                }
            }
        }

        if (!found) {
            activeCells.splice(index, 1);
        }
    }

    // スタートとゴール
    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;

    drawMaze();
    btnSolve.disabled = false;
}

/**
 * 迷路を解く
 */
async function solveMaze() {
    if (isAnimating) return;
    isAnimating = true;
    btnCreate.disabled = true;
    btnSolve.disabled = true;

    // 探索色リセット
    for(let y=0; y<rows; y++){
        for(let x=0; x<cols; x++){
            if(maze[y][x] === VISITED || maze[y][x] === PATH) {
                maze[y][x] = AISLE;
            }
        }
    }
    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;
    drawMaze();

    let startNode = {y:1, x:1};
    let goalNode = {y:rows-2, x:cols-2};

    let queue = [];
    queue.push(startNode);

    let prev = {}; 
    let visitedMap = new Set();
    
    const dy = [0, 1, 0, -1];
    const dx = [1, 0, -1, 0];

    let reachedGoal = false;

    while (queue.length > 0) {
        const current = queue.shift();
        const cy = current.y;
        const cx = current.x;

        if (cy === goalNode.y && cx === goalNode.x) {
            reachedGoal = true;
            break;
        }

        for (let i = 0; i < 4; i++) {
            const ny = cy + dy[i];
            const nx = cx + dx[i];

            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                const cellType = maze[ny][nx];
                const key = `${ny},${nx}`;

                if ((cellType === AISLE || cellType === FLG_GOAL || cellType === FLG_START) && !visitedMap.has(key)) {
                    
                    if (maze[ny][nx] !== FLG_START && maze[ny][nx] !== FLG_GOAL) {
                        maze[ny][nx] = VISITED;
                    }
                    
                    visitedMap.add(key);
                    prev[key] = { y: cy, x: cx };
                    queue.push({ y: ny, x: nx });

                    const speed = parseInt(rangeSpeed.value);
                    const waitTime = Math.max(0, 100 - speed); 
                    
                    drawCell(ny, nx); 

                    if (waitTime > 0) await sleep(waitTime);
                }
            }
        }
    }

    if (reachedGoal) {
        let curr = goalNode;
        while (true) {
            const key = `${curr.y},${curr.x}`;
            if (curr.y === startNode.y && curr.x === startNode.x) break;

            if (maze[curr.y][curr.x] !== FLG_GOAL && maze[curr.y][curr.x] !== FLG_START) {
                maze[curr.y][curr.x] = PATH;
                drawCell(curr.y, curr.x);
            }

            if (prev[key]) {
                curr = prev[key];
            } else {
                break;
            }

            const speed = parseInt(rangeSpeed.value);
            const waitTime = Math.max(0, 100 - speed);
            if (waitTime > 0) await sleep(waitTime);
        }
        maze[startNode.y][startNode.x] = PATH;
        drawCell(startNode.y, startNode.x);
    }

    isAnimating = false;
    btnCreate.disabled = false;
}

function drawMaze() {
    ctx.fillStyle = COLORS[WALL];
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);

    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            drawCell(y, x);
        }
    }
}

function drawCell(y, x) {
    const type = maze[y][x];
    let color = COLORS[type] || '#FFFFFF';
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.6, cellSize + 0.6);
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}