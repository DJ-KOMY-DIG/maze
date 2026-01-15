// 定数定義
const AISLE = 0;      // 通路 (白)
const FLG_START = 1;  // スタート
const FLG_GOAL = 2;   // ゴール
const WALL = 3;       // 壁 (黒)
const PATH = 8;       // 正解ルート (緑)
const VISITED = 9;    // 探索済み (黄)

// 色設定
const COLORS = {
    [AISLE]: '#FFFFFF',     // 通路
    [WALL]: '#000000',      // 壁   
    [FLG_START]: '#FF0000', // スタート
    [FLG_GOAL]: '#0000FF',  // ゴール
    [VISITED]: '#ff9100',   // 探索済み
    [PATH]: '#00FF00'       // 正解ルート
};

// グローバル変数
let maze = [];              // 迷路データ配列
let rows = 0;               // 行数
let cols = 0;               // 列数
let cellSize = 0;           // セルのサイズ
let isAnimating = false;    // 迷路を解いている最中のフラグ

// キャンバスの固定サイズ
const CANVAS_SIZE = 600;

// DOM要素
const canvas = document.getElementById('mazeCanvas');       // キャンバス要素
const ctx = canvas.getContext('2d');                        // 2次元の描画コンテキスト
const btnCreate = document.getElementById('btnCreate');     // 迷路作成ボタン要素
const btnSolve = document.getElementById('btnSolve');       // 迷路解決ボタン要素
const inputGridSize = document.getElementById('gridSize');  // グリッドサイズ入力要素
const rangeSpeed = document.getElementById('speedRange');   // 速度スライダー要素
const rangeBranch = document.getElementById('branchRate');  // 分岐率スライダー要素

// 初期化イベント
window.onload = () => {
    createMaze();                   // 初期迷路作成    
    btnCreate.onclick = createMaze; // 迷路作成ボタンイベント設定
    btnSolve.onclick = solveMaze;   // 迷路解決ボタンイベント設定
};

// 迷路作成
function createMaze() {    
    if (isAnimating) return;    // 迷路探索中は処理しない
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

    // 迷路生成ロジック
    let activeCells = [];
    const startY = 1;
    const startX = 1;
    maze[startY][startX] = AISLE;
    activeCells.push({y: startY, x: startX});

    // 方向ベクトル配列
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
        
        const cell = activeCells[index];    // アクティブセル取得
        const cy = cell.y;                  // 現在のセルのy座標
        const cx = cell.x;                  // 現在のセルのx座標

        shuffleArray(directions);   // 方向配列をシャッフル

        let found = false;  // 新しいセル発見フラグを初期化

        // 4方向をチェック
        for (let i = 0; i < directions.length; i++) {
            const ny = cy + directions[i].dy;   // 新しいセルのy座標
            const nx = cx + directions[i].dx;   // 新しいセルのx座標

            // 迷路範囲内かつ未訪問セルか確認
            if (ny > 0 && ny < rows - 1 && nx > 0 && nx < cols - 1) {
                if (maze[ny][nx] === WALL) {
                    const wallY = cy + directions[i].dy / 2;    // 壁のy座標
                    const wallX = cx + directions[i].dx / 2;    // 壁のx座標

                    // 壁と新しいセルを通路に変更
                    maze[wallY][wallX] = AISLE;
                    maze[ny][nx] = AISLE;

                    // 新しいセルをアクティブセルリストに追加
                    activeCells.push({ y: ny, x: nx });
                    found = true;   // 新しいセル発見フラグを立てる
                    break;
                }
            }
        }

        if (!found) {
            activeCells.splice(index, 1);   // 探索済みセルをリストから削除
        }
    }

    // スタートとゴール
    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;

    drawMaze(); // 迷路描画
    btnSolve.disabled = false;  // 迷路解決ボタンを有効化
}

// 迷路を解く
async function solveMaze() {    
    if (isAnimating) return;    // 迷路探索中は処理しない
    isAnimating = true;         // 迷路を解いている最中のフラグを立てる
    btnCreate.disabled = true;  // 迷路作成ボタンを無効化
    btnSolve.disabled = true;   // 迷路解決ボタンを無効化

    // 探索色リセット
    for(let y = 0; y < rows; y++){
        for(let x = 0; x < cols; x++){
            if(maze[y][x] === VISITED || maze[y][x] === PATH) {
                maze[y][x] = AISLE;
            }
        }
    }
    maze[1][1] = FLG_START;
    maze[rows - 2][cols - 2] = FLG_GOAL;
    drawMaze(); // 迷路描画

    let startNode = {y:1, x:1};
    let goalNode = {y:rows-2, x:cols-2};

    let queue = [];
    queue.push(startNode);

    let prev = {};              // 探索履歴保存用オブジェクト 
    let visitedMap = new Set(); // 位置のセット
    
    // 方向ベクトル配列
    const dy = [0, 1, 0, -1];
    const dx = [1, 0, -1, 0];

    let reachedGoal = false;    // ゴール到達フラグ初期化

    while (queue.length > 0) {
        const current = queue.shift();
        const cy = current.y;
        const cx = current.x;

        // ゴール到達チェック
        if (cy === goalNode.y && cx === goalNode.x) {
            reachedGoal = true;
            break;
        }

        // 4方向をチェック
        for (let i = 0; i < 4; i++) {
            const ny = cy + dy[i];
            const nx = cx + dx[i];

            // 迷路範囲内の場合
            if (ny >= 0 && ny < rows && nx >= 0 && nx < cols) {
                const cellType = maze[ny][nx];  // セルの種類取得
                const key = `${ny},${nx}`;      // 位置キー作成

                // 通路かゴールかスタートで、未訪問の場合
                if ((cellType === AISLE || cellType === FLG_GOAL || cellType === FLG_START) && !visitedMap.has(key)) {

                    // 探索済みにマーク (スタートとゴールは除く)
                    if (maze[ny][nx] !== FLG_START && maze[ny][nx] !== FLG_GOAL) {
                        maze[ny][nx] = VISITED;
                    }
                    
                    visitedMap.add(key);            // 位置を訪問済みに追加
                    prev[key] = { y: cy, x: cx };   // 探索履歴に追加
                    queue.push({ y: ny, x: nx });   // キューに追加

                    // アニメーション速度制御
                    const speed = parseInt(rangeSpeed.value);
                    const waitTime = Math.max(0, 100 - speed); 
                    
                    drawCell(ny, nx);         // セル描画 

                    if (waitTime > 0) await sleep(waitTime);    // 指定時間待機
                }
            }
        }
    }

    // ゴールからスタートまでのパスを復元して描画
    if (reachedGoal) {
        let curr = goalNode;
        while (true) {
            const key = `${curr.y},${curr.x}`;  // 現在位置キー作成
            if (curr.y === startNode.y && curr.x === startNode.x) break;    // スタートに到達したら終了

            // パスを描画 (スタートとゴールは除く)
            if (maze[curr.y][curr.x] !== FLG_GOAL && maze[curr.y][curr.x] !== FLG_START) {
                maze[curr.y][curr.x] = PATH;
                drawCell(curr.y, curr.x);
            }

            // 一つ前の位置に戻る
            if (prev[key]) {
                curr = prev[key];
            } else {
                break;
            }

            // アニメーション速度制御
            const speed = parseInt(rangeSpeed.value);   
            const waitTime = Math.max(0, 100 - speed);
            if (waitTime > 0) await sleep(waitTime);    // 指定時間待機
        }
        maze[startNode.y][startNode.x] = PATH;  // スタート位置もパスに含める
        drawCell(startNode.y, startNode.x);     // スタートセル描画
    }

    isAnimating = false;        // 迷路探索中フラグを初期化
    btnCreate.disabled = false; // 迷路作成ボタンを有効化
}

// 迷路描画
function drawMaze() {
    ctx.fillStyle = COLORS[WALL];                   // 背景を壁色で塗りつぶし
    ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);   // キャンバス全体を塗りつぶし

    // 各セルを描画
    for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
            drawCell(y, x);
        }
    }
}

// セル描画
function drawCell(y, x) {
    const type = maze[y][x];
    let color = COLORS[type] || '#FFFFFF';
    ctx.fillStyle = color;
    ctx.fillRect(x * cellSize, y * cellSize, cellSize + 0.6, cellSize + 0.6);
}

// 配列をシャッフル
function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
}

// 指定ミリ秒だけ待機
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}