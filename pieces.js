/**
 * 中国象棋棋子规则定义
 */

// 棋子类型枚举
const PIECE_TYPES = {
    JIANG: '将',    // 将/帅
    SHI: '士',      // 士/仕
    XIANG: '象',    // 象/相
    MA: '马',       // 马
    JU: '车',       // 车
    PAO: '炮',      // 炮
    BING: '兵'      // 兵/卒
};

// 棋子颜色
const COLORS = {
    RED: 'red',
    BLACK: 'black'
};

// 棋子名称映射
const PIECE_NAMES = {
    red: {
        JIANG: '帅',
        SHI: '仕',
        XIANG: '相',
        MA: '馬',
        JU: '車',
        PAO: '炮',
        BING: '兵'
    },
    black: {
        JIANG: '将',
        SHI: '士',
        XIANG: '象',
        MA: '马',
        JU: '车',
        PAO: '炮',
        BING: '卒'
    }
};

/**
 * 棋子类
 */
class Piece {
    constructor(type, color, x, y) {
        this.type = type;
        this.color = color;
        this.x = x;  // 列 (0-8)
        this.y = y;  // 行 (0-9)
        this.captured = false;
    }

    getName() {
        const colorNames = PIECE_NAMES[this.color];
        return colorNames[this.type] || this.type;
    }

    /**
     * 获取该棋子所有可能的移动位置
     * @param {Array} board - 棋盘状态
     * @returns {Array} 可移动位置数组 [{x, y}]
     */
    getValidMoves(board) {
        switch (this.type) {
            case PIECE_TYPES.JIANG:
                return this.getJiangMoves(board);
            case PIECE_TYPES.SHI:
                return this.getShiMoves(board);
            case PIECE_TYPES.XIANG:
                return this.getXiangMoves(board);
            case PIECE_TYPES.MA:
                return this.getMaMoves(board);
            case PIECE_TYPES.JU:
                return this.getJuMoves(board);
            case PIECE_TYPES.PAO:
                return this.getPaoMoves(board);
            case PIECE_TYPES.BING:
                return this.getBingMoves(board);
            default:
                return [];
        }
    }

    /**
     * 将/帅的走法：在九宫格内，每次走一格，横竖都可以
     */
    getJiangMoves(board) {
        const moves = [];
        const directions = [
            {dx: 0, dy: -1},  // 上
            {dx: 0, dy: 1},   // 下
            {dx: -1, dy: 0},  // 左
            {dx: 1, dy: 0}    // 右
        ];

        // 九宫格范围
        const minX = 3, maxX = 5;
        const minY = this.color === COLORS.RED ? 7 : 0;
        const maxY = this.color === COLORS.RED ? 9 : 2;

        for (const dir of directions) {
            const newX = this.x + dir.dx;
            const newY = this.y + dir.dy;

            if (this.isValidPosition(newX, newY, minX, maxX, minY, maxY)) {
                const target = board[newY][newX];
                if (!target || target.color !== this.color) {
                    moves.push({x: newX, y: newY});
                }
            }
        }

        // 检查是否可以吃对方的将（对面将）
        const enemyColor = this.color === COLORS.RED ? COLORS.BLACK : COLORS.RED;
        let enemyJiang = null;

        // 找到对方的将
        for (let y = 0; y < 10; y++) {
            for (let x = 3; x <= 5; x++) {
                const piece = board[y][x];
                if (piece && piece.type === PIECE_TYPES.JIANG && piece.color === enemyColor) {
                    enemyJiang = piece;
                    break;
                }
            }
            if (enemyJiang) break;
        }

        // 如果在同一列且中间没有棋子，可以直接吃
        if (enemyJiang && enemyJiang.x === this.x) {
            let blocked = false;
            const startY = Math.min(this.y, enemyJiang.y) + 1;
            const endY = Math.max(this.y, enemyJiang.y);
            for (let y = startY; y < endY; y++) {
                if (board[y][this.x]) {
                    blocked = true;
                    break;
                }
            }
            if (!blocked) {
                moves.push({x: enemyJiang.x, y: enemyJiang.y});
            }
        }

        return moves;
    }

    /**
     * 士/仕的走法：在九宫格内，斜走一格
     */
    getShiMoves(board) {
        const moves = [];
        const directions = [
            {dx: -1, dy: -1},  // 左上
            {dx: 1, dy: -1},   // 右上
            {dx: -1, dy: 1},   // 左下
            {dx: 1, dy: 1}     // 右下
        ];

        const minX = 3, maxX = 5;
        const minY = this.color === COLORS.RED ? 7 : 0;
        const maxY = this.color === COLORS.RED ? 9 : 2;

        for (const dir of directions) {
            const newX = this.x + dir.dx;
            const newY = this.y + dir.dy;

            if (this.isValidPosition(newX, newY, minX, maxX, minY, maxY)) {
                const target = board[newY][newX];
                if (!target || target.color !== this.color) {
                    moves.push({x: newX, y: newY});
                }
            }
        }

        return moves;
    }

    /**
     * 象/相的走法：走"田"字，不能过河，不能塞象眼
     */
    getXiangMoves(board) {
        const moves = [];
        const directions = [
            {dx: -2, dy: -2, blockX: -1, blockY: -1},  // 左上
            {dx: 2, dy: -2, blockX: 1, blockY: -1},    // 右上
            {dx: -2, dy: 2, blockX: -1, blockY: 1},    // 左下
            {dx: 2, dy: 2, blockX: 1, blockY: 1}       // 右下
        ];

        // 不能过河
        const minY = this.color === COLORS.RED ? 5 : 0;
        const maxY = this.color === COLORS.RED ? 9 : 4;

        for (const dir of directions) {
            const newX = this.x + dir.dx;
            const newY = this.y + dir.dy;

            // 检查基本位置有效性
            if (!this.isValidPosition(newX, newY, 0, 8, minY, maxY)) {
                continue;
            }

            // 检查象眼是否被堵
            const blockX = this.x + dir.blockX;
            const blockY = this.y + dir.blockY;
            if (board[blockY][blockX]) {
                continue;  // 塞象眼
            }

            const target = board[newY][newX];
            if (!target || target.color !== this.color) {
                moves.push({x: newX, y: newY});
            }
        }

        return moves;
    }

    /**
     * 马的走法：走"日"字，可被蹩马腿
     */
    getMaMoves(board) {
        const moves = [];
        const directions = [
            {dx: -1, dy: -2, blockX: 0, blockY: -1},   // 上左
            {dx: 1, dy: -2, blockX: 0, blockY: -1},    // 上右
            {dx: -2, dy: -1, blockX: -1, blockY: 0},   // 左上
            {dx: -2, dy: 1, blockX: -1, blockY: 0},    // 左下
            {dx: -1, dy: 2, blockX: 0, blockY: 1},     // 下左
            {dx: 1, dy: 2, blockX: 0, blockY: 1},      // 下右
            {dx: 2, dy: -1, blockX: 1, blockY: 0},     // 右上
            {dx: 2, dy: 1, blockX: 1, blockY: 0}       // 右下
        ];

        for (const dir of directions) {
            const newX = this.x + dir.dx;
            const newY = this.y + dir.dy;

            // 检查基本位置有效性
            if (!this.isValidPosition(newX, newY, 0, 8, 0, 9)) {
                continue;
            }

            // 检查马腿是否被堵
            const blockX = this.x + dir.blockX;
            const blockY = this.y + dir.blockY;
            if (board[blockY][blockX]) {
                continue;  // 蹩马腿
            }

            const target = board[newY][newX];
            if (!target || target.color !== this.color) {
                moves.push({x: newX, y: newY});
            }
        }

        return moves;
    }

    /**
     * 车的走法：横竖走，不限格数，不能跳子
     */
    getJuMoves(board) {
        const moves = [];
        const directions = [
            {dx: 0, dy: -1},  // 上
            {dx: 0, dy: 1},   // 下
            {dx: -1, dy: 0},  // 左
            {dx: 1, dy: 0}    // 右
        ];

        for (const dir of directions) {
            let newX = this.x + dir.dx;
            let newY = this.y + dir.dy;

            while (this.isValidPosition(newX, newY, 0, 8, 0, 9)) {
                const target = board[newY][newX];
                if (!target) {
                    moves.push({x: newX, y: newY});
                } else {
                    if (target.color !== this.color) {
                        moves.push({x: newX, y: newY});  // 可以吃子
                    }
                    break;  // 有棋子，停止
                }
                newX += dir.dx;
                newY += dir.dy;
            }
        }

        return moves;
    }

    /**
     * 炮的走法：移动时和车一样，吃子时必须隔一个棋子
     */
    getPaoMoves(board) {
        const moves = [];
        const directions = [
            {dx: 0, dy: -1},  // 上
            {dx: 0, dy: 1},   // 下
            {dx: -1, dy: 0},  // 左
            {dx: 1, dy: 0}    // 右
        ];

        for (const dir of directions) {
            let newX = this.x + dir.dx;
            let newY = this.y + dir.dy;
            let jumped = false;

            while (this.isValidPosition(newX, newY, 0, 8, 0, 9)) {
                const target = board[newY][newX];
                if (!jumped) {
                    if (!target) {
                        moves.push({x: newX, y: newY});
                    } else {
                        jumped = true;  // 遇到炮架
                    }
                } else {
                    if (target) {
                        if (target.color !== this.color) {
                            moves.push({x: newX, y: newY});  // 翻山吃子
                        }
                        break;
                    }
                }
                newX += dir.dx;
                newY += dir.dy;
            }
        }

        return moves;
    }

    /**
     * 兵/卒的走法：过河前只能向前，过河后可以左右
     */
    getBingMoves(board) {
        const moves = [];
        const forward = this.color === COLORS.RED ? -1 : 1;  // 红方向上，黑方向下
        const crossedRiver = this.color === COLORS.RED ? this.y <= 4 : this.y >= 5;

        // 前进一步
        const forwardY = this.y + forward;
        if (this.isValidPosition(this.x, forwardY, 0, 8, 0, 9)) {
            const target = board[forwardY][this.x];
            if (!target || target.color !== this.color) {
                moves.push({x: this.x, y: forwardY});
            }
        }

        // 过河后可以左右移动
        if (crossedRiver) {
            const leftX = this.x - 1;
            const rightX = this.x + 1;

            for (const newX of [leftX, rightX]) {
                if (this.isValidPosition(newX, this.y, 0, 8, 0, 9)) {
                    const target = board[this.y][newX];
                    if (!target || target.color !== this.color) {
                        moves.push({x: newX, y: this.y});
                    }
                }
            }
        }

        return moves;
    }

    /**
     * 检查位置是否有效
     */
    isValidPosition(x, y, minX, maxX, minY, maxY) {
        return x >= minX && x <= maxX && y >= minY && y <= maxY;
    }
}

/**
 * 创建初始棋盘布局
 */
function createInitialBoard() {
    const board = Array(10).fill(null).map(() => Array(9).fill(null));

    // 黑方棋子 (上方)
    board[0][0] = new Piece(PIECE_TYPES.JU, COLORS.BLACK, 0, 0);
    board[0][1] = new Piece(PIECE_TYPES.MA, COLORS.BLACK, 1, 0);
    board[0][2] = new Piece(PIECE_TYPES.XIANG, COLORS.BLACK, 2, 0);
    board[0][3] = new Piece(PIECE_TYPES.SHI, COLORS.BLACK, 3, 0);
    board[0][4] = new Piece(PIECE_TYPES.JIANG, COLORS.BLACK, 4, 0);
    board[0][5] = new Piece(PIECE_TYPES.SHI, COLORS.BLACK, 5, 0);
    board[0][6] = new Piece(PIECE_TYPES.XIANG, COLORS.BLACK, 6, 0);
    board[0][7] = new Piece(PIECE_TYPES.MA, COLORS.BLACK, 7, 0);
    board[0][8] = new Piece(PIECE_TYPES.JU, COLORS.BLACK, 8, 0);
    board[2][1] = new Piece(PIECE_TYPES.PAO, COLORS.BLACK, 1, 2);
    board[2][7] = new Piece(PIECE_TYPES.PAO, COLORS.BLACK, 7, 2);
    board[3][0] = new Piece(PIECE_TYPES.BING, COLORS.BLACK, 0, 3);
    board[3][2] = new Piece(PIECE_TYPES.BING, COLORS.BLACK, 2, 3);
    board[3][4] = new Piece(PIECE_TYPES.BING, COLORS.BLACK, 4, 3);
    board[3][6] = new Piece(PIECE_TYPES.BING, COLORS.BLACK, 6, 3);
    board[3][8] = new Piece(PIECE_TYPES.BING, COLORS.BLACK, 8, 3);

    // 红方棋子 (下方)
    board[9][0] = new Piece(PIECE_TYPES.JU, COLORS.RED, 0, 9);
    board[9][1] = new Piece(PIECE_TYPES.MA, COLORS.RED, 1, 9);
    board[9][2] = new Piece(PIECE_TYPES.XIANG, COLORS.RED, 2, 9);
    board[9][3] = new Piece(PIECE_TYPES.SHI, COLORS.RED, 3, 9);
    board[9][4] = new Piece(PIECE_TYPES.JIANG, COLORS.RED, 4, 9);
    board[9][5] = new Piece(PIECE_TYPES.SHI, COLORS.RED, 5, 9);
    board[9][6] = new Piece(PIECE_TYPES.XIANG, COLORS.RED, 6, 9);
    board[9][7] = new Piece(PIECE_TYPES.MA, COLORS.RED, 7, 9);
    board[9][8] = new Piece(PIECE_TYPES.JU, COLORS.RED, 8, 9);
    board[7][1] = new Piece(PIECE_TYPES.PAO, COLORS.RED, 1, 7);
    board[7][7] = new Piece(PIECE_TYPES.PAO, COLORS.RED, 7, 7);
    board[6][0] = new Piece(PIECE_TYPES.BING, COLORS.RED, 0, 6);
    board[6][2] = new Piece(PIECE_TYPES.BING, COLORS.RED, 2, 6);
    board[6][4] = new Piece(PIECE_TYPES.BING, COLORS.RED, 4, 6);
    board[6][6] = new Piece(PIECE_TYPES.BING, COLORS.RED, 6, 6);
    board[6][8] = new Piece(PIECE_TYPES.BING, COLORS.RED, 8, 6);

    return board;
}

/**
 * 检查是否将军
 * @param {Array} board - 棋盘状态
 * @param {string} targetColor - 被将军的一方颜色
 * @returns {boolean}
 */
function isInCheck(board, targetColor) {
    // 找到目标方的将
    let jiang = null;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (piece && piece.type === PIECE_TYPES.JIANG && piece.color === targetColor) {
                jiang = piece;
                break;
            }
        }
        if (jiang) break;
    }

    if (!jiang) return false;

    // 检查对方所有棋子是否能吃到将
    const enemyColor = targetColor === COLORS.RED ? COLORS.BLACK : COLORS.RED;
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (piece && piece.color === enemyColor) {
                const moves = piece.getValidMoves(board);
                if (moves.some(m => m.x === jiang.x && m.y === jiang.y)) {
                    return true;
                }
            }
        }
    }

    return false;
}

/**
 * 检查是否绝杀（无路可走）
 * @param {Array} board - 棋盘状态
 * @param {string} targetColor - 被将军的一方颜色
 * @returns {boolean}
 */
function isCheckmate(board, targetColor) {
    // 检查该方是否有任何合法移动
    for (let y = 0; y < 10; y++) {
        for (let x = 0; x < 9; x++) {
            const piece = board[y][x];
            if (piece && piece.color === targetColor) {
                const moves = piece.getValidMoves(board);
                for (const move of moves) {
                    // 尝试走这一步
                    const originalTarget = board[move.y][move.x];
                    const originalX = piece.x;
                    const originalY = piece.y;

                    board[move.y][move.x] = piece;
                    board[y][x] = null;
                    piece.x = move.x;
                    piece.y = move.y;

                    // 检查走完后是否还被将军
                    const stillInCheck = isInCheck(board, targetColor);

                    // 恢复
                    board[y][x] = piece;
                    board[move.y][move.x] = originalTarget;
                    piece.x = originalX;
                    piece.y = originalY;

                    if (!stillInCheck) {
                        return false;  // 有合法移动，不是绝杀
                    }
                }
            }
        }
    }

    return true;  // 无合法移动，绝杀
}

/**
 * 深拷贝棋盘
 */
function cloneBoard(board) {
    return board.map(row => row.map(piece => {
        if (piece) {
            return new Piece(piece.type, piece.color, piece.x, piece.y);
        }
        return null;
    }));
}

// 导出
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PIECE_TYPES,
        COLORS,
        PIECE_NAMES,
        Piece,
        createInitialBoard,
        isInCheck,
        isCheckmate,
        cloneBoard
    };
}
