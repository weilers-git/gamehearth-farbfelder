import { defineGame, type GameState, type PlayerId } from "@gamehearth/sdk";

export const gridWidth = 32;
export const gridHeight = 18;
export const stepsPerCell = 3;
export const roundTicks = 90 * 20;
export const blobCooldownTicks = 8 * 20;
export const blobRadius = 1;
export const emptyCell = "0";

export const directions = ["up", "down", "left", "right", "none"] as const;
export type Direction = (typeof directions)[number];

export interface Point {
  x: number;
  y: number;
}

export interface Figure {
  x: number;
  y: number;
  dir: Direction;
  next: Direction;
  heading: Direction;
  blobWait: number;
  blobX: number;
  blobY: number;
}

export interface Public {
  grid: string;
  figures: Record<PlayerId, Figure>;
  ticksLeft: number;
}

export type FarbfelderState = GameState<Public, Record<string, never>, Record<string, never>>;

export type FarbfelderAction = { type: "steer"; dir: Direction } | { type: "blob" };

const steps: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  none: { x: 0, y: 0 },
};

const opposite: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left", none: "none" };

export function cellOf(units: number): number {
  return Math.floor((units + Math.floor(stepsPerCell / 2)) / stepsPerCell);
}

export function cellIndex(x: number, y: number): number {
  return y * gridWidth + x;
}

export function insideGrid(x: number, y: number): boolean {
  return x >= 0 && x < gridWidth && y >= 0 && y < gridHeight;
}

export function ownerMark(seatIndex: number): string {
  return String(seatIndex + 1);
}

export function startCell(index: number, count: number): Point {
  const rows = count <= 4 ? 1 : 2;
  const firstRow = Math.ceil(count / rows);
  const row = index < firstRow ? 0 : 1;
  const inRow = row === 0 ? firstRow : count - firstRow;
  const column = row === 0 ? index : index - firstRow;
  return {
    x: Math.floor(((column + 1) * gridWidth) / (inRow + 1)),
    y: Math.floor(((row + 1) * gridHeight) / (rows + 1)),
  };
}

export function countCells(grid: string, seatCount: number): number[] {
  const counts = new Array<number>(seatCount).fill(0);
  for (let i = 0; i < grid.length; i++) {
    const owner = grid.charCodeAt(i) - 49;
    if (owner >= 0 && owner < seatCount) {
      counts[owner] = (counts[owner] ?? 0) + 1;
    }
  }
  return counts;
}

export function blobCells(center: Point): Point[] {
  const cells: Point[] = [];
  for (let dy = -blobRadius; dy <= blobRadius; dy++) {
    for (let dx = -blobRadius; dx <= blobRadius; dx++) {
      const x = center.x + dx;
      const y = center.y + dy;
      if (insideGrid(x, y)) {
        cells.push({ x, y });
      }
    }
  }
  return cells;
}

function paint(grid: string, cells: { index: number; mark: string }[]): string {
  if (cells.length === 0) {
    return grid;
  }
  const chars = grid.split("");
  for (const cell of cells) {
    chars[cell.index] = cell.mark;
  }
  return chars.join("");
}

function aligned(figure: Figure): boolean {
  return figure.x % stepsPerCell === 0 && figure.y % stepsPerCell === 0;
}

export const farbfelder = defineGame<FarbfelderState, FarbfelderAction>({
  setup({ players }) {
    const figures: Record<PlayerId, Figure> = {};
    const starts: { index: number; mark: string }[] = [];
    players.forEach((player, index) => {
      const start = startCell(index, players.length);
      figures[player] = {
        x: start.x * stepsPerCell,
        y: start.y * stepsPerCell,
        dir: "none",
        next: "none",
        heading: "none",
        blobWait: 0,
        blobX: start.x,
        blobY: start.y,
      };
      starts.push({ index: cellIndex(start.x, start.y), mark: ownerMark(index) });
    });
    return {
      public: { grid: paint(emptyCell.repeat(gridWidth * gridHeight), starts), figures, ticksLeft: roundTicks },
      players: Object.fromEntries(players.map((player) => [player, {}])),
      secret: {},
    };
  },

  legalMoves(state, player) {
    if (state.public.ticksLeft <= 0) {
      return [];
    }
    const moves: FarbfelderAction[] = directions.map((dir) => ({ type: "steer", dir }));
    if (state.public.figures[player]?.blobWait === 0) {
      moves.push({ type: "blob" });
    }
    return moves;
  },

  apply(state, action, { player, players }) {
    const figure = state.public.figures[player]!;
    if (action.type === "steer") {
      figure.dir = action.dir;
      if (action.dir !== "none") {
        figure.next = action.dir;
      }
      return;
    }
    const center = { x: cellOf(figure.x), y: cellOf(figure.y) };
    const mark = ownerMark(players.indexOf(player));
    state.public.grid = paint(
      state.public.grid,
      blobCells(center).map((cell) => ({ index: cellIndex(cell.x, cell.y), mark })),
    );
    figure.blobWait = blobCooldownTicks;
    figure.blobX = center.x;
    figure.blobY = center.y;
  },

  tick(state, _dt, { players, random }) {
    const view = state.public;
    const painters: Record<number, string[]> = {};
    players.forEach((player, index) => {
      const figure = view.figures[player]!;
      if (figure.blobWait > 0) {
        figure.blobWait -= 1;
      }
      if (figure.heading !== "none" && figure.dir === opposite[figure.heading]) {
        figure.heading = figure.dir;
      }
      if (aligned(figure)) {
        const wish = figure.dir !== "none" ? figure.dir : figure.next;
        figure.next = "none";
        const step = steps[wish];
        const target = { x: figure.x / stepsPerCell + step.x, y: figure.y / stepsPerCell + step.y };
        figure.heading = wish !== "none" && insideGrid(target.x, target.y) ? wish : "none";
      }
      if (figure.heading === "none") {
        return;
      }
      const before = cellIndex(cellOf(figure.x), cellOf(figure.y));
      figure.x += steps[figure.heading].x;
      figure.y += steps[figure.heading].y;
      const after = cellIndex(cellOf(figure.x), cellOf(figure.y));
      if (after !== before) {
        const marks = painters[after] ?? [];
        marks.push(ownerMark(index));
        painters[after] = marks;
      }
    });
    const cells: { index: number; mark: string }[] = [];
    for (const [index, marks] of Object.entries(painters)) {
      cells.push({ index: Number(index), mark: marks.length === 1 ? marks[0]! : random.pick(marks) });
    }
    view.grid = paint(view.grid, cells);
    view.ticksLeft -= 1;
  },

  result(state) {
    if (state.public.ticksLeft > 0) {
      return undefined;
    }
    const seats = Object.keys(state.public.figures);
    const counts = countCells(state.public.grid, seats.length);
    const best = Math.max(...counts);
    return { winners: seats.filter((_, index) => counts[index] === best) };
  },
});
