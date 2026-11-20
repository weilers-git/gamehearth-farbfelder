import type { PlayerInfo, PlayerSnapshot, ScreenSnapshot } from "@gamehearth/sdk/client";
import {
  blobCooldownTicks,
  countCells,
  gridHeight,
  gridWidth,
  stepsPerCell,
  type Direction,
  type FarbfelderAction,
  type Figure,
  type Point,
  type Public,
  type Size,
} from "../../src/index";

export type Snapshot = PlayerSnapshot<Public, Record<string, never>, FarbfelderAction>;
export type Screen = ScreenSnapshot<Public>;

export const seatColors: readonly { color: number; name: string }[] = [
  { color: 0xf5c542, name: "Gelb" },
  { color: 0x3d8bfd, name: "Blau" },
  { color: 0x4cc38a, name: "Grün" },
  { color: 0xe5484d, name: "Rot" },
  { color: 0xa070f0, name: "Lila" },
  { color: 0xf2853d, name: "Orange" },
  { color: 0x2ec4d6, name: "Türkis" },
  { color: 0xff9ecf, name: "Rosa" },
];

export function seatColor(seat: string, seats: readonly string[]): { color: number; name: string } {
  const index = seats.indexOf(seat);
  return seatColors[(index < 0 ? 0 : index) % seatColors.length] ?? { color: 0xffffff, name: "Weiß" };
}

export function markColor(mark: string): number | undefined {
  const index = mark.charCodeAt(0) - 49;
  return index >= 0 && index < seatColors.length ? seatColors[index]?.color : undefined;
}

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function nameOf(seat: string, players: Record<string, PlayerInfo>): string {
  return players[seat]?.name ?? seat;
}

export function lerp(a: number, b: number, alpha: number): number {
  return a + (b - a) * alpha;
}

export function figureCell(figure: Figure): Point {
  return { x: figure.x / stepsPerCell, y: figure.y / stepsPerCell };
}

export function blendFigures(from: Public, to: Public, alpha: number): Record<string, Point> {
  const result: Record<string, Point> = {};
  for (const [seat, figure] of Object.entries(to.figures)) {
    const target = figureCell(figure);
    const before = from.figures[seat];
    const start = before === undefined ? target : figureCell(before);
    const jump = Math.abs(target.x - start.x) + Math.abs(target.y - start.y) > 2;
    result[seat] = jump ? target : { x: lerp(start.x, target.x, alpha), y: lerp(start.y, target.y, alpha) };
  }
  return result;
}

export interface Fit {
  scale: number;
  left: number;
  top: number;
}

export function fitField(fieldWidth: number, fieldHeight: number, width: number, height: number, margin: number): Fit {
  const scale = Math.max(0.01, Math.min((width - 2 * margin) / fieldWidth, (height - 2 * margin) / fieldHeight));
  return { scale, left: (width - fieldWidth * scale) / 2, top: (height - fieldHeight * scale) / 2 };
}

export interface ScreenLayout {
  headerTop: number;
  headerHeight: number;
  field: Fit;
  board: { left: number; top: number; width: number; rowHeight: number };
}

export function screenLayout(width: number, height: number, u: number, grid: Size = { width: gridWidth, height: gridHeight }): ScreenLayout {
  const headerHeight = 64 * u;
  const margin = 16 * u;
  const boardWidth = Math.min(Math.max(width * 0.2, 200 * u), 320 * u);
  const fitted = fitField(grid.width, grid.height, width - boardWidth, height - headerHeight, margin);
  const slack = Math.max(0, height - headerHeight - 2 * margin - grid.height * fitted.scale);
  const headerTop = slack / 2;
  const field = { scale: fitted.scale, left: fitted.left, top: headerTop + headerHeight + margin };
  const rowHeight = Math.min(48 * u, Math.max(24 * u, (grid.height * field.scale) / 9));
  return { headerTop, headerHeight, field, board: { left: width - boardWidth, top: field.top, width: boardWidth - margin, rowHeight } };
}

export function clock(ticksLeft: number): string {
  const seconds = Math.max(0, Math.ceil(ticksLeft / 20));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export function hurry(ticksLeft: number): boolean {
  return ticksLeft <= 10 * 20;
}

export function cellsLabel(count: number): string {
  return count === 1 ? "1 Kästchen" : `${count} Kästchen`;
}

export interface Standing {
  seat: string;
  name: string;
  count: number;
  color: number;
}

export function ranking(view: Public, seats: readonly string[], players: Record<string, PlayerInfo>): Standing[] {
  const counts = countCells(view.grid, seats.length);
  return seats
    .map((seat, index) => ({ seat, index, name: nameOf(seat, players), count: counts[index] ?? 0, color: seatColor(seat, seats).color }))
    .sort((a, b) => b.count - a.count || a.index - b.index)
    .map(({ seat, name, count, color }) => ({ seat, name, count, color }));
}

export function finalLines(standings: readonly Standing[]): string[] {
  return standings.map((entry) => {
    const rank = 1 + standings.filter((other) => other.count > entry.count).length;
    return `${rank}. ${entry.name}: ${cellsLabel(entry.count)}`;
  });
}

export function place(seat: string, view: Public, seats: readonly string[]): number {
  const counts = countCells(view.grid, seats.length);
  const mine = counts[seats.indexOf(seat)] ?? 0;
  return 1 + counts.filter((count) => count > mine).length;
}

export function listNames(names: readonly string[]): string {
  if (names.length <= 1) {
    return names[0] ?? "";
  }
  return `${names.slice(0, -1).join(", ")} und ${names.at(-1)}`;
}

export function resultLine(winners: readonly string[], view: Public, seats: readonly string[], players: Record<string, PlayerInfo>): string {
  if (winners.length === 0) {
    return "Niemand gewinnt";
  }
  const counts = countCells(view.grid, seats.length);
  const best = counts[seats.indexOf(winners[0]!)] ?? 0;
  const names = winners.map((seat) => nameOf(seat, players));
  return names.length === 1
    ? `${names[0]} gewinnt mit ${cellsLabel(best)}!`
    : `Gleichstand! ${listNames(names)} gewinnen mit je ${cellsLabel(best)}.`;
}

export interface BlobStatus {
  ready: boolean;
  label: string;
  progress: number;
}

export function blobStatus(blobWait: number): BlobStatus {
  if (blobWait <= 0) {
    return { ready: true, label: "Klecks!", progress: 1 };
  }
  return { ready: false, label: `Klecks in ${Math.ceil(blobWait / 20)} s`, progress: 1 - blobWait / blobCooldownTicks };
}

export const splashTicks = 8;

export function splashStrength(figure: Figure): number {
  const since = blobCooldownTicks - figure.blobWait;
  return figure.blobWait > 0 && since < splashTicks ? 1 - since / splashTicks : 0;
}

export interface ControllerView {
  name: string;
  color: number;
  colorName: string;
  cells: string;
  status: string;
  blob: BlobStatus;
  canBlob: boolean;
  over: boolean;
  announcement: string;
}

export function controllerView(snapshot: Snapshot, players: Record<string, PlayerInfo>): ControllerView {
  const seat = snapshot.player;
  const seats = snapshot.players;
  const view = snapshot.public;
  const counts = countCells(view.grid, seats.length);
  const own = seatColor(seat, seats);
  const figure = view.figures[seat];
  const canBlob = snapshot.moves.some((move) => move.type === "blob");
  const status = controllerStatus(snapshot, players);
  return {
    name: nameOf(seat, players),
    color: own.color,
    colorName: own.name,
    cells: cellsLabel(counts[seats.indexOf(seat)] ?? 0),
    status,
    blob: snapshot.result === undefined ? blobStatus(figure?.blobWait ?? 0) : { ready: false, label: "Runde vorbei", progress: 0 },
    canBlob,
    over: snapshot.result !== undefined,
    announcement: snapshot.result === undefined ? "" : status,
  };
}

export function controllerStatus(snapshot: Snapshot, players: Record<string, PlayerInfo>): string {
  const seat = snapshot.player;
  const seats = snapshot.players;
  const result = snapshot.result;
  if (result !== undefined) {
    if (!result.winners.includes(seat)) {
      return resultLine(result.winners, snapshot.public, seats, players);
    }
    const others = result.winners.filter((winner) => winner !== seat).map((winner) => nameOf(winner, players));
    return others.length === 0 ? "Du gewinnst!" : `Gleichstand! Du gewinnst zusammen mit ${listNames(others)}.`;
  }
  return `Platz ${place(seat, snapshot.public, seats)} von ${seats.length} · noch ${clock(snapshot.public.ticksLeft)}`;
}

export function padDirection(dx: number, dy: number, deadZone: number): Direction {
  if (dx * dx + dy * dy < deadZone * deadZone) {
    return "none";
  }
  if (Math.abs(dx) > Math.abs(dy)) {
    return dx < 0 ? "left" : "right";
  }
  return dy < 0 ? "up" : "down";
}

export const keyDirections: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  s: "down",
  a: "left",
  d: "right",
  W: "up",
  S: "down",
  A: "left",
  D: "right",
};

export const blobKeys: readonly string[] = [" ", "k", "K"];

export function steer(dir: Direction): FarbfelderAction {
  return { type: "steer", dir };
}

export function blob(): FarbfelderAction {
  return { type: "blob" };
}

export function pressKey(keys: readonly Direction[], dir: Direction): Direction[] {
  return [...keys.filter((key) => key !== dir), dir];
}

export function releaseKey(keys: readonly Direction[], dir: Direction): Direction[] {
  return keys.filter((key) => key !== dir);
}

export function topKey(keys: readonly Direction[]): Direction {
  return keys.at(-1) ?? "none";
}

export function needsResend(snapshot: Snapshot, held: Direction, pending: number): boolean {
  return (
    pending === 0 &&
    snapshot.result === undefined &&
    snapshot.public.figures[snapshot.player]?.dir !== held &&
    snapshot.moves.some((move) => move.type === "steer" && move.dir === held)
  );
}
