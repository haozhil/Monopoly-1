import React from "react";
import htm from "htm";
import { currency, getTilePosition } from "../game/helpers.js";

const html = htm.bind(React.createElement);

function Tile({ tile, owner, playersHere, isFocused, isRouteOption, onRouteSelect }) {
  const position = getTilePosition(tile.id);
  const classes = ["tile", `type-${tile.type}`];
  if (playersHere.length > 0 || isFocused) {
    classes.push("active");
  }
  if (isRouteOption) {
    classes.push("route-option");
  }

  let meta = tile.description;
  if (tile.type === "property") {
    meta = `售价 ${currency(tile.price)} / 租金 ${currency(tile.rent)}`;
  } else if (tile.type === "tax" || tile.type === "bonus") {
    meta = `${tile.description} ${currency(tile.amount)}`;
  }

  const style = { left: `${position.x}px`, top: `${position.y}px` };
  if (tile.color) {
    style.borderColor = `${tile.color}55`;
  }
  if (owner) {
    style.borderColor = `${owner.accent}cc`;
    style.background = `linear-gradient(160deg, ${owner.accent}bb, rgba(255, 255, 255, 0.96))`;
    style.boxShadow = `inset 0 0 0 1px ${owner.accent}44, 0 20px 40px ${owner.accent}22`;
  }

  return html`
    <article
      className=${classes.join(" ")}
      style=${style}
      data-board-interactive=${isRouteOption ? "true" : undefined}
      onClick=${isRouteOption ? () => onRouteSelect(tile.id) : undefined}
    >
      <div className="tile-topline">
        <span className="tile-index">${`#${tile.id}`}</span>
        <span className="tile-type">${tile.type.toUpperCase()}</span>
      </div>
      <h3 className="tile-name">${tile.name}</h3>
      <p className="tile-meta">${meta}</p>
      <div className="tile-footer">
        <span className="owner-chip">${owner ? `${owner.name}持有` : "未拥有"}</span>
        <div className="tokens">
          ${playersHere.map(
            (player) => html`
              <span key=${player.id} className="token" title=${player.name} style=${{ background: player.accent }}></span>
            `
          )}
        </div>
      </div>
    </article>
  `;
}

export default Tile;
