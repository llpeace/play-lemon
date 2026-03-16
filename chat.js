/**
 * 中国象棋聊天功能
 */

class ChessChat {
    constructor() {
        this.messages = [];
        this.maxMessages = 50;
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadMessages();
    }

    /**
     * 绑定事件
     */
    bindEvents() {
        // 切换聊天区域
        const chatToggle = document.getElementById('chatToggle');
        const chatContent = document.getElementById('chatContent');

        chatToggle.addEventListener('click', () => {
            chatContent.classList.toggle('collapsed');
            const icon = chatToggle.querySelector('.chat-toggle-icon');
            icon.textContent = chatContent.classList.contains('collapsed') ? '▶' : '▼';
        });

        // 发送消息
        const sendBtn = document.getElementById('sendBtn');
        const chatInput = document.getElementById('chatInput');

        sendBtn.addEventListener('click', () => {
            this.sendMessage(chatInput.value);
            chatInput.value = '';
        });

        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendMessage(chatInput.value);
                chatInput.value = '';
            }
        });

        // 表情按钮
        const emojiBtns = document.querySelectorAll('.emoji-btn');
        emojiBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const emoji = btn.dataset.emoji;
                this.sendEmoji(emoji);
            });
        });
    }

    /**
     * 发送文字消息
     */
    sendMessage(text) {
        if (!text || text.trim() === '') return;

        const currentPlayer = window.game ? window.game.currentPlayer : 'red';
        const message = {
            type: 'text',
            sender: currentPlayer,
            content: text.trim(),
            timestamp: Date.now()
        };

        this.addMessage(message);
    }

    /**
     * 发送表情
     */
    sendEmoji(emoji) {
        const currentPlayer = window.game ? window.game.currentPlayer : 'red';
        const message = {
            type: 'emoji',
            sender: currentPlayer,
            content: emoji,
            timestamp: Date.now()
        };

        this.addMessage(message);
    }

    /**
     * 添加消息
     */
    addMessage(message) {
        this.messages.push(message);

        // 限制消息数量
        if (this.messages.length > this.maxMessages) {
            this.messages.shift();
        }

        this.renderMessages();
        this.saveMessages();
    }

    /**
     * 渲染消息列表
     */
    renderMessages() {
        const container = document.getElementById('chatMessages');
        if (!container) return;

        container.innerHTML = this.messages.map(msg => {
            const senderName = msg.sender === 'red' ? '红方' : '黑方';
            const time = this.formatTime(msg.timestamp);

            if (msg.type === 'emoji') {
                return `
                    <div class="chat-message ${msg.sender}">
                        <span class="sender">${senderName}:</span>
                        <span class="emoji">${msg.content}</span>
                    </div>
                `;
            } else {
                return `
                    <div class="chat-message ${msg.sender}">
                        <span class="sender">${senderName}:</span>
                        <span class="text">${this.escapeHtml(msg.content)}</span>
                    </div>
                `;
            }
        }).join('');

        // 滚动到底部
        container.scrollTop = container.scrollHeight;
    }

    /**
     * 格式化时间
     */
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    /**
     * HTML转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 保存消息到localStorage
     */
    saveMessages() {
        try {
            localStorage.setItem('chessChatMessages', JSON.stringify(this.messages));
        } catch (e) {
            console.error('保存聊天记录失败:', e);
        }
    }

    /**
     * 从localStorage加载消息
     */
    loadMessages() {
        try {
            const saved = localStorage.getItem('chessChatMessages');
            if (saved) {
                this.messages = JSON.parse(saved);
                this.renderMessages();
            }
        } catch (e) {
            console.error('加载聊天记录失败:', e);
        }
    }

    /**
     * 清除所有消息
     */
    clearMessages() {
        this.messages = [];
        this.renderMessages();
        localStorage.removeItem('chessChatMessages');
    }
}

// 初始化聊天
let chat;
document.addEventListener('DOMContentLoaded', () => {
    chat = new ChessChat();
    window.chat = chat;
});
