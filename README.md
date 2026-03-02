# 大富翁

一个基于 React + Vite 的前端大富翁小游戏。

## 玩法

- 你和 AI 各自从 `¥1500` 开始。
- 每回合掷一个六面骰子。
- 经过或停在起点会获得 `¥200`。
- 停在未拥有地产时可以购买；AI 会根据现金情况自动决策。
- 停在对方地产上需要支付租金。
- 机会格会随机触发奖励、罚款、移动等事件。
- 任意一方现金低于 `0` 即破产，另一方获胜。

## 运行

先安装依赖，再启动开发服务器。

项目结构：

- `index.html`: 页面入口
- `src/App.js`: React 游戏逻辑与组件
- `src/main.jsx`: React 挂载入口
- `src/styles.css`: 样式

## 开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
```

如果你在这台机器上没有全局 Node，也可以直接用仓库里的本地 Node：

```bash
PATH="$(pwd)/.local/node/bin:$PATH" npm install
PATH="$(pwd)/.local/node/bin:$PATH" npm run dev
```
