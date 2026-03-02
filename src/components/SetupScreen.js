import React from "react";
import htm from "htm";
import Avatar from "./Avatar.js";
import { avatarPresets } from "../game/constants.js";
import { getAvatarPreset } from "../game/helpers.js";

const html = htm.bind(React.createElement);
const startingMoneyOptions = [1000, 1500, 2000, 3000];

function SetupScreen({ setup, onChange, onStart }) {
  const activeSlots = setup.slots.slice(0, setup.playerCount);
  const hasHuman = activeSlots.some((slot) => slot.role === "player");
  const aiCount = activeSlots.filter((slot) => slot.role === "ai").length;

  return html`
    <main className="setup-shell">
      <section className="setup-hero">
        <div>
          <p className="eyebrow">MONOPOLY / PARTY SETUP</p>
          <h1>创建你的对局</h1>
          <p className="setup-copy">选择 2 到 4 位角色，支持纯玩家对战，也支持混合电脑人。每位角色都可以挑一个卡通头像。</p>
        </div>
        <div className="setup-summary">
          <div className="stat-card compact">
            <span>总人数</span>
            <strong>${`${setup.playerCount} 位`}</strong>
          </div>
          <div className="stat-card compact">
            <span>电脑人</span>
            <strong>${`${aiCount} 位`}</strong>
          </div>
          <div className="stat-card compact">
            <span>初始资金</span>
            <strong>${`¥${setup.initialMoney}`}</strong>
          </div>
        </div>
      </section>
      <section className="setup-panel">
        <div className="setup-toolbar">
          <div>
            <h2>开局配置</h2>
            <p className="setup-toolbar-copy">至少保留一位真人玩家，最多四位角色，并可自定义每位角色的起始资金。</p>
          </div>
          <div className="setup-toolbar-controls">
            <div className="player-count-picker">
              <button className="zoom-button" onClick=${() => onChange((prev) => ({ ...prev, playerCount: Math.max(2, prev.playerCount - 1) }))}>-</button>
              <span className="zoom-value">${`${setup.playerCount} 人局`}</span>
              <button className="zoom-button" onClick=${() => onChange((prev) => ({ ...prev, playerCount: Math.min(4, prev.playerCount + 1) }))}>+</button>
            </div>
            <div className="money-picker">
              ${startingMoneyOptions.map(
                (amount) => html`
                  <button
                    key=${amount}
                    className=${`money-option ${setup.initialMoney === amount ? "selected" : ""}`}
                    onClick=${() => onChange((prev) => ({ ...prev, initialMoney: amount }))}
                  >
                    ${`¥${amount}`}
                  </button>
                `
              )}
            </div>
          </div>
        </div>
        <div className="setup-grid">
          ${setup.slots.map((slot, index) => {
            const active = index < setup.playerCount;
            return html`
              <article key=${index} className=${`slot-card ${active ? "" : "inactive"}`}>
                <div className="slot-topline">
                  <span>${`角色 ${index + 1}`}</span>
                  <span>${active ? "已启用" : "未启用"}</span>
                </div>
                <div className="slot-main">
                  <div className="slot-avatar">
                    <${Avatar} preset=${getAvatarPreset(slot.avatarId)} size=${72} />
                  </div>
                  <div className="slot-fields">
                    <input
                      className="name-input"
                      value=${slot.name}
                      disabled=${!active}
                      onInput=${(event) =>
                        onChange((prev) => {
                          const slots = [...prev.slots];
                          slots[index] = { ...slots[index], name: event.currentTarget.value };
                          return { ...prev, slots };
                        })}
                    />
                    <div className="role-switch">
                      <button
                        className=${`role-button ${slot.role === "player" ? "selected" : ""}`}
                        disabled=${!active}
                        onClick=${() =>
                          onChange((prev) => {
                            const slots = [...prev.slots];
                            slots[index] = { ...slots[index], role: "player", name: slots[index].name || `玩家${index + 1}` };
                            return { ...prev, slots };
                          })}
                      >
                        真人
                      </button>
                      <button
                        className=${`role-button ${slot.role === "ai" ? "selected" : ""}`}
                        disabled=${!active}
                        onClick=${() =>
                          onChange((prev) => {
                            const slots = [...prev.slots];
                            slots[index] = { ...slots[index], role: "ai", name: slots[index].name || `电脑${index + 1}` };
                            return { ...prev, slots };
                          })}
                      >
                        电脑人
                      </button>
                    </div>
                  </div>
                </div>
                <div className="avatar-grid">
                  ${avatarPresets.map(
                    (preset) => html`
                      <button
                        key=${preset.id}
                        className=${`avatar-option ${slot.avatarId === preset.id ? "selected" : ""}`}
                        disabled=${!active}
                        onClick=${() =>
                          onChange((prev) => {
                            const slots = [...prev.slots];
                            slots[index] = { ...slots[index], avatarId: preset.id };
                            return { ...prev, slots };
                          })}
                      >
                        <${Avatar} preset=${preset} size=${42} />
                        <span>${preset.label}</span>
                      </button>
                    `
                  )}
                </div>
              </article>
            `;
          })}
        </div>
        <div className="setup-actions">
          <button className="primary-button" disabled=${!hasHuman} onClick=${onStart}>开始游戏</button>
          <p className="setup-note">${hasHuman ? "已满足开局条件。" : "至少需要一位真人玩家。"}${aiCount === 0 ? " 当前是纯玩家对战。" : " 当前包含电脑人。"}</p>
        </div>
      </section>
    </main>
  `;
}

export default SetupScreen;
