import React from "react";
import htm from "htm";
import Avatar from "./Avatar.js";
import { currency, getAvatarPreset } from "../game/helpers.js";
import { tiles } from "../game/constants.js";

const html = htm.bind(React.createElement);

function Sidebar({ game, onRoll, onBuy, onSkip, onRestart }) {
  const currentPlayer = game.players[game.currentTurn];
  const canResolveTurn =
    currentPlayer.role === "player" &&
    !game.gameOver &&
    !game.isAnimating &&
    !game.isTurnTransitioning &&
    game.pendingRouteChoice === null;
  const canRoll = canResolveTurn && !game.hasRolledThisTurn && game.pendingPurchaseTileId === null;
  const canResolvePurchase = canResolveTurn && game.pendingPurchaseTileId !== null;
  const humanCount = game.players.filter((player) => player.role === "player").length;
  const aiCount = game.players.filter((player) => player.role === "ai").length;

  return html`
    <aside className="sidebar">
      <div className="mini-stats">
        <div className="stat-card compact">
          <span>目标</span>
          <strong>拖垮对手</strong>
        </div>
        <div className="stat-card compact">
          <span>阵容</span>
          <strong>${`${humanCount} 人类 / ${aiCount} AI`}</strong>
        </div>
      </div>
      <div className="panel current-turn">
        <div className="panel-title-row">
          <h2>当前回合</h2>
          <span className="turn-badge">${currentPlayer.name}</span>
        </div>
        <div className="turn-player">
          <div className="avatar-chip">
            <${Avatar} preset=${getAvatarPreset(currentPlayer.avatarId)} size=${52} />
          </div>
          <div>
            <p className="status-text">${game.status}</p>
          </div>
        </div>
        <div className="dice-box">
          <span>骰子</span>
          <strong>${game.lastDice ?? "-"}</strong>
        </div>
        <div className="actions">
          <button className="primary-button" disabled=${!canRoll} onClick=${onRoll}>掷骰子</button>
          <button className="secondary-button" disabled=${!canResolvePurchase} onClick=${onBuy}>购买地产</button>
          <button className="ghost-button" disabled=${!canResolvePurchase} onClick=${onSkip}>跳过购买</button>
          <button className="ghost-button" onClick=${onRestart}>重新配置</button>
        </div>
        ${game.pendingRouteChoice
          ? html`<p className="route-helper">${`请在左侧棋盘点击目的地方块，决定 ${currentPlayer.name} 下一回合的前进路线。`}</p>`
          : null}
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
              <article key=${player.id} className=${`player-card ${game.currentTurn === index ? "active-player" : ""} ${player.bankrupt ? "bankrupt" : ""}`}>
                <div className="player-header">
                  <div className="player-identity">
                    <${Avatar} preset=${getAvatarPreset(player.avatarId)} size=${46} />
                    <div>
                      <div className="player-name">${player.name}</div>
                      <div className="player-subline">${player.role === "player" ? "玩家控制" : "电脑托管"}</div>
                    </div>
                  </div>
                  <span className="player-badge" style=${{ background: player.accent }}>
                    ${player.bankrupt ? "出局" : "在线"}
                  </span>
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

export default Sidebar;
