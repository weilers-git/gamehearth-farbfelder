import type { GameConnection } from "@gamehearth/sdk/client";
import type { Direction, FarbfelderAction, FarbfelderState } from "../../src/index";
import { blob, blobKeys, controllerView, cssColor, keyDirections, needsResend, padDirection, pressKey, releaseKey, steer, topKey, type Snapshot } from "./view";

const pad: { dir: Exclude<Direction, "none">; label: string; symbol: string }[] = [
  { dir: "up", label: "Hoch", symbol: "▲" },
  { dir: "left", label: "Links", symbol: "◀" },
  { dir: "right", label: "Rechts", symbol: "▶" },
  { dir: "down", label: "Runter", symbol: "▼" },
];

function element<K extends keyof HTMLElementTagNameMap>(name: K, className: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(name);
  node.className = className;
  return node;
}

export function mountController(root: HTMLElement, game: GameConnection<FarbfelderState, FarbfelderAction>): void {
  const header = element("header", "who");
  const title = element("h1", "name");
  const facts = element("p", "facts");
  const swatch = element("span", "swatch");
  const colorName = element("span", "color-name");
  const cells = element("strong", "cells");
  facts.append(swatch, colorName, cells);
  header.append(title, facts);
  const status = element("p", "status");
  const notice = element("p", "sr-only");
  notice.setAttribute("aria-live", "polite");

  const grid = element("div", "pad");
  grid.setAttribute("role", "group");
  grid.setAttribute("aria-label", "Steuerkreuz");
  const blobButton = element("button", "blob");
  blobButton.type = "button";
  const blobLabel = element("span", "blob-label");
  blobButton.append(blobLabel);
  const area = element("div", "pad-area");
  area.append(grid);
  root.append(header, status, notice, area, blobButton);

  let held: Direction = "none";
  let padPointer: number | undefined;
  let canBlob = false;
  let keys: Direction[] = [];
  let pending = 0;

  const transmit = (dir: Direction) => {
    pending += 1;
    const done = () => {
      pending -= 1;
    };
    game.move(steer(dir)).then(done, done);
  };

  const send = (dir: Direction) => {
    if (dir === held) {
      return;
    }
    held = dir;
    for (const button of grid.querySelectorAll("button")) {
      button.setAttribute("aria-pressed", String(button.dataset["dir"] === dir));
    }
    transmit(dir);
  };

  const splash = () => {
    if (!canBlob) {
      return;
    }
    canBlob = false;
    blobButton.disabled = true;
    void game.move(blob());
  };

  for (const entry of pad) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = entry.symbol;
    button.dataset["dir"] = entry.dir;
    button.className = `dir ${entry.dir}`;
    button.setAttribute("aria-label", entry.label);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        send(entry.dir);
      }
    });
    button.addEventListener("keyup", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        send("none");
      }
    });
    grid.append(button);
  }

  const aim = (event: PointerEvent) => {
    const box = grid.getBoundingClientRect();
    const dx = event.clientX - (box.left + box.width / 2);
    const dy = event.clientY - (box.top + box.height / 2);
    return padDirection(dx, dy, Math.min(box.width, box.height) * 0.1);
  };
  grid.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    padPointer = event.pointerId;
    grid.setPointerCapture(event.pointerId);
    send(aim(event));
  });
  grid.addEventListener("pointermove", (event) => {
    if (event.pointerId === padPointer) {
      send(aim(event));
    }
  });
  const release = (event: PointerEvent) => {
    if (event.pointerId === padPointer) {
      padPointer = undefined;
      send("none");
    }
  };
  grid.addEventListener("pointerup", release);
  grid.addEventListener("pointercancel", release);
  grid.addEventListener("lostpointercapture", release);

  blobButton.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    splash();
  });
  blobButton.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      splash();
    }
  });

  addEventListener("keydown", (event) => {
    if (event.defaultPrevented || event.repeat) {
      if (keyDirections[event.key] !== undefined || blobKeys.includes(event.key)) {
        event.preventDefault();
      }
      return;
    }
    const dir = keyDirections[event.key];
    if (dir !== undefined) {
      event.preventDefault();
      keys = pressKey(keys, dir);
      send(dir);
    } else if (blobKeys.includes(event.key)) {
      event.preventDefault();
      splash();
    }
  });
  addEventListener("keyup", (event) => {
    const dir = keyDirections[event.key];
    if (dir === undefined) {
      return;
    }
    const before = topKey(keys);
    keys = releaseKey(keys, dir);
    if (before === held) {
      send(topKey(keys));
    }
  });
  const letGo = () => {
    keys = [];
    send("none");
  };
  addEventListener("blur", letGo);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      letGo();
    }
  });
  addEventListener("contextmenu", (event) => event.preventDefault());

  game.onUpdate(({ snapshot, players }) => {
    const shown = controllerView(snapshot as Snapshot, players);
    const color = cssColor(shown.color);
    document.body.style.setProperty("--seat", color);
    title.textContent = shown.name;
    colorName.textContent = shown.colorName;
    cells.textContent = shown.cells;
    status.textContent = shown.status;
    if (notice.textContent !== shown.announcement) {
      notice.textContent = shown.announcement;
    }
    document.body.classList.toggle("over", shown.over);
    canBlob = shown.canBlob;
    blobButton.disabled = !shown.canBlob;
    blobButton.classList.toggle("ready", shown.blob.ready && shown.canBlob);
    blobButton.style.setProperty("--progress", `${Math.round(shown.blob.progress * 100)}%`);
    blobLabel.textContent = shown.blob.label;
    blobButton.setAttribute("aria-label", shown.blob.label);
    if (needsResend(snapshot as Snapshot, held, pending)) {
      transmit(held);
    }
  });
}
