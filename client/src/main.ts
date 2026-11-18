import Phaser from "phaser";
import { connect, type ScreenConnection } from "@gamehearth/sdk/client";
import type { FarbfelderAction, FarbfelderState } from "../../src/index";
import { mountController } from "./controller";
import { FieldScene } from "./screen";

function startScreen(parent: HTMLElement, game: ScreenConnection<FarbfelderState>): void {
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
  const size = () => ({ width: Math.max(parent.clientWidth, 1) * dpr, height: Math.max(parent.clientHeight, 1) * dpr });
  const initial = size();
  const phaser = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: initial.width,
    height: initial.height,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    banner: false,
    audio: { noAudio: true },
    scene: new FieldScene(game, dpr),
  });
  new ResizeObserver(() => {
    const next = size();
    phaser.scale.resize(next.width, next.height);
    phaser.scale.setZoom(1 / dpr);
  }).observe(parent);
}

async function start(): Promise<void> {
  const field = document.getElementById("field");
  const controller = document.getElementById("controller");
  if (field === null || controller === null) {
    return;
  }
  try {
    const game = await connect<FarbfelderState, FarbfelderAction>({ screen: true });
    if (game.role === "screen") {
      document.body.classList.add("screen");
      startScreen(field, game);
    } else {
      document.body.classList.add("controller");
      mountController(controller, game);
    }
  } catch (error) {
    const fallback = document.getElementById("fallback");
    if (fallback !== null) {
      fallback.textContent = `Dieses Spiel läuft nur in Gamehearth. Zum Ausprobieren: npm run dev. ${error instanceof Error ? error.message : ""}`;
      fallback.hidden = false;
    }
  }
}

void start();
