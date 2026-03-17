/**
 * 在线对战功能 - 使用 PeerJS 实现 P2P 连接
 */

class OnlineGame {
    constructor(game) {
        this.game = game;
        this.peer = null;
        this.conn = null;
        this.isHost = false; // 是否是房主
        this.myColor = null; // 我的颜色 red/black
        this.roomId = null;
        this.connected = false;
        this.opponentOnline = false;
    }

    /**
     * 初始化 PeerJS
     */
    init() {
        // 使用公共 PeerJS 服务器
        this.peer = new Peer({
            config: {
                'iceServers': [
                    { urls: 'stun:stun.l.google.com:19302' },
                    { urls: 'stun:global.stun.twilio.com:3478' }
                ]
            }
        });

        this.peer.on('open', (id) => {
            console.log('我的 Peer ID:', id);
            this.roomId = id;
        });

        this.peer.on('connection', (conn) => {
            console.log('收到连接请求');
            this.handleConnection(conn);
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS 错误:', err);
            this.showError('连接错误: ' + err.type);
        });
    }

    /**
     * 创建房间（作为房主）
     */
    createRoom() {
        if (!this.peer) {
            this.init();
        }

        // 等待 peer 准备好
        const checkReady = () => {
            if (this.roomId) {
                this.isHost = true;
                this.myColor = 'red'; // 房主默认是红方
                this.showRoomId(this.roomId);
                this.updateOnlineStatus('等待对手加入...');
            } else {
                setTimeout(checkReady, 100);
            }
        };
        checkReady();
    }

    /**
     * 加入房间
     */
    joinRoom(roomId) {
        if (!roomId || roomId.trim() === '') {
            this.showError('请输入房间号');
            return;
        }

        if (!this.peer) {
            this.init();
        }

        roomId = roomId.trim();
        this.isHost = false;
        this.myColor = 'black'; // 加入者是黑方
        this.updateOnlineStatus('正在连接...');

        // 等待 peer 准备好后连接
        const attemptConnect = () => {
            if (this.peer && this.peer.id) {
                this.conn = this.peer.connect(roomId);
                this.handleConnection(this.conn);
            } else {
                setTimeout(attemptConnect, 100);
            }
        };
        attemptConnect();
    }

    /**
     * 处理连接
     */
    handleConnection(conn) {
        this.conn = conn;

        conn.on('open', () => {
            console.log('连接已建立');
            this.connected = true;
            this.opponentOnline = true;
            this.updateOnlineStatus('已连接，游戏开始！');

            // 发送初始同步
            this.sendGameState();

            // 隐藏房间界面，显示游戏
            this.hideRoomUI();

            // 如果是加入者，请求当前游戏状态
            if (!this.isHost) {
                this.send({ type: 'request_state' });
            }
        });

        conn.on('data', (data) => {
            this.handleMessage(data);
        });

        conn.on('close', () => {
            console.log('连接已断开');
            this.connected = false;
            this.opponentOnline = false;
            this.updateOnlineStatus('对手已断开连接');
            this.showError('对手已断开连接');
        });

        conn.on('error', (err) => {
            console.error('连接错误:', err);
            this.showError('连接失败，请检查房间号是否正确');
        });
    }

    /**
     * 发送消息
     */
    send(data) {
        if (this.conn && this.connected) {
            try {
                this.conn.send(data);
            } catch (e) {
                console.error('发送消息失败:', e);
            }
        }
    }

    /**
     * 处理收到的消息
     */
    handleMessage(data) {
        console.log('收到消息:', data);

        switch (data.type) {
            case 'move':
                this.receiveMove(data.move);
                break;
            case 'chat':
                this.receiveChat(data.message);
                break;
            case 'game_state':
                this.receiveGameState(data.state);
                break;
            case 'request_state':
                this.sendGameState();
                break;
            case 'restart':
                this.receiveRestart();
                break;
            case 'undo_request':
                this.receiveUndoRequest();
                break;
        }
    }

    /**
     * 发送移动
     */
    sendMove(fromX, fromY, toX, toY) {
        this.send({
            type: 'move',
            move: { fromX, fromY, toX, toY }
        });
    }

    /**
     * 接收移动
     */
    receiveMove(move) {
        const { fromX, fromY, toX, toY } = move;
        const piece = this.game.board[fromY][fromX];

        if (piece) {
            // 执行移动（不切换玩家，因为是对方的操作）
            this.game.board[fromY][fromX] = null;
            this.game.board[toY][toX] = piece;
            piece.x = toX;
            piece.y = toY;

            // 切换当前玩家
            this.game.currentPlayer = this.game.currentPlayer === 'red' ? 'black' : 'red';

            // 更新显示
            this.game.render();
            this.game.updateStatus();
            this.game.checkGameOver();
        }
    }

    /**
     * 发送聊天消息
     */
    sendChat(message) {
        this.send({
            type: 'chat',
            message: message
        });
    }

    /**
     * 接收聊天消息
     */
    receiveChat(message) {
        if (window.chat) {
            window.chat.addMessage(message);
        }
    }

    /**
     * 发送游戏状态
     */
    sendGameState() {
        const state = {
            board: this.game.board.map(row => row.map(piece => {
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
            currentPlayer: this.game.currentPlayer,
            gameOver: this.game.gameOver,
            winner: this.game.winner
        };

        this.send({
            type: 'game_state',
            state: state
        });
    }

    /**
     * 接收游戏状态（用于同步）
     */
    receiveGameState(state) {
        // 恢复棋盘
        this.game.board = state.board.map(row => row.map(pieceData => {
            if (pieceData) {
                return new Piece(pieceData.type, pieceData.color, pieceData.x, pieceData.y);
            }
            return null;
        }));

        this.game.currentPlayer = state.currentPlayer;
        this.game.gameOver = state.gameOver || false;
        this.game.winner = state.winner || null;

        this.game.render();
        this.game.updateStatus();
    }

    /**
     * 发送重新开始请求
     */
    sendRestart() {
        this.send({ type: 'restart' });
    }

    /**
     * 接收重新开始
     */
    receiveRestart() {
        this.game.restart();
    }

    /**
     * 检查是否轮到我
     */
    isMyTurn() {
        return this.game.currentPlayer === this.myColor;
    }

    /**
     * 检查是否是我的棋子
     */
    isMyPiece(piece) {
        return piece && piece.color === this.myColor;
    }

    /**
     * 显示房间号
     */
    showRoomId(roomId) {
        const modal = document.getElementById('onlineModal');
        const content = modal.querySelector('.modal-body');
        content.innerHTML = `
            <h3>房间已创建</h3>
            <p>请将房间号发给你的朋友：</p>
            <div class="room-id-display">
                <input type="text" value="${roomId}" readonly id="roomIdText">
                <button onclick="window.onlineGame.copyRoomId()" class="btn btn-primary btn-small">复制</button>
            </div>
            <p class="room-status" id="roomStatus">等待对手加入...</p>
            <button onclick="window.onlineGame.cancelRoom()" class="btn btn-secondary">取消</button>
        `;
        modal.classList.add('active');
    }

    /**
     * 复制房间号
     */
    copyRoomId() {
        const input = document.getElementById('roomIdText');
        input.select();
        document.execCommand('copy');
        alert('房间号已复制到剪贴板！');
    }

    /**
     * 取消房间
     */
    cancelRoom() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.hideRoomUI();
        window.location.reload();
    }

    /**
     * 隐藏房间界面
     */
    hideRoomUI() {
        const modal = document.getElementById('onlineModal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    /**
     * 更新在线状态
     */
    updateOnlineStatus(status) {
        const statusEl = document.getElementById('roomStatus');
        if (statusEl) {
            statusEl.textContent = status;
        }

        // 更新游戏内状态显示
        const onlineStatusEl = document.getElementById('onlineStatus');
        if (onlineStatusEl) {
            onlineStatusEl.textContent = status;
        }
    }

    /**
     * 显示错误
     */
    showError(message) {
        alert(message);
    }

    /**
     * 断开连接
     */
    disconnect() {
        if (this.conn) {
            this.conn.close();
        }
        if (this.peer) {
            this.peer.destroy();
        }
        this.connected = false;
        this.opponentOnline = false;
    }
}

// 全局变量
let onlineGame = null;

/**
 * 显示在线模式选择
 */
function showOnlineModal() {
    const modal = document.getElementById('onlineModal');
    const content = modal.querySelector('.modal-body');

    content.innerHTML = `
        <h3>在线对战</h3>
        <div class="online-options">
            <button onclick="createOnlineRoom()" class="btn btn-primary">创建房间</button>
            <div class="divider">或</div>
            <input type="text" id="joinRoomInput" placeholder="输入房间号" maxlength="50">
            <button onclick="joinOnlineRoom()" class="btn btn-primary">加入房间</button>
        </div>
        <button onclick="closeOnlineModal()" class="btn btn-secondary">取消</button>
    `;

    modal.classList.add('active');
}

/**
 * 关闭在线模式弹窗
 */
function closeOnlineModal() {
    const modal = document.getElementById('onlineModal');
    modal.classList.remove('active');
}

/**
 * 创建在线房间
 */
function createOnlineRoom() {
    if (!onlineGame) {
        onlineGame = new OnlineGame(game);
        window.onlineGame = onlineGame;
    }
    onlineGame.createRoom();
}

/**
 * 加入在线房间
 */
function joinOnlineRoom() {
    const roomId = document.getElementById('joinRoomInput').value;
    if (!onlineGame) {
        onlineGame = new OnlineGame(game);
        window.onlineGame = onlineGame;
    }
    onlineGame.joinRoom(roomId);
}
