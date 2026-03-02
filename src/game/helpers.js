import { avatarPresets, BOARD_PADDING, TILE_GAP, TILE_SIZE, tiles } from "./constants.js";

export function currency(value) {
  return `¥${value}`;
}

export function wait(ms) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export function logEntry(message) {
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

export function prependLog(log, message) {
  return [logEntry(message), ...log].slice(0, 24);
}

export function getTilePosition(tileId) {
  const slot = tiles[tileId];
  return {
    x: BOARD_PADDING + slot.col * (TILE_SIZE + TILE_GAP),
    y: BOARD_PADDING + slot.row * (TILE_SIZE + TILE_GAP),
  };
}

export function getNextTileOptions(tileId, direction = 1) {
  const tile = tiles[tileId];
  if (!tile) {
    return [];
  }
  return direction >= 0 ? [...(tile.nextIds || [])] : [tile.previousId].filter((value) => value !== undefined);
}

export function clonePlayers(players) {
  return players.map((player) => ({ ...player, properties: [...player.properties] }));
}

export function getAvatarPreset(avatarId) {
  return avatarPresets.find((item) => item.id === avatarId) || avatarPresets[0];
}

export function getActivePlayers(players) {
  return players.filter((player) => !player.bankrupt);
}

export function getOpponentCandidates(players, playerId) {
  return players.filter((player) => player.id !== playerId && !player.bankrupt);
}

export function pickTargetOpponent(players, playerId) {
  const candidates = getOpponentCandidates(players, playerId);
  if (candidates.length === 0) {
    return null;
  }
  return candidates.sort((left, right) => right.money - left.money)[0];
}

export function createInitialSetup() {
  return {
    playerCount: 2,
    initialMoney: 1500,
    slots: [
      { name: "玩家1", role: "player", avatarId: "ava-sun" },
      { name: "电脑1", role: "ai", avatarId: "ava-wave" },
      { name: "玩家2", role: "player", avatarId: "ava-mint" },
      { name: "玩家3", role: "player", avatarId: "ava-gold" },
    ],
  };
}

export function createPlayersFromSetup(setup) {
  return setup.slots.slice(0, setup.playerCount).map((slot, index) => {
    const preset = getAvatarPreset(slot.avatarId);
    return {
      id: `p${index + 1}`,
      name: slot.name.trim() || `${slot.role === "ai" ? "电脑" : "玩家"}${index + 1}`,
      role: slot.role,
      avatarId: slot.avatarId,
      accent: preset.accent,
      money: setup.initialMoney,
      position: 0,
      plannedRouteTileId: null,
      properties: [],
      bankrupt: false,
    };
  });
}

export function createGameFromSetup(setup) {
  const players = createPlayersFromSetup(setup);
  return {
    players,
    currentTurn: 0,
    ownership: {},
    log: [logEntry(`新游戏开始，共 ${players.length} 位玩家参与，初始资金 ${currency(setup.initialMoney)}。`)],
    lastDice: null,
    hasRolledThisTurn: false,
    gameOver: false,
    pendingPurchaseTileId: null,
    focusTileId: 0,
    isAnimating: false,
    isTurnTransitioning: false,
    pendingRouteChoice: null,
    status: `轮到 ${players[0].name} 行动。`,
    lastChanceCard: "尚未触发事件卡。",
  };
}

export function withBankruptcyCheck(state) {
  if (state.gameOver) {
    return state;
  }

  const players = clonePlayers(state.players);
  const ownership = { ...state.ownership };
  let log = state.log;

  players.forEach((player) => {
    if (player.money >= 0 || player.bankrupt) {
      return;
    }

    player.bankrupt = true;
    player.properties.forEach((tileId) => {
      delete ownership[tileId];
    });
    player.properties = [];
    log = prependLog(log, `${player.name} 破产出局，名下地产被收回。`);
  });

  const activePlayers = getActivePlayers(players);
  if (activePlayers.length > 1) {
    return { ...state, players, ownership, log };
  }

  if (activePlayers.length === 1) {
    const winner = activePlayers[0];
    return {
      ...state,
      players,
      ownership,
      log: prependLog(log, `${winner.name} 成为最后的赢家。`),
      gameOver: true,
      focusTileId: winner.position,
      status: `${winner.name} 成为最后的赢家。`,
    };
  }

  return {
    ...state,
    players,
    ownership,
    log,
    gameOver: true,
    status: "所有玩家均已出局。",
  };
}
