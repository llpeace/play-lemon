# 中国象棋在线对战

一个支持在线双人对战的中国象棋游戏，使用 P2P 技术实现实时对战。

## 🎮 在线游戏地址

### 方式 1: jsDelivr CDN（国内可访问）
```
https://cdn.jsdelivr.net/gh/llpeace/play-lemon@main/cdn.html
```

### 方式 2: GitHub Pages（国外访问更快）
```
https://llpeace.github.io/play-lemon
```

## ✨ 功能特性

- 🎯 **经典中国象棋规则**
- 👥 **在线双人对战**（P2P 点对点连接）
- 💬 **实时聊天**（文字 + 表情）
- 🎨 **精美界面**
- 📱 **移动端适配**
- ⚡ **无需注册登录**

## 🚀 如何开始在线对战

### 玩家 A（房主）
1. 打开游戏链接
2. 点击"在线对战"按钮
3. 选择"创建房间"
4. 复制生成的房间号发给朋友
5. 等待对手加入
6. 游戏开始（你是红方）

### 玩家 B（加入者）
1. 打开游戏链接
2. 点击"在线对战"按钮
3. 选择"加入房间"
4. 输入朋友给的房间号
5. 点击"加入房间"
6. 游戏开始（你是黑方）

## 🛠️ 技术栈

- **前端**: 原生 JavaScript + Canvas
- **在线对战**: PeerJS (WebRTC P2P)
- **部署**: GitHub Pages + jsDelivr CDN

## 📝 本地开发

```bash
# 克隆仓库
git clone https://github.com/llpeace/play-lemon.git

# 进入目录
cd play-lemon

# 直接打开 index.html 即可
# 或使用本地服务器
python -m http.server 8000
# 然后访问 http://localhost:8000
```

## 📄 License

MIT

## 👨‍💻 作者

Created with ❤️ by Claude Code
