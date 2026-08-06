import { globalStyle, style } from "@vanilla-extract/css";

import { font } from "@/styles/term_font.css";
import { vars } from "@/styles/theme.css";

export const terminalRoot = style({
  display: "flex",
  flexDirection: "column",

  overflow: "hidden",
  minWidth: 0,
  minHeight: 0,

  transform: "none",
  zoom: 1,

  // 🔥 THIS is the correct place
  fontFamily:
    '"Menlo","Consolas","Liberation Mono","Courier New",monospace',
});

export const terminalViewport = style({
  flex: 1,
  minWidth: 0,
  minHeight: 0,

  background: "#000",
});

/**
 * Header
 */

export const headerStyles = style([
  font.textXsSemibold,
  {
    backgroundColor: vars.color.gray6,
    color: vars.color.gray11,
    padding: "8px 12px",
    borderRadius: "8px 8px 0 0",

    display: "flex",
    alignItems: "center",
    gap: 8,

    flexShrink: 0,
  },
]);

globalStyle(`${headerStyles} svg`, {
  width: 14,
  height: 14,
});

/**
 * xterm hardening
 */

globalStyle(`${terminalViewport} .xterm`, {
  height: "100%",

  fontFamily:
    '"Menlo", "Consolas", "Liberation Mono", "Courier New", monospace !important',

  textRendering: "geometricPrecision",
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",

  fontVariantLigatures: "none",
  fontFeatureSettings: '"liga" 0',

  letterSpacing: "0 !important",
});

globalStyle(`${terminalViewport} .xterm *`, {
  fontFamily:
    '"Menlo", "Consolas", "Liberation Mono", "Courier New", monospace !important',

  letterSpacing: "0 !important",

  fontVariantLigatures: "none",
  fontFeatureSettings: '"liga" 0',
});

globalStyle(`${terminalViewport} .xterm-viewport`, {
  overflowY: "auto",
});

globalStyle(`${terminalViewport} .xterm-screen`, {
  width: "100%",
});

globalStyle(`${terminalViewport} canvas`, {
  imageRendering: "auto",
});
