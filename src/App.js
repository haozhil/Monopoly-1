import React, { useEffect, useRef, useState } from "react";
import htm from "htm";
import Board from "./components/Board.js";
import Sidebar from "./components/Sidebar.js";
import SetupScreen from "./components/SetupScreen.js";
import { tiles } from "./game/constants.js";
import { drawChanceCard } from "./game/engine/chance.js";
import { purchaseProperty, resolveLanding as resolveLandingState } from "./game/engine/landing.js";
import { advanceTurn } from "./game/engine/turns.js";
import {
  clonePlayers,
  createGameFromSetup,
  createInitialSetup,
  currency,
  getNextTileOptions,
  prependLog,
  wait,
} from "./game/helpers.js";

const html = htm.bind(React.createElement);

function App() {
  const [setup, setSetup] = useState(createInitialSetup);
  const [game, setGame] = useState(null);
  const gameRef = useRef(null);
  const timersRef = useRef(new Set());
  const rollLockRef = useRef(false);

  useEffect(() => {
    gameRef.current = game;
  }, [game]);

  useEffect(() => {
    rollLockRef.current = Boolean(game?.hasRolledThisTurn);
  }, [game?.currentTurn, game?.hasRolledThisTurn]);

  useEffect(() => {
    window.render_game_to_text = () =>
      JSON.stringify(
        game
          ? {
              screen: "game",
              status: game.status,
              currentTurn: game.players[game.currentTurn]?.name ?? null,
              hasRolledThisTurn: game.hasRolledThisTurn,
              focusTile: tiles[game.focusTileId]?.name ?? null,
              pendingRouteChoice: game.pendingRouteChoice
                ? {
                    from: tiles[game.pendingRouteChoice.fromTileId]?.name ?? null,
                    options: game.pendingRouteChoice.optionIds.map((tileId) => tiles[tileId]?.name ?? tileId),
                  }
                : null,
              players: game.players.map((player) => ({
                name: player.name,
                money: player.money,
                position: tiles[player.position]?.name ?? player.position,
                plannedRoute: player.plannedRouteTileId !== null ? tiles[player.plannedRouteTileId]?.name ?? player.plannedRouteTileId : null,
                bankrupt: player.bankrupt,
              })),
            }
          : {
              screen: "setup",
              playerCount: setup.playerCount,
              initialMoney: setup.initialMoney,
            }
      );

    return () => {
      delete window.render_game_to_text;
    };
  }, [game, setup.initialMoney, setup.playerCount]);

  useEffect(() => {
    if (
      !game ||
      game.gameOver ||
      game.isAnimating ||
      game.isTurnTransitioning ||
      game.pendingPurchaseTileId !== null ||
      game.pendingRouteChoice !== null
    ) {
      return undefined;
    }

    const currentPlayer = game.players[game.currentTurn];
    if (currentPlayer.role !== "ai" || currentPlayer.bankrupt || game.hasRolledThisTurn) {
      return undefined;
    }

    const timerId = window.setTimeout(() => {
      if (rollLockRef.current) {
        return;
      }
      rollLockRef.current = true;
      runTurn(currentPlayer.id);
    }, 900);

    return () => window.clearTimeout(timerId);
  }, [game]);

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

  function clearPendingRouteChoice() {
    replaceGame((prev) => {
      if (!prev) {
        return prev;
      }
      return { ...prev, pendingRouteChoice: null };
    });
  }

  function endTurn() {
    replaceGame((prev) => advanceTurn(prev));
  }

  function endTurnWithDelay() {
    replaceGame((prev) => {
      if (!prev || prev.gameOver) {
        return prev;
      }
      return { ...prev, isTurnTransitioning: true };
    });
    schedule(endTurn, 850);
  }

  async function movePlayer(playerId, steps, collectStartBonus = true) {
    const direction = steps >= 0 ? 1 : -1;
    const totalSteps = Math.abs(steps);

    for (let index = 0; index < totalSteps; index += 1) {
      const current = gameRef.current;
      const player = current.players.find((item) => item.id === playerId);
      if (!player) {
        return;
      }

      const nextOptions = getNextTileOptions(player.position, direction);
      if (nextOptions.length === 0) {
        return;
      }

      let nextPosition = nextOptions[0];
      if (direction > 0 && nextOptions.length > 1) {
        nextPosition = nextOptions.includes(player.plannedRouteTileId) ? player.plannedRouteTileId : nextOptions[0];
      }

      replaceGame((prev) => {
        const players = clonePlayers(prev.players);
        const player = players.find((item) => item.id === playerId);
        const isLeavingFork = direction > 0 && nextOptions.length > 1;
        player.position = nextPosition;
        if (isLeavingFork) {
          player.plannedRouteTileId = null;
        }
        let log = prev.log;

        if (collectStartBonus && direction > 0 && nextPosition === 0) {
          player.money += 200;
          log = prependLog(log, `${player.name} 经过起点，获得 ${currency(200)}。`);
        }

        return {
          ...prev,
          players,
          focusTileId: nextPosition,
          pendingRouteChoice: null,
          log,
        };
      });
      await wait(360);
    }
  }

  function applyRouteChoiceAfterLanding(state, playerId) {
    const player = state.players.find((item) => item.id === playerId);
    if (!player || player.bankrupt) {
      return { state, mode: "none" };
    }
    const optionIds = getNextTileOptions(player.position, 1);
    if (optionIds.length <= 1) {
      return { state, mode: "none" };
    }

    if (player.role !== "player") {
      const useBridgeRoute = optionIds.length > 1 && Math.random() > 0.58;
      const selectedTileId = useBridgeRoute ? optionIds[optionIds.length - 1] : optionIds[0];
      return {
        mode: "end_turn",
        state: {
          ...state,
          players: state.players.map((item) =>
            item.id === playerId ? { ...item, plannedRouteTileId: selectedTileId, properties: [...item.properties] } : { ...item, properties: [...item.properties] }
          ),
          focusTileId: player.position,
          pendingRouteChoice: null,
          status: `${player.name} 在岔路口选择前往 ${tiles[selectedTileId].name}。`,
          log: prependLog(state.log, `${player.name} 在 ${tiles[player.position].name} 选择了通往 ${tiles[selectedTileId].name} 的路线。`),
        },
      };
    }

    return {
      mode: "await_route",
      state: {
        ...state,
        focusTileId: player.position,
        pendingRouteChoice: {
          playerId,
          fromTileId: player.position,
          optionIds,
        },
        status: `${player.name} 停在岔路口，请选择下一回合要走的路线。`,
        log: prependLog(state.log, `${player.name} 停在 ${tiles[player.position].name} 的岔路口，等待选择路线。`),
      },
    };
  }

  async function drawChanceCardForPlayer(playerId) {
    const result = drawChanceCard(gameRef.current, playerId);
    replaceGame(() => result.state);

    await wait(result.pauseMs ?? 280);

    if (result.followUp?.type === "move_and_resolve") {
      await movePlayer(playerId, result.followUp.steps, result.followUp.collectStartBonus);
      await resolveLanding(playerId);
      return;
    }

    if (result.shouldEndTurn && !gameRef.current.gameOver) {
      endTurnWithDelay();
    }
  }

  async function resolveLanding(playerId) {
    const result = resolveLandingState(gameRef.current, playerId);

    if (result.effect === "draw_chance") {
      replaceGame(() => result.state);
      await drawChanceCardForPlayer(playerId);
      return;
    }

    if (result.effect === "await_purchase") {
      replaceGame(() => result.state);
      return;
    }

    if (result.effect === "end_turn") {
      const routeResult = applyRouteChoiceAfterLanding(result.state, playerId);
      replaceGame(() => routeResult.state);
      if (routeResult.mode !== "await_route" && !routeResult.state.gameOver) {
        endTurnWithDelay();
      }
      return;
    }
  }

  async function runTurn(playerId) {
    const current = gameRef.current;
    if (
      !current ||
      current.gameOver ||
      current.hasRolledThisTurn ||
      current.isAnimating ||
      current.isTurnTransitioning ||
      current.pendingRouteChoice !== null
    ) {
      return;
    }

    const actingPlayer = current.players.find((player) => player.id === playerId);
    if (!actingPlayer || actingPlayer.bankrupt) {
      return;
    }

    const dice = Math.floor(Math.random() * 6) + 1;
    replaceGame((prev) => ({
      ...prev,
      isAnimating: true,
      isTurnTransitioning: false,
      hasRolledThisTurn: true,
      lastDice: dice,
      status: `${actingPlayer.name} 掷出 ${dice} 点，开始移动。`,
      log: prependLog(prev.log, `${actingPlayer.name} 掷出了 ${dice} 点。`),
    }));

    await movePlayer(playerId, dice);

    replaceGame((prev) => {
      const player = prev.players.find((item) => item.id === playerId);
      return {
        ...prev,
        isAnimating: false,
        isTurnTransitioning: false,
        status: `${player.name} 掷出 ${dice} 点，移动到 ${tiles[player.position].name}。`,
      };
    });

    await wait(220);
    await resolveLanding(playerId);
  }

  function handleRoll() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    if (
      currentPlayer.role !== "player" ||
      currentPlayer.bankrupt ||
      gameRef.current.hasRolledThisTurn ||
      gameRef.current.isTurnTransitioning ||
      gameRef.current.pendingPurchaseTileId !== null ||
      gameRef.current.pendingRouteChoice !== null
    ) {
      return;
    }
    rollLockRef.current = true;
    runTurn(currentPlayer.id);
  }

  function handleBuy() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    const tileId = gameRef.current.pendingPurchaseTileId;
    if (
      tileId === null ||
      currentPlayer.role !== "player" ||
      currentPlayer.bankrupt ||
      gameRef.current.gameOver ||
      gameRef.current.isTurnTransitioning
    ) {
      return;
    }
    const purchasedState = {
      ...purchaseProperty(gameRef.current, currentPlayer.id, tileId),
      status: `${currentPlayer.name} 买下了 ${tiles[tileId].name}。`,
    };
    const routeResult = applyRouteChoiceAfterLanding(purchasedState, currentPlayer.id);
    replaceGame(() => routeResult.state);
    if (routeResult.mode === "await_route") {
      return;
    }
    endTurnWithDelay();
  }

  function handleSkip() {
    const currentPlayer = gameRef.current.players[gameRef.current.currentTurn];
    const tileId = gameRef.current.pendingPurchaseTileId;
    if (
      tileId === null ||
      currentPlayer.role !== "player" ||
      currentPlayer.bankrupt ||
      gameRef.current.gameOver ||
      gameRef.current.isTurnTransitioning
    ) {
      return;
    }
    const skippedState = {
      ...gameRef.current,
      pendingPurchaseTileId: null,
      pendingRouteChoice: null,
      status: `${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`,
      log: prependLog(gameRef.current.log, `${currentPlayer.name} 放弃购买 ${tiles[tileId].name}。`),
    };
    const routeResult = applyRouteChoiceAfterLanding(skippedState, currentPlayer.id);
    replaceGame(() => routeResult.state);
    if (routeResult.mode === "await_route") {
      return;
    }
    endTurnWithDelay();
  }

  function handleChooseRoute(tileId) {
    const current = gameRef.current;
    const choice = current?.pendingRouteChoice;
    if (!choice || !choice.optionIds.includes(tileId)) {
      return;
    }

    const player = current.players.find((item) => item.id === choice.playerId);
    replaceGame((prev) => ({
      ...prev,
      players: prev.players.map((item) =>
        item.id === choice.playerId
          ? { ...item, plannedRouteTileId: tileId, properties: [...item.properties] }
          : { ...item, properties: [...item.properties] }
      ),
      pendingRouteChoice: null,
      status: `${player.name} 已选择下一回合前往 ${tiles[tileId].name}。`,
      log: prependLog(prev.log, `${player.name} 选择了下一回合前往 ${tiles[tileId].name} 的路线。`),
    }));
    endTurnWithDelay();
  }

  function handleRestart() {
    timersRef.current.forEach((timerId) => window.clearTimeout(timerId));
    timersRef.current.clear();
    rollLockRef.current = false;
    clearPendingRouteChoice();
    gameRef.current = null;
    setGame(null);
  }

  function handleStartGame() {
    const activeSlots = setup.slots.slice(0, setup.playerCount);
    if (!activeSlots.some((slot) => slot.role === "player")) {
      return;
    }
    const nextGame = createGameFromSetup(setup);
    rollLockRef.current = false;
    gameRef.current = nextGame;
    setGame(nextGame);
  }

  if (!game) {
    return html`<${SetupScreen} setup=${setup} onChange=${setSetup} onStart=${handleStartGame} />`;
  }

  return html`
    <main className="app-shell">
      <section className="game-layout">
        <${Board} game=${game} onChooseRoute=${handleChooseRoute} />
        <${Sidebar} game=${game} onRoll=${handleRoll} onBuy=${handleBuy} onSkip=${handleSkip} onRestart=${handleRestart} />
      </section>
    </main>
  `;
}

export default App;
