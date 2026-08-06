import { globalStyle } from "@vanilla-extract/css";
import { vars } from "./theme.css";

/* Base app styles */
globalStyle("html, body", {
  margin: 0,
  padding: 0,
  fontFamily: '"Inter", system-ui, sans-serif',
  color: vars.color.gray12,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
});

/* ONLY safe global rule */
globalStyle("*", {
  boxSizing: "border-box",
});

/* IMPORTANT:
   Do NOT set font-family on *,
   and do NOT style .terminal globally.
   Terminal is controlled by xterm itself.
*/