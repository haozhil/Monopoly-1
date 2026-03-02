import React, { useEffect, useRef, useState } from "react";
import htm from "htm";
import Tile from "./Tile.js";
import { BOARD_PADDING, TILE_GAP, TILE_SIZE, WORLD_SIZE, tiles } from "../game/constants.js";
import { getTilePosition } from "../game/helpers.js";

const html = htm.bind(React.createElement);

function Board({ game, onChooseRoute }) {
  const viewportRef = useRef(null);
  const worldRef = useRef(null);
  const autoCameraRef = useRef({ x: 0, y: 0 });
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const dragStateRef = useRef({ active: false, startX: 0, startY: 0, baseX: 0, baseY: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [zoom, setZoom] = useState(0.56);

  useEffect(() => {
    const viewport = viewportRef.current;
    const world = worldRef.current;
    if (!viewport || !world) {
      return undefined;
    }

    const isInteractiveTarget = (target) => target instanceof Element && Boolean(target.closest("[data-board-interactive='true']"));

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
      if (isInteractiveTarget(event.target)) {
        return;
      }
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
            <button className="zoom-button" onClick=${() => setZoom((value) => Math.max(0.42, Number((value - 0.06).toFixed(2))))}>-</button>
            <span className="zoom-value">${`${Math.round(zoom * 100)}%`}</span>
            <button className="zoom-button" onClick=${() => setZoom((value) => Math.min(1, Number((value + 0.06).toFixed(2))))}>+</button>
            <button className="zoom-button reset" onClick=${() => setZoom(0.56)}>重置</button>
          </div>
        </div>
      </div>
      <div ref=${viewportRef} className=${`board-viewport ${isDragging ? "dragging" : ""}`} aria-label="游戏棋盘视口">
        <div className="board-hint">${isDragging ? "拖拽中" : "按住拖动棋盘"}</div>
        <div ref=${worldRef} className="board-world" style=${{ width: `${WORLD_SIZE}px`, height: `${WORLD_SIZE}px` }}>
          <div className="board-center">
            <span className="center-kicker">CITY CORE</span>
            <strong>MONOPOLY</strong>
            <p>8x8 城市外环已经展开，老街和税务局之间新增了一条可选桥梁支路。</p>
          </div>
          ${tiles.map((tile) => {
            const ownerId = game.ownership[tile.id];
            const owner = game.players.find((player) => player.id === ownerId);
            const playersHere = game.players.filter((player) => player.position === tile.id && !player.bankrupt);
            const isRouteOption = Boolean(game.pendingRouteChoice?.optionIds.includes(tile.id));
            return html`<${Tile}
              key=${tile.id}
              tile=${tile}
              owner=${owner}
              playersHere=${playersHere}
              isFocused=${game.focusTileId === tile.id}
              isRouteOption=${isRouteOption}
              onRouteSelect=${onChooseRoute}
            />`;
          })}
          ${game.pendingRouteChoice
            ? html`
                <div key="route-choice-layer" className="route-choice-layer">
                  ${game.pendingRouteChoice.optionIds.map((tileId) => {
                    const tile = tiles[tileId];
                    const position = getTilePosition(tileId);
                    return html`
                    <button
                      key=${tileId}
                      className="route-choice-chip"
                      data-board-interactive="true"
                      data-route-tile-id=${tileId}
                      style=${{
                        left: `${position.x + BOARD_PADDING / 3}px`,
                        top: `${position.y + TILE_SIZE / 2 - 20}px`,
                      }}
                      onPointerDown=${(event) => event.stopPropagation()}
                      onClick=${() => onChooseRoute(tileId)}
                    >
                        ${`前往 ${tile.name}`}
                      </button>
                    `;
                  })}
                </div>
              `
            : null}
        </div>
        ${game.pendingRouteChoice
          ? html`
              <div className="route-choice-banner">
                <span>路线选择</span>
                <strong>${`${game.players.find((player) => player.id === game.pendingRouteChoice.playerId)?.name || "玩家"}，请选择前往哪条路`}</strong>
                <p>${`当前停在 ${tiles[game.pendingRouteChoice.fromTileId].name}，请选择下一回合要走的方向。`}</p>
              </div>
            `
          : null}
      </div>
    </div>
  `;
}

export default Board;
