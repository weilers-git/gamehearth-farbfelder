import Phaser from "phaser";
import { createTimeline, type ScreenConnection, type Timeline } from "@gamehearth/sdk/client";
import { blobCells, gridHeight, gridWidth, type FarbfelderState } from "../../src/index";
import {
  blendFigures,
  clock,
  finalLines,
  hurry,
  markColor,
  nameOf,
  ranking,
  resultLine,
  screenLayout,
  seatColor,
  splashStrength,
  type Screen,
  type ScreenLayout,
} from "./view";

const font = "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif";
const colors = {
  background: 0x141c28,
  gap: 0x101722,
  empty: 0x263449,
  token: 0xffffff,
  tokenEdge: 0x0f1520,
  text: "#f3f0ea",
  muted: "#a9b4c6",
  hurry: "#ff7a6b",
  shade: 0x0b1018,
};
const maxSeats = 8;

export class FieldScene extends Phaser.Scene {
  readonly #game: ScreenConnection<FarbfelderState>;
  readonly #u: number;
  #timeline!: Timeline<Screen>;
  #cells!: Phaser.GameObjects.Graphics;
  #figures!: Phaser.GameObjects.Graphics;
  #overlay!: Phaser.GameObjects.Graphics;
  #labels: Phaser.GameObjects.Text[] = [];
  #boardTitle!: Phaser.GameObjects.Text;
  #boardNames: Phaser.GameObjects.Text[] = [];
  #boardCounts: Phaser.GameObjects.Text[] = [];
  #title!: Phaser.GameObjects.Text;
  #clock!: Phaser.GameObjects.Text;
  #result!: Phaser.GameObjects.Text;
  #resultList!: Phaser.GameObjects.Text;
  #drawnGrid = "";
  #drawnSize = "";
  #sizes = new Map<Phaser.GameObjects.Text, number>();
  #colors = new Map<Phaser.GameObjects.Text, string>();

  constructor(game: ScreenConnection<FarbfelderState>, dpr: number) {
    super("field");
    this.#game = game;
    this.#u = dpr;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(colors.background);
    this.#timeline = createTimeline(this.#game);
    this.#cells = this.add.graphics();
    this.#figures = this.add.graphics();
    for (let i = 0; i < maxSeats; i++) {
      this.#labels.push(this.#text(colors.text, 14, "700").setOrigin(0.5, 1));
    }
    this.#title = this.#text(colors.text, 26, "700").setOrigin(0, 0.5).setText("Farbfelder");
    this.#clock = this.#text(colors.text, 34, "700").setOrigin(0.5, 0.5);
    this.#boardTitle = this.#text(colors.muted, 16, "600").setOrigin(0, 1).setText("Kästchen");
    for (let i = 0; i < maxSeats; i++) {
      this.#boardNames.push(this.#text(colors.text, 20, "600").setOrigin(0, 0.5));
      this.#boardCounts.push(this.#text(colors.text, 20, "700").setOrigin(1, 0.5));
    }
    this.#overlay = this.add.graphics();
    this.#result = this.#text(colors.text, 40, "700").setOrigin(0.5, 1).setAlign("center");
    this.#resultList = this.#text(colors.text, 24, "600").setOrigin(0.5, 0).setAlign("center");
  }

  override update(): void {
    const frame = this.#timeline.frame();
    if (frame === undefined) {
      return;
    }
    const u = this.#u;
    const { width, height } = this.scale;
    const players = this.#game.current.players;
    const seats = frame.to.players;
    const view = frame.to.public;
    const layout = screenLayout(width, height, u);
    const { field } = layout;

    this.#drawCells(view.grid, layout, `${width}x${height}`);

    const g = this.#figures;
    g.clear();
    for (const seat of seats) {
      const figure = view.figures[seat];
      const strength = figure === undefined ? 0 : splashStrength(figure);
      if (figure === undefined || strength <= 0) {
        continue;
      }
      g.fillStyle(0xffffff, 0.55 * strength);
      for (const cell of blobCells({ x: figure.blobX, y: figure.blobY })) {
        g.fillRect(field.left + cell.x * field.scale, field.top + cell.y * field.scale, field.scale, field.scale);
      }
    }

    const positions = blendFigures(frame.from.public, view, frame.alpha);
    const labelSize = Math.max(13 * u, field.scale * 0.42);
    this.#labels.forEach((label, index) => {
      const seat = seats[index];
      const point = seat === undefined ? undefined : positions[seat];
      label.setVisible(point !== undefined);
      if (seat === undefined || point === undefined) {
        return;
      }
      const x = field.left + (point.x + 0.5) * field.scale;
      const y = field.top + (point.y + 0.5) * field.scale;
      g.fillStyle(colors.token, 1);
      g.fillCircle(x, y, field.scale * 0.5);
      g.fillStyle(colors.tokenEdge, 1);
      g.fillCircle(x, y, field.scale * 0.41);
      g.fillStyle(seatColor(seat, seats).color, 1);
      g.fillCircle(x, y, field.scale * 0.31);
      this.#resize(label, labelSize, (text, size) => text.setStroke("#0f1520", Math.max(3 * u, size * 0.22)))
        .setText(nameOf(seat, players))
        .setPosition(x, y - field.scale * 0.55);
    });

    this.#title.setPosition(field.left, layout.headerTop + layout.headerHeight / 2 + 4 * u);
    this.#recolor(this.#clock, hurry(view.ticksLeft) && frame.to.result === undefined ? colors.hurry : colors.text)
      .setText(clock(view.ticksLeft))
      .setPosition(field.left + (gridWidth * field.scale) / 2, layout.headerTop + layout.headerHeight / 2 + 4 * u);

    const standings = ranking(view, seats, players);
    const { board } = layout;
    this.#boardTitle.setPosition(board.left, board.top - 6 * u);
    const nameSize = Math.min(22 * u, board.rowHeight * 0.5);
    this.#boardNames.forEach((text, index) => {
      const entry = standings[index];
      const count = this.#boardCounts[index]!;
      text.setVisible(entry !== undefined);
      count.setVisible(entry !== undefined);
      if (entry === undefined) {
        return;
      }
      const rowY = board.top + (index + 0.5) * board.rowHeight;
      const swatch = board.rowHeight * 0.55;
      g.fillStyle(entry.color, 1);
      g.fillRoundedRect(board.left, rowY - swatch / 2, swatch, swatch, 4 * u);
      this.#resize(text, nameSize)
        .setText(entry.name)
        .setPosition(board.left + swatch + 10 * u, rowY);
      this.#resize(count, nameSize).setText(String(entry.count)).setPosition(board.left + board.width, rowY);
    });

    const o = this.#overlay;
    o.clear();
    const result = frame.to.result;
    if (result === undefined) {
      this.#result.setText("");
      this.#resultList.setText("");
      return;
    }
    const fieldWidth = gridWidth * field.scale;
    const fieldHeight = gridHeight * field.scale;
    const centerX = field.left + fieldWidth / 2;
    const splitY = field.top + fieldHeight * 0.36;
    o.fillStyle(colors.shade, 0.75);
    o.fillRect(field.left, field.top, fieldWidth, fieldHeight);
    this.#resize(this.#result, Math.max(24 * u, field.scale * 1.1), (text) => text.setWordWrapWidth(fieldWidth * 0.9))
      .setText(resultLine(result.winners, view, seats, players))
      .setPosition(centerX, splitY);
    this.#resize(this.#resultList, Math.max(15 * u, field.scale * 0.55), (text) => text.setLineSpacing(field.scale * 0.15))
      .setText(finalLines(standings).join("\n"))
      .setPosition(centerX, splitY + field.scale * 0.8);
  }

  #drawCells(grid: string, layout: ScreenLayout, size: string): void {
    if (grid === this.#drawnGrid && size === this.#drawnSize) {
      return;
    }
    this.#drawnGrid = grid;
    this.#drawnSize = size;
    const { field } = layout;
    const g = this.#cells;
    const gap = Math.max(1, field.scale * 0.06);
    g.clear();
    g.fillStyle(colors.gap, 1);
    g.fillRect(field.left - gap, field.top - gap, gridWidth * field.scale + gap, gridHeight * field.scale + gap);
    for (let y = 0; y < gridHeight; y++) {
      for (let x = 0; x < gridWidth; x++) {
        const mark = grid[y * gridWidth + x] ?? "0";
        g.fillStyle(markColor(mark) ?? colors.empty, 1);
        g.fillRect(field.left + x * field.scale, field.top + y * field.scale, field.scale - gap, field.scale - gap);
      }
    }
  }

  #resize(
    text: Phaser.GameObjects.Text,
    size: number,
    restyle?: (text: Phaser.GameObjects.Text, size: number) => void,
  ): Phaser.GameObjects.Text {
    const rounded = Math.round(size);
    if (this.#sizes.get(text) !== rounded) {
      this.#sizes.set(text, rounded);
      text.setFontSize(rounded);
      restyle?.(text, rounded);
    }
    return text;
  }

  #recolor(text: Phaser.GameObjects.Text, color: string): Phaser.GameObjects.Text {
    if (this.#colors.get(text) !== color) {
      this.#colors.set(text, color);
      text.setColor(color);
    }
    return text;
  }

  #text(color: string, size: number, weight: string): Phaser.GameObjects.Text {
    return this.add.text(0, 0, "", { fontFamily: font, fontSize: `${size * this.#u}px`, fontStyle: weight, color });
  }
}
