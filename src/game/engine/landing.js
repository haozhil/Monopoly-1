import { tiles } from "../constants.js";
import { clonePlayers, currency, prependLog, withBankruptcyCheck } from "../helpers.js";

function buyProperty(state, playerId, tileId) {
  const players = clonePlayers(state.players);
  const player = players.find((item) => item.id === playerId);
  const tile = tiles[tileId];
  player.money -= tile.price;
  player.properties.push(tileId);
  return withBankruptcyCheck({
    ...state,
    players,
    ownership: { ...state.ownership, [tileId]: playerId },
    pendingPurchaseTileId: null,
    pendingRouteChoice: null,
    log: prependLog(state.log, `${player.name} 购买了 ${tile.name}，花费 ${currency(tile.price)}。`),
  });
}

export function purchaseProperty(state, playerId, tileId) {
  return buyProperty(state, playerId, tileId);
}

export function resolveLanding(state, playerId) {
  const player = state.players.find((item) => item.id === playerId);
  const tile = tiles[player.position];
  let nextState = { ...state, focusTileId: tile.id };

  if (tile.type === "start") {
    const players = clonePlayers(nextState.players);
    const currentPlayer = players.find((item) => item.id === playerId);
    currentPlayer.money += 200;
    nextState = {
      ...nextState,
      players,
      status: `${currentPlayer.name} 停在起点，获得 ${currency(200)}。`,
      log: prependLog(nextState.log, `${currentPlayer.name} 停在起点，获得 ${currency(200)}。`),
    };
    return { state: nextState, effect: "end_turn" };
  }

  if (tile.type === "property") {
    const ownerId = nextState.ownership[tile.id];
    const owner = nextState.players.find((item) => item.id === ownerId) || null;

    if (!owner) {
      if (player.role === "player") {
        if (player.money >= tile.price) {
          return {
            state: {
              ...nextState,
              pendingPurchaseTileId: tile.id,
              status: `${player.name} 到达 ${tile.name}。售价 ${currency(tile.price)}，可以购买。`,
              log: prependLog(nextState.log, `${player.name} 来到 ${tile.name}，可选择是否购买。`),
            },
            effect: "await_purchase",
          };
        }
        return {
          state: {
            ...nextState,
            status: `${player.name} 到达 ${tile.name}，但现金不足，无法购买。`,
            log: prependLog(nextState.log, `${player.name} 到达 ${tile.name}，但现金不足。`),
          },
          effect: "end_turn",
        };
      }

      const shouldBuy = player.money - tile.price >= 250 || player.properties.length < 2;
      if (shouldBuy && player.money >= tile.price) {
        return {
          state: {
            ...buyProperty(nextState, playerId, tile.id),
            status: `${player.name} 买下了 ${tile.name}。`,
          },
          effect: "end_turn",
        };
      }

      return {
        state: {
          ...nextState,
          status: `${player.name} 放弃购买 ${tile.name}。`,
          log: prependLog(nextState.log, `${player.name} 来到 ${tile.name}，选择不购买。`),
        },
        effect: "end_turn",
      };
    }

    if (owner.id === player.id) {
      return {
        state: {
          ...nextState,
          status: `${player.name} 回到自己的地产 ${tile.name}。`,
          log: prependLog(nextState.log, `${player.name} 回到自己的地产 ${tile.name}。`),
        },
        effect: "end_turn",
      };
    }

    const players = clonePlayers(nextState.players);
    const landingPlayer = players.find((item) => item.id === playerId);
    const receivingPlayer = players.find((item) => item.id === owner.id);
    landingPlayer.money -= tile.rent;
    receivingPlayer.money += tile.rent;

    return {
      state: withBankruptcyCheck({
        ...nextState,
        players,
        status: `${landingPlayer.name} 进入 ${receivingPlayer.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`,
        log: prependLog(nextState.log, `${landingPlayer.name} 进入 ${receivingPlayer.name} 的 ${tile.name}，支付租金 ${currency(tile.rent)}。`),
      }),
      effect: "end_turn",
    };
  }

  if (tile.type === "tax") {
    const players = clonePlayers(nextState.players);
    const currentPlayer = players.find((item) => item.id === playerId);
    currentPlayer.money -= tile.amount;
    return {
      state: withBankruptcyCheck({
        ...nextState,
        players,
        status: `${currentPlayer.name} 来到 ${tile.name}，缴纳 ${currency(tile.amount)}。`,
        log: prependLog(nextState.log, `${currentPlayer.name} 来到 ${tile.name}，缴纳 ${currency(tile.amount)}。`),
      }),
      effect: "end_turn",
    };
  }

  if (tile.type === "bonus") {
    const players = clonePlayers(nextState.players);
    const currentPlayer = players.find((item) => item.id === playerId);
    currentPlayer.money += tile.amount;
    return {
      state: {
        ...nextState,
        players,
        status: `${currentPlayer.name} 来到 ${tile.name}，获得 ${currency(tile.amount)}。`,
        log: prependLog(nextState.log, `${currentPlayer.name} 来到 ${tile.name}，获得 ${currency(tile.amount)}。`),
      },
      effect: "end_turn",
    };
  }

  if (tile.type === "chance") {
    return {
      state: nextState,
      effect: "draw_chance",
    };
  }

  return { state: nextState, effect: "end_turn" };
}
