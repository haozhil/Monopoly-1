export function getNextTurnIndex(players, currentTurn) {
  for (let offset = 1; offset <= players.length; offset += 1) {
    const nextIndex = (currentTurn + offset) % players.length;
    if (!players[nextIndex].bankrupt) {
      return nextIndex;
    }
  }
  return currentTurn;
}

export function advanceTurn(state) {
  if (!state || state.gameOver) {
    return state;
  }

  const nextTurn = getNextTurnIndex(state.players, state.currentTurn);
  const currentPlayer = state.players[nextTurn];
  return {
    ...state,
    currentTurn: nextTurn,
    hasRolledThisTurn: false,
    isTurnTransitioning: false,
    pendingPurchaseTileId: null,
    pendingRouteChoice: null,
    focusTileId: currentPlayer.position,
    status: `轮到 ${currentPlayer.name} 行动。`,
  };
}
