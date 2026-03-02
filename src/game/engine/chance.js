import { tiles } from "../constants.js";
import { clonePlayers, currency, pickTargetOpponent, prependLog, withBankruptcyCheck } from "../helpers.js";

function buildChanceCards(playerId) {
  return [
    {
      text: "投资成功，获得 180。",
      apply(state) {
        const players = clonePlayers(state.players);
        players.find((item) => item.id === playerId).money += 180;
        return { ...state, players };
      },
    },
    {
      text: "交通拥堵，支付 90。",
      apply(state) {
        const players = clonePlayers(state.players);
        players.find((item) => item.id === playerId).money -= 90;
        return withBankruptcyCheck({ ...state, players });
      },
    },
    {
      text: "奖励前进两格。",
      followUp: { type: "move_and_resolve", steps: 2, collectStartBonus: false },
    },
    {
      text: "道路施工，后退两格。",
      followUp: { type: "move_and_resolve", steps: -2, collectStartBonus: false },
    },
    {
      text: "回到起点并领取 200。",
      apply(state) {
        const players = clonePlayers(state.players);
        const player = players.find((item) => item.id === playerId);
        player.position = 0;
        player.money += 200;
        return {
          ...state,
          players,
          focusTileId: 0,
        };
      },
    },
    {
      text: "市场回调，支付 140。",
      apply(state) {
        const players = clonePlayers(state.players);
        players.find((item) => item.id === playerId).money -= 140;
        return withBankruptcyCheck({ ...state, players });
      },
    },
    {
      text: "品牌授权收入，获得 120。",
      apply(state) {
        const players = clonePlayers(state.players);
        players.find((item) => item.id === playerId).money += 120;
        return { ...state, players };
      },
    },
    {
      text: "向前冲刺三格。",
      followUp: { type: "move_and_resolve", steps: 3, collectStartBonus: true },
    },
    {
      text: "收到最富玩家补偿 80。",
      apply(state) {
        const players = clonePlayers(state.players);
        const player = players.find((item) => item.id === playerId);
        const opponent = pickTargetOpponent(players, playerId);
        if (!opponent) {
          return state;
        }
        const payment = Math.min(80, opponent.money);
        opponent.money -= payment;
        player.money += payment;
        return withBankruptcyCheck({ ...state, players });
      },
    },
    {
      text: "慈善晚宴，支付一位对手 60。",
      apply(state) {
        const players = clonePlayers(state.players);
        const player = players.find((item) => item.id === playerId);
        const opponent = pickTargetOpponent(players, playerId);
        if (!opponent) {
          return state;
        }
        player.money -= 60;
        opponent.money += 60;
        return withBankruptcyCheck({ ...state, players });
      },
    },
  ];
}

export function drawChanceCard(state, playerId, random = Math.random) {
  const cards = buildChanceCards(playerId);
  const rawIndex = Math.floor(random() * cards.length);
  const card = cards[Math.max(0, Math.min(rawIndex, cards.length - 1))];
  const player = state.players.find((item) => item.id === playerId);

  let nextState = {
    ...state,
    status: `${player.name} 抽到事件卡：${card.text}`,
    log: prependLog(state.log, `${player.name} 抽到事件卡：${card.text}`),
    lastChanceCard: card.text,
  };

  if (card.apply) {
    nextState = card.apply(nextState);
  }

  return {
    state: nextState,
    cardText: card.text,
    followUp: card.followUp ?? null,
    shouldEndTurn: !card.followUp && !nextState.gameOver,
    pauseMs: card.followUp ? 280 : 280,
    focusTileId:
      nextState.players.find((item) => item.id === playerId)?.position === 0 && card.text === "回到起点并领取 200。"
        ? 0
        : null,
    summary:
      card.text === "回到起点并领取 200。"
        ? `${player.name} 返回 ${tiles[0].name}，获得 ${currency(200)}。`
        : null,
  };
}
