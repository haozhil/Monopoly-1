import React from "react";
import htm from "htm";

const html = htm.bind(React.createElement);

function Avatar({ preset, size = 56 }) {
  return html`
    <svg viewBox="0 0 64 64" width=${size} height=${size} aria-hidden="true">
      <rect x="2" y="2" width="60" height="60" rx="20" fill=${preset.bg}></rect>
      <path d="M16 56c2-10 12-16 16-16s14 6 16 16" fill=${preset.shirt}></path>
      <circle cx="32" cy="26" r="14" fill=${preset.skin}></circle>
      <path d="M18 24c1-10 8-16 14-16 8 0 14 5 14 16-3-4-8-7-14-7-5 0-10 2-14 7" fill=${preset.hair}></path>
      <circle cx="27" cy="27" r="1.7" fill="#1f1b18"></circle>
      <circle cx="37" cy="27" r="1.7" fill="#1f1b18"></circle>
      <path d="M27 33c2 2 8 2 10 0" stroke="#7a4436" strokeWidth="2.2" strokeLinecap="round" fill="none"></path>
      <circle cx="19" cy="45" r="4" fill=${preset.accent} opacity="0.85"></circle>
    </svg>
  `;
}

export default Avatar;
