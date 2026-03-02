import React, { useEffect, useRef, useState } from "react";
import htm from "htm";

const html = htm.bind(React.createElement);

const tiles = [
  { id: 0, type: "start", name: "起点", description: "每次经过或停在这里，获得 200。" },
  { id: 1, type: "property", name: "老街", price: 180, rent: 36, color: "#c84c2c" },
  { id: 2, type: "chance", name: "机会", description: "抽一张事件卡。" },
  { id: 3, type: "property", name: "港口", price: 220, rent: 44, color: "#efb649" },
  { id: 4, type: "tax", name: "税务局", amount: 120, description: "缴纳固定税金。" },
  { id: 5, type: "property", name: "商店街", price: 260, rent: 52, color: "#4f7a52" },
  { id: 6, type: "bonus", name: "奖金池", amount: 150, description: "收到一笔奖金。" },
  { id: 7, type: "property", name: "金融区", price: 320, rent: 68, color: "#1d6781" },
  { id: 8, type: "chance", name: "命运", description: "抽一张事件卡。" },
  { id: 9, type: "property", name: "科技园", price: 360, rent: 76, color: "#8c2f17" },
  { id: 10, type: "tax", name: "维修费", amount: 140, description: "资产维护产生费用。" },
  { id: 11, type: "property", name: "天际线", price: 420, rent: 92, color: "#5c3b98" },
];

const ringSlots = [
  { row: 3, col: 3 },
  { row: 3, col: 2 },
  { row: 3, col: 1 },
  { row: 3, col: 0 },
  { row: 2, col: 0 },
  { row: 1, col: 0 },
  { row: 0, col: 0 },
  { row: 0, col: 1 },
  { row: 0, col: 2 },
  { row: 0, col: 3 },
  { row: 1, col: 3 },
  { row: 2, col: 3 },
];

const BOARD_PADDING = 96;
const TILE_SIZE = 250;
const TILE_GAP = 24;

function currency(value) {
  return `¥${value}`;
}

function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function logEntry(message) {
  return {
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}

function prependLog(log, message) {
  return [logEntry(message), ...log].slice(0, 24);
}

function createPlayers() {
  return [
    { id: "player", name: "玩家", role: "player", money: 1500, position: 0, properties: [], bankrupt: false },
    { id: "ai", name: "AI", role: "ai", money: 1500, position: 0, properties: [], bankrupt: false },
  ];
}

function createInitialGame() {
  return {
    players: createPlayers(),
    currentTurn: 0,
    ownership: {},
    log: [logEntry("新游戏开始。")],
    lastDice: null,
    gameOver: false,
    pendingPurchaseTileId: null,
    focusTileId: 0,
    isAnimating: false,
    status: "点击掷骰子开始游戏。",
    lastChanceCard: "尚未触发事件卡。",
  };
}

function getTilePosition(tileId) {
  const slot = ringSlots[tileId];
  return {
    x: BOARD_PADDING + slot.col * (TILE_SIZE + TILE_GAP),
    y: BOARD_PADDING + slot.row * (TILE_SIZE + TILE_GAP),
  };
}

function clonePlayers(players) {
  return players.map((player) => ({ ...player, properties: [...player.properties] }));
}

function withBankruptcyCheck(state) {
  if (state.gameOver) {
    return state;
  }

  const players = clonePlayers(state.players).map((player) => ({
    ...player,
    bankrupt: player.bankrupt || player.money < 0,
  }));
  const bankruptPlayer = players.find((player) => player.bankrupt);

  if (!bankruptPlayer) {
    return { ...state, players };
  }

  const winner = players.find((player) => player.id !== bankruptPlayer.id);
  return {
    ...state,
    players,
    gameOver: true,
    focusTileId: winner.position,
    status: `${bankruptPlayer.name} 破产，${winner.name} 获胜。`,
    log: prependLog(state.log, `${bankruptPlayer.name} 破产，${winner.name} 获胜。`),
  };
}

function Tile({ tile, ownerName, playersHere, isFocused }) {
  const position = getTilePosition(tile.id);
  const classes = ["tile", `type-${tile.type}`];
  if (playersHere.length > 0 || isFocused) {
    classes.push("active");
  }

  let meta = tile.description;
  if (tile.type === "property") {
    meta = `售价 ${currency(tile.price)} / 租金 ${currency(tile.rent)}`;
  } else if (tile.type === "tax" || tile.type === "bonus") {
    meta = `${tile.description} ${currency(tile.amount)}`;
  }

  const style = {
    left: `${position.x}px`,
    top: `${position.y}px`,
  };

  if (tile.color) {
    style.borderColor = `${tile.color}55`;
  }

  return html`
    <article className=${classes.join(" ")} style=${style}>
      <div className="tile-topline">
        <span className="tile-index">${`#${tile.id}`}</span>
        <span className="tile-type">${tile.type.toUpperCase()}</span>
      </div>
      <h3 className="tile-name">${tile.name}</h3>
      <p className="tile-meta">${meta}</p>
      <div className="tile-footer">
        <span className="owner-chip">${ownerName || "未拥有"}</span>
        <div className="tokens">
          ${playersHere.map(
            (player) => html`<span key=${player.id} className=${`token ${player.role}`} title=${player.name}></span>`
          )}
        </div>
      </div>
    </article>
  `;
}

function Board({ game }) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const autoCameraRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(0.82);

  useEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) {
      return undefined;
    }

    const clampCamera = (cameraX, cameraY) => {
      const viewportRect = viewport.getBoundingClientRect();
      const worldSize = world.offsetWidth * zoom;
      const x = Math.min(Math.max(cameraX, 0), Math.max(0, worldSize - viewportRect.width));
      const y = Math.min(Math.max(cameraY, 0), Math.max(0, worldSize - viewportRect.height));
      return { x, y };
    };

    const applyCamera = () => {
      const x = autoCameraRef.current.x + dragOffsetRef.current.x;
      const y = autoCameraRef.current.y + dragOffsetRef.current.y;
      const clamped = clampCamera(x, y);
      world.style.transform = `translate(${-clamped.x}px, ${-clamped.y}px) scale(${zoom})`;
    };

    const updateAutoCamera = (resetDrag = false) => {
      const viewportRect = viewport.getBoundingClientRect();
      const position = getTilePosition(game.focusTileId);
      autoCameraRef.current = {
        x: (position.x + TILE_SIZE / 2) * zoom - viewportRect.width / 2,
        y: (position.y + TILE_SIZE / 2) * zoom - viewportRect.height / 2,
      };
      if (resetDrag) {
        dragOffsetRef.current = { x: 0, y: 0 };
      }
      applyCamera();
    };

    const handlePointerDown = (event) => {
      dragStateRef.current = {
        active: true,
        startX: event.clientX,
        startY: event.clientY,
        baseX: dragOffsetRef.current.x,
        baseY: dragOffsetRef.current.y,
      };
      viewport.setPointerCapture(event.pointerId);
      world.style.transition = "none";
      setIsDragging(true);
    };

    const handlePointerMove = (event) => {
      if (!dragStateRef.current.active) {
        return;
      }
      dragOffsetRef.current = {
        x: dragStateRef.current.baseX - (event.clientX - dragStateRef.current.startX),
        y: dragStateRef.current.baseY - (event.clientY - dragStateRef.current.startY),
      };
      applyCamera();
    };

    const handlePointerUp = (event) => {
      if (!dragStateRef.current.active) {
        return;
      }
      dragStateRef.current.active = false;
      world.style.transition = "";
      setIsDragging(false);
      if (viewport.hasPointerCapture(event.pointerId)) {
        viewport.releasePointerCapture(event.pointerId);
      }
      applyCamera();
    };

    updateAutoCamera(game.isAnimating);
    viewport.addEventListener("pointerdown", handlePointerDown);
    viewport.addEventListener("pointermove", handlePointerMove);
    viewport.addEventListener("pointerup", handlePointerUp);
    viewport.addEventListener("pointercancel", handlePointerUp);
    window.addEventListener("resize", applyCamera);

    return () => {
      viewport.removeEventListener("pointerdown", handlePointerDown);
      viewport.removeEventListener("pointermove", handlePointerMove);
      viewport.removeEventListener("pointerup", handlePointerUp);
      viewport.removeEventListener("pointercancel", handlePointerUp);
      window.removeEventListener("resize", applyCamera);
    };
  }, [game.focusTileId, game.isAnimating, zoom]);

  return html`
    <div className="board-panel">
      <div className="board-header">
        <div>
          <p className="eyebrow">MONOPOLY / WEB EDITION</p>
          <h1>大富翁</h1>
        </div>
        <div className="board-tools">
          <p className="board-copy">镜头会跟随行动棋子，你也可以拖拽棋盘查看完整布局。</p>
          <div className="zoom-controls">
            <button className="zoom-button" onClick=${() => setZoom((value) => Math.max(0.62, Number((value - 0.08).toFixed(2))))}>-</button>
            <span className="zoom-value">${`${Math.round(zoom * 100)}%`}</span>
            <button className="zoom-button" onClick=${() => setZoom((value) => Math.min(1.16, Number((value + 0.08).toFixed(2))))}>+</button>
            <button className="zoom-button reset" onClick=${() => setZoom(0.82)}>重置</button>
          </div>
        </div>
      </div>
      <div ref=${viewportRef} className=${`board-viewport ${isDragging ? "dragging" : ""}`} aria-label="游戏棋盘视口">
        <div className="board-hint">${isDragging ? "拖拽中" : "按住拖动棋盘"}</div>
        <div ref=${worldRef} className="board-world">
          <div className="board-center">
            <span className="center-kicker">CITY CORE</span>
            <strong>MONOPOLY</strong>
            <p>镜头跟随当前行动玩家，棋盘不再被页面尺寸限制。</p>
          </div>
          ${tiles.map((tile) => {
            const ownerId = game.ownership[tile.id];
            const owner = game.players.find((player) => player.id === ownerId);
            const playersHere = game.players.filter((player) => player.position === tile.id && !player.bankrupt);
            return html`
              <${Tile}
                key=${tile.id}
                tile=${tile}
                ownerName=${owner ? `${owner.name}持有` : null}
                playersHere=${playersHere}
                isFocused=${game.focusTileId === tile.id}
              />
            `;
          })}
        </div>
      </div>
    </div>
  `;
}

function Sidebar({ game, onRoll, onBuy, onSkip, onRestart }) {
  const currentPlayer = game.players[game.currentTurn];
  const isHumanTurn = currentPlayer.role === "player" && !game.gameOver && !game.isAnimating;

  return html`
    <aside className="sidebar">
      <div className="mini-stats">
        <div className="stat-card compact">
          <span>目标</span>
          <strong>拖垮对手</strong>
        </div>
        <div className="stat-card compact">
          <span>模式</span>
          <strong>玩家 vs AI</strong>
        </div>
      </div>

      <div className="panel current-turn">
        <div className="panel-title-row">
          <h2>当前回合</h2>
          <span className="turn-badge">${currentPlayer.name}</span>
        </div>
        <p className="status-text">${game.status}</p>
        <div className="dice-box">
          <span>骰子</span>
          <strong>${game.lastDice ?? "-"}</strong>
        </div>
        <div className="actions">
          <button className="primary-button" disabled=${!isHumanTurn || game.pendingPurchaseTileId !== null} onClick=${onRoll}>
            掷骰子
          </button>
          <button className="secondary-button" disabled=${game.pendingPurchaseTileId === null || !isHumanTurn} onClick=${onBuy}>
            购买地产
          </button>
          <button className="ghost-button" disabled=${game.pendingPurchaseTileId === null || !isHumanTurn} onClick=${onSkip}>
            跳过购买
          </button>
          <button className="ghost-button" onClick=${onRestart}>重新开始</button>
        </div>
      </div>

      <div className="panel chance-panel">
        <h2>最近事件</h2>
        <div className="chance-card">
          <span>机会卡</span>
          <strong>${game.lastChanceCard}</strong>
        </div>
      </div>

      <div className="panel players-panel">
        <h2>玩家状态</h2>
        <div className="players">
          ${game.players.map(
            (player, index) => html`
              <article key=${player.id} className=${`player-card ${game.currentTurn === index ? "active-player" : ""}`}>
                <div className="player-header">
                  <span className="player-name">${player.name}</span>
                  <span className=${`player-badge ${player.role}`}>${player.role === "player" ? "人类" : "AI"}</span>
                </div>
                <div className="money-row">
                  <span>现金</span>
                  <strong>${currency(player.money)}</strong>
                </div>
                <div className="player-subline">${`位置：${tiles[player.position].name}`}</div>
                <div className="property-list">${player.properties.length ? player.properties.map((tileId) => tiles[tileId].name).join("、") : "暂无地产"}</div>
              </article>
            `
          )}
        </div>
      </div>

      <div className="panel log-panel">
        <h2>游戏日志</h2>
        <div className="log" aria-live="polite">
          ${game.log.slice(0, 12).map(
            (entry) => html`
              <article key=${entry.id} className="log-entry">
                <time>${entry.time}</time>
                <p>${entry.message}</p>
              </article>
            `
          )}
        </div>
      </div>
    </aside>
  `;
}

function App() {
  const [game, setGame] = useState(createInitialGame);
  const gameRef = useRef(game);
  const timersRef = useRef(new Set());

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    if (game.gameOver || game.isAnimating || game.pendingPurchaseTileId !== null) {
      return undefined;
    }

    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.role !== "ai") {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      runTurn(currentPlayer.id);
    }, 900);

    return () => window.clearTimeout(timerId);
  }, [game.currentTurn, game.gameOver, game.isAnimating, game.pendingPurchaseTileId, game.players]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
      timersRef.current.clear();
    };
  }, []);

  function schedule(callback, delay) {
    const timerId = window.setTimeout(() => {
      timersRef.current.delete(timerId);
      callback();
    }, delay);
    timersRef.current.add(timerId);
  }

  function replaceGame(updater) {
    setGame((prev) => {
      const next = updater(prev);
      gameRef.current = next;
      return next;
    });
  }

  function setStatus(status) {
    replaceGame((prev) => ({ ...prev, status }));
  }

  function buyProperty(playerId, tileId) {
    replaceGame((prev) => {
      const players = clonePlayers(prev.players);
      const player = players.find((item) => item.id === playerId);
      const tile = tiles[tileId];
      player.money -= tile.price;
      player.properties.push(tileId);
      const next = {
        ...prev,
        players,
        ownership: { ...prev.ownership, [tileId]: playerId },
        pendingPurchaseTileId: null,
        log: prependLog(prev.log, `${player.name} 购买了 ${tile.name}，花费 ${currency(tile.price)}。`),
      };
      return withBankruptcyCheck(next);
    });
  }

  function endTurn() {
    replaceGame((prev) => {
      if (prev.gameOver) {
        return prev;
      }
      const currentTurn = (prev.currentTurn + 1) % prev.players.length;
      const currentPlayer = prev.players[currentTurn];
      return {
        ...prev,
        currentTurn,
        pendingPurchaseTileId: null,
        focusTileId: currentPlayer.position,
        status: `轮到 ${currentPlayer.name} 行动。`,
      };
    });
  }

  function endTurnWithDelay() {
    schedule(endTurn, 850);
  }

  async function movePlayer(playerId, steps, collectStartBonus = true) {
    const direction = steps >= 0 ? 1 : -1;
    const totalSteps = Math.abs(steps);

    for (let index = 0; index < totalSteps; index += 1) {
      replaceGame((prev) => {
        const players = clonePlayers(prev.players);
        const player = players.find((item) => item.id === playerId);
        const nextPosition = (player.position + direction + tiles.length) % tiles.length;
        player.position = nextPosition;
        let log = prev.log;

        if (collectStartBonus && direction > 0 && nextPosition === 0) {
          player.money += 200;
          log = prependLog(log, `${player.name} 经过起点，获得 ${currency(200)}。`);
        }

        return {
          ...prev,
          players,
          focusTileId: nextPosition,
          log,
        };
      });
      await wait(360);
    }
  }

  function handleProperty(playerId, tile) {
    const current = gameRef.current;
    const ownerId = current.ownership[tile.id];
    const owner = current.players.find((player) => player.id === ownerId) || null;
    const player = current.players.find((item) => item.id === playerId);

    if (!owner) {
      if (player.role === "player") {
        if (player.money >= tile.price) {
          replaceGame((prev) => ({
            ...prev,
            pendingPurchaseTileId: tile.id,
            status: `${player.name} 到达 ${tile.name}。售价 ${currency(tile.price)}，可以购买。`,
            log: prependLog(prev.log, `${player.name} 来到 ${tile.name}，可选择是否购买。`),
          }));
        } else {
          replaceGame((prev) => ({
            ...prev,
            status: `${player.name} 到达 ${tile.name}，但现金不足，无法购买。`,
            log: prependLog(prev.log, `${player.name} 到达 ${tile.name}，但现金不足。`),
          }));
          endTurnWithDelay();
        }
      } else {
        const shouldBuy = player.money - tile.price >= 250 || player.properties.length < 2;
        if (shouldBuy && player.money >= tile.price) {
          buyProperty(playerId, tile.id);
          setStatus(`AI 买下了 ${tile.name}。`);
        } else {
          replaceGame((prev) => ({
            ...prev,
            status: `AI 放弃购买 ${tile.name}。`,
            log: prependLog(prev.log, `AI 来到 ${tile.name}，选择不购买。`),
          }));
        }
        endTurnWithDelay();
      }
      return;
    }

    if (owner.id === player.id) {
      replaceGame((prev) => ({
        ...prev,
        status: `${player.name} 回到自己的地产 ${tile.name}。`,
        log: prependLog(prev.log, `${player.name} 回到自己的地产 ${tile.name}。`),
      }));
      endTurnWithDelay();
      return;
    }

    replaceGame((prev) => {
      const players = clonePlayers(prev.players);
      const landingPlayer = players.find((item) => item.id === playerId);
      const receivingPlayer = players.find((item) => item.id === owner.id);
      landingPlayer.money -= tile.rent;
      receivingPlayer.money += tile.rent;

      return withBankruptcyCheck({
        ...prev,
        players,
        status: `${landingPlayer.name} 进入 ${receivingPlayer.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`,
        log: prependLog(prev.log, `${landingPlayer.name} 进入 ${receivingPlayer.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`),
      });
    });

    if (!gameRef.current.gameOver) {
      endTurnWithDelay();
    }
  }

  async function drawChanceCard(playerId) {
    const cards = [
      {
        text: "投资成功，获得 180。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            player.money += 180;
            return { ...prev, players };
          });
        },
      },
      {
        text: "交通拥堵，支付 90。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            player.money -= 90;
            return withBankruptcyCheck({ ...prev, players });
          });
        },
      },
      {
        text: "奖励前进两格。",
        chainLanding: true,
        async effect() {
          await movePlayer(playerId, 2, false);
          await resolveLanding(playerId);
        },
      },
      {
        text: "道路施工，后退两格。",
        chainLanding: true,
        async effect() {
          await movePlayer(playerId, -2, false);
          await resolveLanding(playerId);
        },
      },
      {
        text: "回到起点并领取 200。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            player.position = 0;
            player.money += 200;
            return {
              ...prev,
              players,
              focusTileId: 0,
            };
          });
          await wait(360);
        },
      },
      {
        text: "市场回调，支付 140。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            player.money -= 140;
            return withBankruptcyCheck({ ...prev, players });
          });
        },
      },
      {
        text: "品牌授权收入，获得 120。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            player.money += 120;
            return { ...prev, players };
          });
        },
      },
      {
        text: "向前冲刺三格。",
        chainLanding: true,
        async effect() {
          await movePlayer(playerId, 3, true);
          await resolveLanding(playerId);
        },
      },
      {
        text: "收到对手补偿 80。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            const opponent = players.find((item) => item.id !== playerId);
            const payment = Math.min(80, opponent.money);
            opponent.money -= payment;
            player.money += payment;
            return withBankruptcyCheck({ ...prev, players });
          });
        },
      },
      {
        text: "慈善晚宴，支付对手 60。",
        async effect() {
          replaceGame((prev) => {
            const players = clonePlayers(prev.players);
            const player = players.find((item) => item.id === playerId);
            const opponent = players.find((item) => item.id !== playerId);
            player.money -= 60;
            opponent.money += 60;
            return withBankruptcyCheck({ ...prev, players });
          });
        },
      },
    ];

    const card = cards[Math.floor(Math.random() * cards.length)];
    replaceGame((prev) => ({
      ...prev,
      status: `${prev.players.find((item) => item.id === playerId).name} 抽到事件卡：${card.text}`,
      log: prependLog(prev.log, `${prev.players.find((item) => item.id === playerId).name} 抽到事件卡：${card.text}`),
      lastChanceCard: card.text,
    }));

    await wait(280);
    await card.effect();

    if (card.chainLanding) {
      return;
    }

    if (!gameRef.current.gameOver) {
      endTurnWithDelay();
    }
  }

  async function resolveLanding(playerId) {
    const current = gameRef.current;
    const player = current.players.find((item) => item.id === playerId);
    const tile = tiles[player.position];

    replaceGame((prev) => ({
      ...prev,
      focusTileId: tile.id,
    }));

    if (tile.type === "start") {
      replaceGame((prev) => {
        const players = clonePlayers(prev.players);
        const currentPlayer = players.find((item) => item.id === playerId);
        currentPlayer.money += 200;
        return {
          ...prev,
          players,
          status: `${currentPlayer.name} 停在起点，获得 ${currency(200)}。`,
          log: prependLog(prev.log, `${currentPlayer.name} 停在起点，获得 ${currency(200)}。`),
        };
      });
      endTurnWithDelay();
      return;
    }

    if (tile.type === "property") {
      handleProperty(playerId, tile);
      return;
    }

    if (tile.type === "tax") {
      replaceGame((prev) => {
        const players = clonePlayers(prev.players);
        const currentPlayer = players.find((item) => item.id === playerId);
        currentPlayer.money -= tile.amount;
        return withBankruptcyCheck({
          ...prev,
          players,
          status: `${currentPlayer.name} 来到 ${tile.name}，缴纳 ${currency(tile.amount)}。`,
          log: prependLog(prev.log, `${currentPlayer.name} 来到 ${tile.name}，缴纳 ${currency(tile.amount)}。`),
        });
      });
      if (!gameRef.current.gameOver) {
        endTurnWithDelay();
      }
      return;
    }

    if (tile.type === "bonus") {
      replaceGame((prev) => {
        const players = clonePlayers(prev.players);
        const currentPlayer = players.find((item) => item.id === playerId);
        currentPlayer.money += tile.amount;
        return {
          ...prev,
          players,
          status: `${currentPlayer.name} 来到 ${tile.name}，获得 ${currency(tile.amount)}。`,
          log: prependLog(prev.log, `${currentPlayer.name} 来到 ${tile.name}，获得 ${currency(tile.amount)}。`),
        };
      });
      endTurnWithDelay();
      return;
    }

    if (tile.type === "chance") {
      await drawChanceCard(playerId);
    }
  }

  async function runTurn(playerId) {
    const current = gameRef.current;
    if (current.gameOver || current.isAnimating) {
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    replaceGame((prev) => ({
      ...prev,
      isAnimating: true,
      lastDice: dice,
      status: `${prev.players.find((item) => item.id === playerId).name} 掷出 ${dice} 点，开始移动。`,
      log: prependLog(prev.log, `${prev.players.find((item) => item.id === playerId).name} 掷出了 ${dice} 点。`),
    }));

    await movePlayer(playerId, dice);

    replaceGame((prev) => ({
      ...prev,
      isAnimating: false,
      status: `${prev.players.find((item) => item.id === playerId).name} 掷出 ${dice} 点，移动到 ${
        tiles[prev.players.find((item) => item.id === playerId).position].name
      }。`,
    }));

    await wait(220);
    await resolveLanding(playerId);
  }

  function handleRoll() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    if (currentPlayer.role !== "player" || gameRef.current.pendingPurchaseTileId !== null) {
      return;
    }
    runTurn(currentPlayer.id);
  }

  function handleBuy() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    const tileId = gameRef.current.pendingPurchaseTileId;
    if (tileId === null || currentPlayer.role !== "player" || gameRef.current.gameOver) {
      return;
    }
    buyProperty(currentPlayer.id, tileId);
    setStatus(`${currentPlayer.name} 买下了 ${tiles[tileId].name}。`);
    endTurnWithDelay();
  }

  function handleSkip() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    const tileId = gameRef.current.pendingPurchaseTileId;
    if (tileId === null || currentPlayer.role !== "player" || gameRef.current.gameOver) {
      return;
    }
    replaceGame((prev) => ({
      ...prev,
      pendingPurchaseTileId: null,
      status: `${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`,
      log: prependLog(prev.log, `${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`),
    }));
    endTurnWithDelay();
  }

  function handleRestart() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
    const next = createInitialGame();
    gameRef.current = next;
    setGame(next);
  }

  return html`
    <main className="app-shell">
      <section className="game-layout">
        <${Board} game=${game} />
        <${Sidebar}
          game=${game}
          onRoll=${handleRoll}
          onBuy=${handleBuy}
          onSkip=${handleSkip}
          onRestart=${handleRestart}
        />
      </section>
    </main>
  `;
}

export default App;
