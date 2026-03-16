/**
 * 中国象棋游戏核心逻辑
 */

class ChineseChessGame {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');

        // 游戏状态
        this.board = null;
        this.currentPlayer = COLORS.RED;  // 红方先走
        this.selectedPiece = null;
        this.validMoves = [];
        this.history = [];  // 历史记录，用于悔棋
        this.gameOver = false;
        this.winner = null;

        // 显示设置
        this.showHints = true;  // 是否显示走棋提示

        // 观战者
        this.spectators = [];

        // 初始化
        this.init();
    }

    init() {
        this.setupCanvas();
        this.board = createInitialBoard();
        this.bindEvents();
        this.render();
        this.loadGame();
        this.updateStatus();
    }

    /**
     * 设置 Canvas 尺寸
     */
    setupCanvas() {
        const container = this.canvas.parentElement;
        const containerWidth = container.clientWidth - 16;  // 减去padding

        // 计算合适的棋盘尺寸
        // 棋盘比例：9列 x 10行，加上边距
        const gridCount = 8;  // 9个交叉点之间有8格
        const gridCountY = 9;  // 10行有9格

        // 根据容器宽度计算格子大小
        const gridSize = Math.floor((containerWidth - 40) / gridCount);  // 留出边距
        this.gridSize = Math.max(gridSize, 30);  // 最小30px
        this.gridSize = Math.min(this.gridSize, 45);  // 最大45px

        // 计算棋盘实际尺寸
        this.boardWidth = this.gridSize * gridCount + 40;
        this.boardHeight = this.gridSize * gridCountY + 40;

        // 设置canvas尺寸（考虑设备像素比）
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.boardWidth * dpr;
        this.canvas.height = this.boardHeight * dpr;
        this.canvas.style.width = this.boardWidth + 'px';
        this.canvas.style.height = this.boardHeight + 'px';

        this.ctx.scale(dpr, dpr);

        // 边距
        this.padding = 20;
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 触摸/点击事件
        const handleMove = (e) => {
            e.preventDefault();
            if (this.gameOver) return;

            const pos = this.getEventPosition(e);
            this.handleClick(pos.x, pos.y);
        };

        this.canvas.addEventListener('click', handleMove);
        this.canvas.addEventListener('touchstart', handleMove, {passive: false});

        // 控制按钮
        document.getElementById('undoBtn').addEventListener('click', () => this.undo());
        document.getElementById('hintBtn').addEventListener('click', () => this.toggleHints());
        document.getElementById('restartBtn').addEventListener('click', () => this.restart());

        // 弹窗
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            document.getElementById('gameOverModal').classList.remove('active');
            this.restart();
        });

        // 窗口大小变化
        window.addEventListener('resize', () => {
            this.setupCanvas();
            this.render();
        });
    }

    /**
     * 获取触摸/点击位置
     */
    getEventPosition(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX, clientY;

        if (e.touches) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        } else {
            clientX = e.clientX;
            clientY = e.clientY;
        }

        const x = clientX - rect.left;
        const y = clientY - rect.top;

        return {x, y};
    }

    /**
     * 处理点击
     */
    handleClick(clickX, clickY) {
        // 转换为棋盘坐标
        const gridX = Math.round((clickX - this.padding) / this.gridSize);
        const gridY = Math.round((clickY - this.padding) / this.gridSize);

        // 检查是否在棋盘范围内
        if (gridX < 0 || gridX > 8 || gridY < 0 || gridY > 9) {
            return;
        }

        const clickedPiece = this.board[gridY][gridX];

        // 如果已选中棋子
        if (this.selectedPiece) {
            // 检查是否点击了可移动位置
            const isValidMove = this.validMoves.some(m => m.x === gridX && m.y === gridY);

            if (isValidMove) {
                this.movePiece(this.selectedPiece, gridX, gridY);
            } else if (clickedPiece && clickedPiece.color === this.currentPlayer) {
                // 选择另一个己方棋子
                this.selectPiece(clickedPiece);
            } else {
                // 取消选择
                this.deselectPiece();
            }
        } else {
            // 选择棋子
            if (clickedPiece && clickedPiece.color === this.currentPlayer) {
                this.selectPiece(clickedPiece);
            }
        }
    }

    /**
     * 选择棋子
     */
    selectPiece(piece) {
        this.selectedPiece = piece;
        // 获取所有可能的移动
        this.validMoves = piece.getValidMoves(this.board);
        // 过滤掉会导致自己被将军的移动
        this.validMoves = this.validMoves.filter(move => {
            return this.isValidMove(piece, move.x, move.y);
        });
        this.render();
    }

    /**
     * 取消选择
     */
    deselectPiece() {
        this.selectedPiece = null;
        this.validMoves = [];
        this.render();
    }

    /**
     * 检查移动是否合法（不会导致自己被将军）
     */
    isValidMove(piece, toX, toY) {
        // 保存原状态
        const fromX = piece.x;
        const fromY = piece.y;
        const targetPiece = this.board[toY][toX];

        // 模拟移动
        this.board[fromY][fromX] = null;
        this.board[toY][toX] = piece;
        piece.x = toX;
        piece.y = toY;

        // 检查是否被将军
        const inCheck = isInCheck(this.board, this.currentPlayer);

        // 恢复原状态
        this.board[fromY][fromX] = piece;
        this.board[toY][toX] = targetPiece;
        piece.x = fromX;
        piece.y = fromY;

        return !inCheck;
    }

    /**
     * 移动棋子
     */
    movePiece(piece, toX, toY) {
        const fromX = piece.x;
        const fromY = piece.y;
        const capturedPiece = this.board[toY][toX];

        // 保存历史记录
        this.history.push({
            piece: piece,
            fromX: fromX,
            fromY: fromY,
            toX: toX,
            toY: toY,
            capturedPiece: capturedPiece
        });

        // 执行移动
        this.board[fromY][fromX] = null;
        this.board[toY][toX] = piece;
        piece.x = toX;
        piece.y = toY;

        // 清除选择
        this.deselectPiece();

        // 切换玩家
        this.currentPlayer = this.currentPlayer === COLORS.RED ? COLORS.BLACK : COLORS.RED;

        // 检查游戏结束
        this.checkGameOver();

        // 更新状态显示
        this.updateStatus();

        // 保存游戏
        this.saveGame();

        // 通知观战者
        this.notifySpectators();
    }

    /**
     * 悔棋
     */
    undo() {
        if (this.history.length === 0 || this.gameOver) return;

        const lastMove = this.history.pop();

        // 恢复棋子位置
        this.board[lastMove.toY][lastMove.toX] = lastMove.capturedPiece;
        this.board[lastMove.fromY][lastMove.fromX] = lastMove.piece;
        lastMove.piece.x = lastMove.fromX;
        lastMove.piece.y = lastMove.fromY;

        // 切换回上一个玩家
        this.currentPlayer = this.currentPlayer === COLORS.RED ? COLORS.BLACK : COLORS.RED;

        // 清除选择
        this.deselectPiece();

        // 更新状态
        this.updateStatus();

        // 保存游戏
        this.saveGame();
    }

    /**
     * 切换走棋提示
     */
    toggleHints() {
        this.showHints = !this.showHints;
        const hintBtn = document.getElementById('hintBtn');
        hintBtn.textContent = this.showHints ? '提示' : '无提示';
        this.render();
    }

    /**
     * 重新开始
     */
    restart() {
        this.board = createInitialBoard();
        this.currentPlayer = COLORS.RED;
        this.selectedPiece = null;
        this.validMoves = [];
        this.history = [];
        this.gameOver = false;
        this.winner = null;

        this.render();
        this.updateStatus();
        this.saveGame();

        // 清除聊天记录
        if (window.chat) {
            window.chat.clearMessages();
        }
    }

    /**
     * 检查游戏是否结束
     */
    checkGameOver() {
        // 检查是否将军
        const inCheck = isInCheck(this.board, this.currentPlayer);

        // 检查是否绝杀
        if (isCheckmate(this.board, this.currentPlayer)) {
            this.gameOver = true;
            this.winner = this.currentPlayer === COLORS.RED ? COLORS.BLACK : COLORS.RED;
            this.showGameOver();
            return;
        }

        // 如果将军，显示提示
        if (inCheck) {
            this.showCheckAlert();
        }
    }

    /**
     * 显示将军提示
     */
    showCheckAlert() {
        const statusEl = document.getElementById(this.currentPlayer + '-status');
        if (statusEl) {
            statusEl.textContent = '将军！';
            statusEl.classList.add('check-alert');
            setTimeout(() => {
                statusEl.classList.remove('check-alert');
            }, 2000);
        }
    }

    /**
     * 显示游戏结束
     */
    showGameOver() {
        const modal = document.getElementById('gameOverModal');
        const title = document.getElementById('gameOverTitle');
        const message = document.getElementById('gameOverMessage');

        title.textContent = this.winner === COLORS.RED ? '红方胜利！' : '黑方胜利！';
        message.textContent = '恭喜获胜！';

        modal.classList.add('active');

        // 清除保存的游戏
        localStorage.removeItem('chessGame');
    }

    /**
     * 更新状态显示
     */
    updateStatus() {
        const redStatus = document.getElementById('red-status');
        const blackStatus = document.getElementById('black-status');

        if (this.gameOver) {
            redStatus.textContent = this.winner === COLORS.RED ? '胜利' : '失败';
            blackStatus.textContent = this.winner === COLORS.BLACK ? '胜利' : '失败';
            redStatus.classList.remove('active');
            blackStatus.classList.remove('active');
        } else {
            redStatus.textContent = this.currentPlayer === COLORS.RED ? '走棋中' : '等待中';
            blackStatus.textContent = this.currentPlayer === COLORS.BLACK ? '走棋中' : '等待中';
            redStatus.classList.toggle('active', this.currentPlayer === COLORS.RED);
            blackStatus.classList.toggle('active', this.currentPlayer === COLORS.BLACK);
        }

        // 更新悔棋按钮状态
        document.getElementById('undoBtn').disabled = this.history.length === 0 || this.gameOver;
    }

    /**
     * 保存游戏
     */
    saveGame() {
        const gameState = {
            board: this.board.map(row => row.map(piece => {
                if (piece) {
                    return {
                        type: piece.type,
                        color: piece.color,
                        x: piece.x,
                        y: piece.y
                    };
                }
                return null;
            })),
            currentPlayer: this.currentPlayer,
            history: this.history.map(h => ({
                pieceType: h.piece.type,
                pieceColor: h.piece.color,
                fromX: h.fromX,
                fromY: h.fromY,
                toX: h.toX,
                toY: h.toY,
                capturedPiece: h.capturedPiece ? {
                    type: h.capturedPiece.type,
                    color: h.capturedPiece.color
                } : null
            })),
            gameOver: this.gameOver,
            winner: this.winner
        };

        localStorage.setItem('chessGame', JSON.stringify(gameState));
    }

    /**
     * 加载游戏
     */
    loadGame() {
        const saved = localStorage.getItem('chessGame');
        if (!saved) return;

        try {
            const gameState = JSON.parse(saved);

            // 恢复棋盘
            this.board = gameState.board.map(row => row.map(pieceData => {
                if (pieceData) {
                    return new Piece(pieceData.type, pieceData.color, pieceData.x, pieceData.y);
                }
                return null;
            }));

            // 恢复当前玩家
            this.currentPlayer = gameState.currentPlayer;

            // 恢复历史记录
            this.history = gameState.history.map(h => ({
                piece: this.board[h.fromY]?.[h.fromX] || new Piece(h.pieceType, h.pieceColor, h.fromX, h.fromY),
                fromX: h.fromX,
                fromY: h.fromY,
                toX: h.toX,
                toY: h.toY,
                capturedPiece: h.capturedPiece ? new Piece(h.capturedPiece.type, h.capturedPiece.color, h.toX, h.toY) : null
            }));

            // 恢复游戏结束状态
            this.gameOver = gameState.gameOver || false;
            this.winner = gameState.winner || null;

            if (this.gameOver) {
                this.showGameOver();
            }
        } catch (e) {
            console.error('加载游戏失败:', e);
        }
    }

    /**
     * 添加观战者
     */
    addSpectator(name) {
        if (!this.spectators.includes(name)) {
            this.spectators.push(name);
            this.updateSpectatorList();
        }
    }

    /**
     * 移除观战者
     */
    removeSpectator(name) {
        const index = this.spectators.indexOf(name);
        if (index > -1) {
            this.spectators.splice(index, 1);
            this.updateSpectatorList();
        }
    }

    /**
     * 更新观战者列表
     */
    updateSpectatorList() {
        const countEl = document.getElementById('spectatorCount');
        const listEl = document.getElementById('spectatorList');

        countEl.textContent = this.spectators.length;
        listEl.innerHTML = this.spectators.map(name =>
            `<span class="spectator-item">${name}</span>`
        ).join('');
    }

    /**
     * 通知观战者
     */
    notifySpectators() {
        // 这里可以扩展为WebSocket通知
        // 暂时使用localStorage来模拟
        localStorage.setItem('chessBoardUpdate', JSON.stringify({
            timestamp: Date.now(),
            board: this.board
        }));
    }

    /**
     * 渲染棋盘
     */
    render() {
        this.ctx.clearRect(0, 0, this.boardWidth, this.boardHeight);

        this.drawBoard();
        this.drawPieces();
        this.drawSelection();
        this.drawValidMoves();
    }

    /**
     * 绘制棋盘
     */
    drawBoard() {
        const ctx = this.ctx;
        const padding = this.padding;
        const gridSize = this.gridSize;

        // 背景
        ctx.fillStyle = '#f0d9b5';
        ctx.fillRect(0, 0, this.boardWidth, this.boardHeight);

        // 绘制网格线
        ctx.strokeStyle = '#8b4513';
        ctx.lineWidth = 1;

        // 横线
        for (let i = 0; i < 10; i++) {
            ctx.beginPath();
            ctx.moveTo(padding, padding + i * gridSize);
            ctx.lineTo(padding + 8 * gridSize, padding + i * gridSize);
            ctx.stroke();
        }

        // 竖线
        for (let i = 0; i < 9; i++) {
            ctx.beginPath();
            if (i === 0 || i === 8) {
                // 边线画到底
                ctx.moveTo(padding + i * gridSize, padding);
                ctx.lineTo(padding + i * gridSize, padding + 9 * gridSize);
            } else {
                // 中间竖线断开（楚河汉界）
                ctx.moveTo(padding + i * gridSize, padding);
                ctx.lineTo(padding + i * gridSize, padding + 4 * gridSize);
                ctx.moveTo(padding + i * gridSize, padding + 5 * gridSize);
                ctx.lineTo(padding + i * gridSize, padding + 9 * gridSize);
            }
            ctx.stroke();
        }

        // 绘制九宫格斜线
        ctx.beginPath();
        // 上方九宫格
        ctx.moveTo(padding + 3 * gridSize, padding);
        ctx.lineTo(padding + 5 * gridSize, padding + 2 * gridSize);
        ctx.moveTo(padding + 5 * gridSize, padding);
        ctx.lineTo(padding + 3 * gridSize, padding + 2 * gridSize);

        // 下方九宫格
        ctx.moveTo(padding + 3 * gridSize, padding + 7 * gridSize);
        ctx.lineTo(padding + 5 * gridSize, padding + 9 * gridSize);
        ctx.moveTo(padding + 5 * gridSize, padding + 7 * gridSize);
        ctx.lineTo(padding + 3 * gridSize, padding + 9 * gridSize);
        ctx.stroke();

        // 绘制楚河汉界文字
        ctx.font = `bold ${gridSize * 0.4}px "KaiTi", "楷体", serif`;
        ctx.fillStyle = '#8b4513';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const riverY = padding + 4.5 * gridSize;
        ctx.fillText('楚 河', padding + 2 * gridSize, riverY);
        ctx.fillText('汉 界', padding + 6 * gridSize, riverY);

        // 绘制兵/卒和炮的标记点
        this.drawStarPoints();
    }

    /**
     * 绘制星位点
     */
    drawStarPoints() {
        const ctx = this.ctx;
        const padding = this.padding;
        const gridSize = this.gridSize;
        const starSize = gridSize * 0.1;

        ctx.fillStyle = '#8b4513';

        // 炮位置
        const cannonPositions = [
            [1, 2], [7, 2],  // 黑炮
            [1, 7], [7, 7]   // 红炮
        ];

        // 兵/卒位置
        const soldierPositions = [
            [0, 3], [2, 3], [4, 3], [6, 3], [8, 3],  // 黑卒
            [0, 6], [2, 6], [4, 6], [6, 6], [8, 6]   // 红兵
        ];

        const allPositions = [...cannonPositions, ...soldierPositions];

        allPositions.forEach(([x, y]) => {
            this.drawStar(padding + x * gridSize, padding + y * gridSize, starSize);
        });
    }

    /**
     * 绘制星形标记
     */
    drawStar(cx, cy, size) {
        const ctx = this.ctx;
        const positions = [
            [-1, -1], [1, -1], [-1, 1], [1, 1]
        ];

        positions.forEach(([dx, dy]) => {
            ctx.beginPath();
            ctx.moveTo(cx + dx * size * 2, cy + dy * size * 2);
            ctx.lineTo(cx + dx * size * 2, cy + dy * size * 4);
            ctx.moveTo(cx + dx * size * 2, cy + dy * size * 2);
            ctx.lineTo(cx + dx * size * 4, cy + dy * size * 2);
            ctx.stroke();
        });
    }

    /**
     * 绘制棋子
     */
    drawPieces() {
        const ctx = this.ctx;
        const padding = this.padding;
        const gridSize = this.gridSize;
        const pieceRadius = gridSize * 0.42;

        for (let y = 0; y < 10; y++) {
            for (let x = 0; x < 9; x++) {
                const piece = this.board[y][x];
                if (piece && !piece.captured) {
                    this.drawPiece(
                        padding + x * gridSize,
                        padding + y * gridSize,
                        pieceRadius,
                        piece
                    );
                }
            }
        }
    }

    /**
     * 绘制单个棋子
     */
    drawPiece(cx, cy, radius, piece) {
        const ctx = this.ctx;

        // 阴影
        ctx.beginPath();
        ctx.arc(cx + 2, cy + 2, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fill();

        // 外圈
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        const gradient = ctx.createRadialGradient(cx - radius * 0.3, cy - radius * 0.3, 0, cx, cy, radius);
        if (piece.color === COLORS.RED) {
            gradient.addColorStop(0, '#fff5f5');
            gradient.addColorStop(1, '#ffe0e0');
        } else {
            gradient.addColorStop(0, '#f5f5f5');
            gradient.addColorStop(1, '#e0e0e0');
        }
        ctx.fillStyle = gradient;
        ctx.fill();

        // 边框
        ctx.strokeStyle = piece.color === COLORS.RED ? '#cc0000' : '#333';
        ctx.lineWidth = 2;
        ctx.stroke();

        // 内圈
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.85, 0, Math.PI * 2);
        ctx.strokeStyle = piece.color === COLORS.RED ? '#cc0000' : '#333';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 文字
        ctx.font = `bold ${radius * 1.1}px "KaiTi", "楷体", "SimHei", sans-serif`;
        ctx.fillStyle = piece.color === COLORS.RED ? '#cc0000' : '#333';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(piece.getName(), cx, cy + 1);
    }

    /**
     * 绘制选中状态
     */
    drawSelection() {
        if (!this.selectedPiece) return;

        const ctx = this.ctx;
        const padding = this.padding;
        const gridSize = this.gridSize;
        const pieceRadius = gridSize * 0.48;

        const x = padding + this.selectedPiece.x * gridSize;
        const y = padding + this.selectedPiece.y * gridSize;

        // 选中高亮
        ctx.beginPath();
        ctx.arc(x, y, pieceRadius, 0, Math.PI * 2);
        ctx.strokeStyle = '#4CAF50';
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    /**
     * 绘制可移动位置
     */
    drawValidMoves() {
        if (!this.showHints || this.validMoves.length === 0) return;

        const ctx = this.ctx;
        const padding = this.padding;
        const gridSize = this.gridSize;

        this.validMoves.forEach(move => {
            const x = padding + move.x * gridSize;
            const y = padding + move.y * gridSize;
            const targetPiece = this.board[move.y][move.x];

            ctx.beginPath();
            if (targetPiece) {
                // 可以吃子的位置
                ctx.arc(x, y, gridSize * 0.45, 0, Math.PI * 2);
                ctx.strokeStyle = '#ff5722';
                ctx.lineWidth = 3;
                ctx.stroke();
            } else {
                // 空位
                ctx.arc(x, y, gridSize * 0.15, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(76, 175, 80, 0.6)';
                ctx.fill();
            }
        });
    }
}

// 初始化游戏
let game;
document.addEventListener('DOMContentLoaded', () => {
    game = new ChineseChessGame('chessBoard');
    window.game = game;  // 暴露给全局，供chat.js使用
});
