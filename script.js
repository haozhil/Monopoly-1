const tiles = [
  {
    id: 0,
    type: "start",
    name: "起点",
    description: "每次经过或停在这里，获得 200。",
  },
  {
    id: 1,
    type: "property",
    name: "老街",
    price: 180,
    rent: 36,
    color: "#c84c2c",
  },
  {
    id: 2,
    type: "chance",
    name: "机会",
    description: "抽一张事件卡。",
  },
  {
    id: 3,
    type: "property",
    name: "港口",
    price: 220,
    rent: 44,
    color: "#efb649",
  },
  {
    id: 4,
    type: "tax",
    name: "税务局",
    amount: 120,
    description: "缴纳固定税金。",
  },
  {
    id: 5,
    type: "property",
    name: "商店街",
    price: 260,
    rent: 52,
    color: "#4f7a52",
  },
  {
    id: 6,
    type: "bonus",
    name: "奖金池",
    amount: 150,
    description: "收到一笔奖金。",
  },
  {
    id: 7,
    type: "property",
    name: "金融区",
    price: 320,
    rent: 68,
    color: "#1d6781",
  },
  {
    id: 8,
    type: "chance",
    name: "命运",
    description: "抽一张事件卡。",
  },
  {
    id: 9,
    type: "property",
    name: "科技园",
    price: 360,
    rent: 76,
    color: "#8c2f17",
  },
  {
    id: 10,
    type: "tax",
    name: "维修费",
    amount: 140,
    description: "资产维护产生费用。",
  },
  {
    id: 11,
    type: "property",
    name: "天际线",
    price: 420,
    rent: 92,
    color: "#5c3b98",
  },
];

const chanceCards = [
  {
    text: "投资成功，获得 180。",
    effect(player) {
      player.money += 180;
    },
  },
  {
    text: "交通拥堵，支付 90。",
    effect(player) {
      player.money -= 90;
    },
  },
  {
    text: "奖励前进两格。",
    chainLanding: true,
    effect(player) {
      movePlayer(player, 2, false);
      resolveLanding(player);
    },
  },
  {
    text: "回到起点并领取 200。",
    effect(player) {
      player.position = 0;
      player.money += 200;
    },
  },
  {
    text: "市场回调，支付 140。",
    effect(player) {
      player.money -= 140;
    },
  },
  {
    text: "品牌授权收入，获得 120。",
    effect(player) {
      player.money += 120;
    },
  },
];

const initialPlayers = () => [
  {
    id: "player",
    name: "玩家",
    role: "player",
    money: 1500,
    position: 0,
    properties: [],
    bankrupt: false,
  },
  {
    id: "ai",
    name: "AI",
    role: "ai",
    money: 1500,
    position: 0,
    properties: [],
    bankrupt: false,
  },
];

const state = {
  players: initialPlayers(),
  currentTurn: 0,
  ownership: {},
  log: [],
  lastDice: null,
  gameOver: false,
  pendingPurchaseTileId: null,
};

const boardElement = document.getElementById("board");
const playersElement = document.getElementById("players");
const logElement = document.getElementById("log");
const statusTextElement = document.getElementById("statusText");
const diceValueElement = document.getElementById("diceValue");
const turnBadgeElement = document.getElementById("turnBadge");
const rollButton = document.getElementById("rollButton");
const buyButton = document.getElementById("buyButton");
const skipButton = document.getElementById("skipButton");
const restartButton = document.getElementById("restartButton");
const tileTemplate = document.getElementById("tileTemplate");

function currency(value) {
  return `¥${value}`;
}

function addLog(message) {
  state.log.unshift({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    message,
    time: new Date().toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  });
}

function getCurrentPlayer() {
  return state.players[state.currentTurn];
}

function getOpponent(player) {
  return state.players.find((item) => item.id !== player.id);
}

function getTileOwner(tileId) {
  const ownerId = state.ownership[tileId];
  return state.players.find((player) => player.id === ownerId) || null;
}

function rollDice() {
  return Math.floor(Math.random() * 6) + 1;
}

function updateButtons() {
  const currentPlayer = getCurrentPlayer();
  const isHumanTurn = currentPlayer.role === "player" && !state.gameOver;
  rollButton.disabled = !isHumanTurn || state.pendingPurchaseTileId !== null;
  buyButton.disabled = state.pendingPurchaseTileId === null || !isHumanTurn;
  skipButton.disabled = state.pendingPurchaseTileId === null || !isHumanTurn;
}

function renderBoard() {
  boardElement.innerHTML = "";

  tiles.forEach((tile) => {
    const fragment = tileTemplate.content.cloneNode(true);
    const tileElement = fragment.querySelector(".tile");
    const tileIndex = fragment.querySelector(".tile-index");
    const tileType = fragment.querySelector(".tile-type");
    const tileName = fragment.querySelector(".tile-name");
    const tileMeta = fragment.querySelector(".tile-meta");
    const ownerChip = fragment.querySelector(".owner-chip");
    const tokens = fragment.querySelector(".tokens");
    const owner = getTileOwner(tile.id);
    const playersHere = state.players.filter((player) => player.position === tile.id && !player.bankrupt);

    tileElement.classList.add(`type-${tile.type}`);
    if (playersHere.length > 0) {
      tileElement.classList.add("active");
    }
    if (tile.color) {
      tileElement.style.borderColor = `${tile.color}55`;
    }

    tileIndex.textContent = `#${tile.id}`;
    tileType.textContent = tile.type.toUpperCase();
    tileName.textContent = tile.name;

    if (tile.type === "property") {
      tileMeta.textContent = `售价 ${currency(tile.price)} / 租金 ${currency(tile.rent)}`;
    } else if (tile.type === "tax" || tile.type === "bonus") {
      tileMeta.textContent = `${tile.description} ${currency(tile.amount)}`;
    } else {
      tileMeta.textContent = tile.description;
    }

    ownerChip.textContent = owner ? `${owner.name}持有` : "未拥有";

    playersHere.forEach((player) => {
      const token = document.createElement("span");
      token.className = `token ${player.role}`;
      token.title = player.name;
      tokens.appendChild(token);
    });

    boardElement.appendChild(fragment);
  });
}

function renderPlayers() {
  playersElement.innerHTML = "";

  state.players.forEach((player, index) => {
    const ownerNames = player.properties.map((tileId) => tiles[tileId].name).join("、");
    const card = document.createElement("article");
    card.className = `player-card ${state.currentTurn === index ? "active-player" : ""}`;

    card.innerHTML = `
      <div class="player-header">
        <span class="player-name">${player.name}</span>
        <span class="player-badge ${player.role}">${player.role === "player" ? "人类" : "AI"}</span>
      </div>
      <div class="money-row">
        <span>现金</span>
        <strong>${currency(player.money)}</strong>
      </div>
      <div class="player-subline">位置：${tiles[player.position].name}</div>
      <div class="property-list">${ownerNames || "暂无地产"}</div>
    `;

    playersElement.appendChild(card);
  });
}

function renderLog() {
  logElement.innerHTML = "";

  state.log.slice(0, 12).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "log-entry";
    item.innerHTML = `<time>${entry.time}</time><p>${entry.message}</p>`;
    logElement.appendChild(item);
  });
}

function setStatus(message) {
  statusTextElement.textContent = message;
}

function renderTopBar() {
  const currentPlayer = getCurrentPlayer();
  turnBadgeElement.textContent = currentPlayer.name;
  diceValueElement.textContent = state.lastDice ?? "-";
}

function render() {
  renderTopBar();
  renderBoard();
  renderPlayers();
  renderLog();
  updateButtons();
}

function movePlayer(player, steps, collectStartBonus = true) {
  const previousPosition = player.position;
  const nextPosition = (player.position + steps) % tiles.length;
  const passedStart = previousPosition + steps >= tiles.length;

  player.position = nextPosition;

  if (collectStartBonus && passedStart) {
    player.money += 200;
    addLog(`${player.name} 经过起点，获得 ${currency(200)}。`);
  }
}

function payAmount(player, amount, reason) {
  player.money -= amount;
  addLog(`${player.name}${reason}，支付 ${currency(amount)}。`);
}

function receiveAmount(player, amount, reason) {
  player.money += amount;
  addLog(`${player.name}${reason}，获得 ${currency(amount)}。`);
}

function handleProperty(player, tile) {
  const owner = getTileOwner(tile.id);

  if (!owner) {
    if (player.role === "player") {
      if (player.money >= tile.price) {
        state.pendingPurchaseTileId = tile.id;
        setStatus(`${player.name} 到达 ${tile.name}。售价 ${currency(tile.price)}，可以购买。`);
        addLog(`${player.name} 来到 ${tile.name}，可选择是否购买。`);
      } else {
        setStatus(`${player.name} 到达 ${tile.name}，但现金不足，无法购买。`);
        addLog(`${player.name} 到达 ${tile.name}，但现金不足。`);
        endTurnWithDelay();
      }
    } else {
      const shouldBuy = player.money - tile.price >= 250 || player.properties.length < 2;
      if (shouldBuy && player.money >= tile.price) {
        buyProperty(player, tile.id);
        setStatus(`AI 买下了 ${tile.name}。`);
      } else {
        setStatus(`AI 放弃购买 ${tile.name}。`);
        addLog(`AI 来到 ${tile.name}，选择不购买。`);
      }
      endTurnWithDelay();
    }
    return;
  }

  if (owner.id === player.id) {
    setStatus(`${player.name} 回到自己的地产 ${tile.name}。`);
    addLog(`${player.name} 回到自己的地产 ${tile.name}。`);
    endTurnWithDelay();
    return;
  }

  player.money -= tile.rent;
  owner.money += tile.rent;
  setStatus(`${player.name} 进入 ${owner.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`);
  addLog(`${player.name} 进入 ${owner.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`);
  checkBankruptcy();
  if (!state.gameOver) {
    endTurnWithDelay();
  }
}

function drawChanceCard(player) {
  const card = chanceCards[Math.floor(Math.random() * chanceCards.length)];
  addLog(`${player.name} 抽到事件卡：${card.text}`);
  setStatus(`${player.name} 抽到事件卡：${card.text}`);
  card.effect(player);
  if (card.chainLanding) {
    return;
  }
  checkBankruptcy();
  if (!state.gameOver) {
    endTurnWithDelay();
  }
}

function resolveLanding(player) {
  const tile = tiles[player.position];

  if (tile.type === "start") {
    receiveAmount(player, 200, "停在起点");
    endTurnWithDelay();
    return;
  }

  if (tile.type === "property") {
    handleProperty(player, tile);
    return;
  }

  if (tile.type === "tax") {
    payAmount(player, tile.amount, `来到 ${tile.name}`);
    checkBankruptcy();
    if (!state.gameOver) {
      setStatus(`${player.name} 来到 ${tile.name}，缴纳 ${currency(tile.amount)}。`);
      endTurnWithDelay();
    }
    return;
  }

  if (tile.type === "bonus") {
    receiveAmount(player, tile.amount, `来到 ${tile.name}`);
    setStatus(`${player.name} 来到 ${tile.name}，获得 ${currency(tile.amount)}。`);
    endTurnWithDelay();
    return;
  }

  if (tile.type === "chance") {
    drawChanceCard(player);
  }
}

function buyProperty(player, tileId) {
  const tile = tiles[tileId];
  player.money -= tile.price;
  player.properties.push(tileId);
  state.ownership[tileId] = player.id;
  state.pendingPurchaseTileId = null;
  addLog(`${player.name} 购买了 ${tile.name}，花费 ${currency(tile.price)}。`);
  checkBankruptcy();
}

function endTurn() {
  if (state.gameOver) {
    updateButtons();
    return;
  }
  state.pendingPurchaseTileId = null;
  state.currentTurn = (state.currentTurn + 1) % state.players.length;
  const currentPlayer = getCurrentPlayer();
  setStatus(`轮到 ${currentPlayer.name} 行动。`);
  render();

  if (currentPlayer.role === "ai") {
    window.setTimeout(runAiTurn, 900);
  }
}

function endTurnWithDelay() {
  render();
  window.setTimeout(endTurn, 850);
}

function checkBankruptcy() {
  state.players.forEach((player) => {
    if (player.money < 0 && !player.bankrupt) {
      player.bankrupt = true;
    }
  });

  const bankruptPlayer = state.players.find((player) => player.bankrupt);
  if (!bankruptPlayer) {
    return;
  }

  state.gameOver = true;
  const winner = getOpponent(bankruptPlayer);
  setStatus(`${bankruptPlayer.name} 破产，${winner.name} 获胜。`);
  addLog(`${bankruptPlayer.name} 破产，${winner.name} 获胜。`);
  rollButton.disabled = true;
  buyButton.disabled = true;
  skipButton.disabled = true;
  render();
}

function runTurn(player) {
  if (state.gameOver) {
    return;
  }
  const dice = rollDice();
  state.lastDice = dice;
  addLog(`${player.name} 掷出了 ${dice} 点。`);
  movePlayer(player, dice);
  setStatus(`${player.name} 掷出 ${dice} 点，移动到 ${tiles[player.position].name}。`);
  render();
  window.setTimeout(() => resolveLanding(player), 600);
}

function runAiTurn() {
  const currentPlayer = getCurrentPlayer();
  if (currentPlayer.role !== "ai" || state.gameOver) {
    return;
  }
  runTurn(currentPlayer);
}

function resetGame() {
  state.players = initialPlayers();
  state.currentTurn = 0;
  state.ownership = {};
  state.log = [];
  state.lastDice = null;
  state.gameOver = false;
  state.pendingPurchaseTileId = null;
  setStatus("点击掷骰子开始游戏。");
  addLog("新游戏开始。");
  render();
}

rollButton.addEventListener("click", () => {
  const currentPlayer = getCurrentPlayer();
  if (currentPlayer.role !== "player" || state.pendingPurchaseTileId !== null || state.gameOver) {
    return;
  }
  runTurn(currentPlayer);
});

buyButton.addEventListener("click", () => {
  const currentPlayer = getCurrentPlayer();
  const tileId = state.pendingPurchaseTileId;
  if (tileId === null || currentPlayer.role !== "player" || state.gameOver) {
    return;
  }
  buyProperty(currentPlayer, tileId);
  setStatus(`${currentPlayer.name} 买下了 ${tiles[tileId].name}。`);
  render();
  endTurnWithDelay();
});

skipButton.addEventListener("click", () => {
  const currentPlayer = getCurrentPlayer();
  const tileId = state.pendingPurchaseTileId;
  if (tileId === null || currentPlayer.role !== "player" || state.gameOver) {
    return;
  }
  addLog(`${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`);
  setStatus(`${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`);
  state.pendingPurchaseTileId = null;
  render();
  endTurnWithDelay();
});

restartButton.addEventListener("click", resetGame);

resetGame();
