import React, { useEffect, useRef } from "react";
import { ITerminalAddon, ITerminalOptions, Terminal as XTerminal } from "xterm";
import { FitAddon } from "xterm-addon-fit";
import { Unicode11Addon } from "xterm-addon-unicode11";
import { WebLinksAddon } from "xterm-addon-web-links";
// @ts-ignore
import { Broadcast } from "xterm-theme";
import "xterm/css/xterm.css";

import { Log } from "@/generated/graphql";
import { headerStyles } from "./Terminal.css";

function useBind(
  termRef: React.RefObject<XTerminal>,
  handler: any,
  eventName:
    | "onBell"
    | "onBinary"
    | "onCursorMove"
    | "onData"
    | "onKey"
    | "onLineFeed"
    | "onRender"
    | "onResize"
    | "onScroll"
    | "onSelectionChange"
    | "onTitleChange"
    | "onWriteParsed",
) {
  useEffect(() => {
    if (!termRef.current || typeof handler !== "function") return;

    const term = termRef.current;
    const binding = term[eventName](handler);

    return () => binding?.dispose();
  }, [termRef, handler, eventName]);
}

type XTermProps = {
  customKeyEventHandler?(event: KeyboardEvent): boolean;
  className?: string;
  id?: string;
  onBell?: () => void;
  onBinary?: (data: string) => void;
  onCursorMove?: () => void;
  onData?: (data: string) => void;
  onInit?: (term: XTerminal) => void;
  onKey?: (key: { key: string; domEvent: KeyboardEvent }) => void;
  onLineFeed?: () => void;
  onRender?: () => void;
  onResize?: (cols: number, rows: number) => void;
  onScroll?: (ydisp: number) => void;
  onSelectionChange?: () => void;
  onTitleChange?: (title: string) => void;
  onWriteParsed?: (data: string) => void;
  options?: ITerminalOptions;
  status?: string;
  title?: React.ReactNode;
  logs?: Log[];
  isRunning?: boolean;
};

export const Terminal = ({
  id,
  className,
  onBell,
  onBinary,
  onCursorMove,
  onData,
  onKey,
  onLineFeed,
  onRender,
  onResize,
  onScroll,
  onSelectionChange,
  onTitleChange,
  onWriteParsed,
  customKeyEventHandler,
  onInit,
  title,
  logs = [],
  isRunning = false,
}: XTermProps) => {
  const divRef = useRef<HTMLDivElement | null>(null);
  const xtermRef = useRef<XTerminal | null>(null);
  const renderedLogIds = useRef<string[]>([]);
  const unlocked = useRef(false);

  useEffect(() => {
    const unlock = () => {
      unlocked.current = true;
    };

    window.addEventListener("click", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });

    return () => {
      window.removeEventListener("click", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  useEffect(() => {
    if (!unlocked.current) return;
    if (!divRef.current || xtermRef.current) return;

    const xterm = new XTerminal({
      convertEol: true,
      allowProposedApi: true,
      theme: Broadcast,
      fontFamily: `"Menlo", "Consolas", "Liberation Mono", "Courier New", monospace`,
    });

    const fitAddon = new FitAddon();

    const addons: ITerminalAddon[] = [
      new Unicode11Addon(),
      new WebLinksAddon(),
    ];

    addons.forEach((a) => xterm.loadAddon(a));
    xterm.loadAddon(fitAddon);

    if (customKeyEventHandler) {
      xterm.attachCustomKeyEventHandler(customKeyEventHandler);
    }

    xterm.open(divRef.current);
    fitAddon.fit();

    xtermRef.current = xterm;
    onInit?.(xterm);
  }, [id, customKeyEventHandler, onInit]);

  useEffect(() => {
    if (!xtermRef.current) return;

    for (const log of logs) {
      if (renderedLogIds.current.includes(log.id)) continue;
      xtermRef.current.writeln(log.text);
      renderedLogIds.current.push(log.id);
    }
  }, [logs]);

  useEffect(() => {
    if (!xtermRef.current) return;
    xtermRef.current.clear();
    renderedLogIds.current = [];
  }, [id]);

  useBind(xtermRef, onBell, "onBell");
  useBind(xtermRef, onBinary, "onBinary");
  useBind(xtermRef, onCursorMove, "onCursorMove");
  useBind(xtermRef, onData, "onData");
  useBind(xtermRef, onKey, "onKey");
  useBind(xtermRef, onLineFeed, "onLineFeed");
  useBind(xtermRef, onRender, "onRender");
  useBind(xtermRef, onResize, "onResize");
  useBind(xtermRef, onScroll, "onScroll");
  useBind(xtermRef, onSelectionChange, "onSelectionChange");
  useBind(xtermRef, onTitleChange, "onTitleChange");
  useBind(xtermRef, onWriteParsed, "onWriteParsed");

  return (
    <>
      <div className={headerStyles}>
        {isRunning ? title + " - Active" : "Disconnected"}
      </div>

      <div id={id} className={className} ref={divRef} />
    </>
  );
};