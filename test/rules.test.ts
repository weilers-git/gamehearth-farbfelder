import { createMatch, stepMatch, tickMs, type Match } from "@gamehearth/sdk/platform";
import { describe, expect, it } from "vitest";
import farbfelder, {
  blobCooldownTicks,
  cellIndex,
  countCells,
  emptyCell,
  gridHeight,
  gridWidth,
  roundTicks,
  startCell,
  stepsPerCell,
  type Direction,
  type FarbfelderAction,
  type FarbfelderState,
} from "../src/index";

type FarbMatch = Match<FarbfelderState, FarbfelderAction>;
type Input = { player: string; action: FarbfelderAction };

function start(players = 2, seed = "farbfelder"): FarbMatch {
  const created = createMatch(farbfelder, { playerCount: players, seed });
  if (!created.ok) {
    throw new Error(created.error.message);
  }
  return created.match;
}

function step(match: FarbMatch, inputs: Input[] = [], times = 1): FarbMatch {
  let current = match;
  for (let i = 0; i < times; i++) {
    const outcome = stepMatch(farbfelder, current, { inputs: i === 0 ? inputs : [], now: 0, dt: tickMs });
    if (!outcome.ok) {
      throw new Error(outcome.error.message);
    }
    for (const result of outcome.results) {
      if (!result.ok) {
        throw new Error(`Eingabe abgelehnt: ${result.code}`);
      }
    }
    current = outcome.match;
  }
  return current;
}

function steer(player: string, dir: Direction): Input {
  const action: FarbfelderAction = { type: "steer", dir };
  return { player, action };
}

function blob(player: string): Input {
  const action: FarbfelderAction = { type: "blob" };
  return { player, action };
}

function placed(match: FarbMatch, changes: (state: FarbfelderState) => void): FarbMatch {
  const copy = JSON.parse(JSON.stringify(match)) as FarbMatch;
  changes(copy.state);
  return copy;
}

function owner(match: FarbMatch, x: number, y: number): string {
  return match.state.public.grid[cellIndex(x, y)] ?? "?";
}

function cell(match: FarbMatch, player: string): { x: number; y: number } {
  const figure = match.state.public.figures[player]!;
  return { x: figure.x / stepsPerCell, y: figure.y / stepsPerCell };
}

function put(state: FarbfelderState, player: string, x: number, y: number): void {
  const figure = state.public.figures[player]!;
  figure.x = x * stepsPerCell;
  figure.y = y * stepsPerCell;
}

function emptyField(state: FarbfelderState): void {
  state.public.grid = emptyCell.repeat(gridWidth * gridHeight);
}

describe("Farbfelder: Aufstellung", () => {
  it.each([2, 3, 4, 5, 6, 7, 8])("stellt %i Figuren auf verschiedene Startfelder und färbt jedes Startfeld", (players) => {
    const match = start(players);
    const view = match.state.public;
    expect(view.grid).toHaveLength(gridWidth * gridHeight);
    expect(view.ticksLeft).toBe(roundTicks);
    const starts = match.players.map((_, index) => startCell(index, players));
    expect(new Set(starts.map((point) => `${point.x},${point.y}`)).size).toBe(players);
    match.players.forEach((player, index) => {
      const point = starts[index]!;
      expect(point.x).toBeGreaterThanOrEqual(1);
      expect(point.x).toBeLessThan(gridWidth - 1);
      expect(point.y).toBeGreaterThanOrEqual(1);
      expect(point.y).toBeLessThan(gridHeight - 1);
      expect(cell(match, player)).toEqual(point);
      expect(owner(match, point.x, point.y)).toBe(String(index + 1));
      expect(view.figures[player]!.blobWait).toBe(0);
    });
    expect(countCells(view.grid, players)).toEqual(new Array(players).fill(1));
  });

  it("bietet jedem das Steuerkreuz und den Klecks an", () => {
    const match = start(2);
    expect(match.moves["p1"]).toContainEqual({ type: "blob" });
    expect(match.moves["p1"]).toContainEqual({ type: "steer", dir: "none" });
    expect(match.moves["p1"]).toHaveLength(6);
  });
});

describe("Farbfelder: Laufen", () => {
  it("läuft ein Kästchen alle drei Ticks, solange gedrückt ist, und färbt jedes betretene Kästchen", () => {
    let match = placed(start(2), (state) => {
      emptyField(state);
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "right")], stepsPerCell);
    expect(cell(match, "p1")).toEqual({ x: 6, y: 5 });
    expect(owner(match, 6, 5)).toBe("1");
    match = step(match, [], stepsPerCell * 3);
    expect(cell(match, "p1")).toEqual({ x: 9, y: 5 });
    expect([7, 8, 9].map((x) => owner(match, x, 5))).toEqual(["1", "1", "1"]);
    expect(owner(match, 10, 5)).toBe(emptyCell);
  });

  it("übermalt Kästchen, die vorher jemand anderem gehörten", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
      state.public.grid = state.public.grid.slice(0, cellIndex(6, 5)) + "2" + state.public.grid.slice(cellIndex(6, 5) + 1);
    });
    expect(owner(match, 6, 5)).toBe("2");
    match = step(match, [steer("p1", "right")], stepsPerCell);
    expect(owner(match, 6, 5)).toBe("1");
  });

  it("bleibt nach dem Loslassen auf dem nächsten Kästchen stehen", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "down")], 1);
    match = step(match, [steer("p1", "none")], stepsPerCell * 4);
    expect(cell(match, "p1")).toEqual({ x: 5, y: 6 });
  });

  it("macht bei kurzem Antippen genau einen Schritt", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "left"), steer("p1", "none")], stepsPerCell * 4);
    expect(cell(match, "p1")).toEqual({ x: 4, y: 5 });
  });

  it("merkt sich ein Antippen während eines Schritts und läuft danach dorthin", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "right")], 1);
    match = step(match, [steer("p1", "up"), steer("p1", "none")], stepsPerCell * 4);
    expect(cell(match, "p1")).toEqual({ x: 6, y: 4 });
  });

  it("kann mitten im Schritt umkehren", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "right")], 1);
    match = step(match, [steer("p1", "left")], 1);
    expect(match.state.public.figures["p1"]).toMatchObject({ x: 5 * stepsPerCell, heading: "left" });
  });

  it("bleibt am Rand stehen und läuft nicht aus dem Feld", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 0, 0);
      put(state, "p2", gridWidth - 1, gridHeight - 1);
    });
    match = step(match, [steer("p1", "left"), steer("p2", "down")], stepsPerCell * 3);
    expect(cell(match, "p1")).toEqual({ x: 0, y: 0 });
    expect(cell(match, "p2")).toEqual({ x: gridWidth - 1, y: gridHeight - 1 });
    match = step(match, [steer("p1", "up"), steer("p2", "right")], stepsPerCell * 3);
    expect(cell(match, "p1")).toEqual({ x: 0, y: 0 });
    expect(cell(match, "p2")).toEqual({ x: gridWidth - 1, y: gridHeight - 1 });
  });

  it("lässt Figuren durcheinander durchlaufen", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
      put(state, "p2", 6, 5);
    });
    match = step(match, [steer("p1", "right")], stepsPerCell);
    expect(cell(match, "p1")).toEqual({ x: 6, y: 5 });
    expect(owner(match, 6, 5)).toBe("1");
  });

  it("gibt ein Kästchen, das zwei im selben Augenblick betreten, per Zufall einem von beiden", () => {
    const winners = new Set<string>();
    for (let seed = 0; seed < 30; seed++) {
      let match = placed(start(2, `gleichzeitig-${seed}`), (state) => {
        emptyField(state);
        put(state, "p1", 4, 5);
        put(state, "p2", 6, 5);
      });
      match = step(match, [steer("p1", "right"), steer("p2", "left")], stepsPerCell);
      expect(cell(match, "p1")).toEqual({ x: 5, y: 5 });
      expect(cell(match, "p2")).toEqual({ x: 5, y: 5 });
      winners.add(owner(match, 5, 5));
    }
    expect([...winners].sort()).toEqual(["1", "2"]);
  });
});

describe("Farbfelder: Klecks", () => {
  it("färbt die 3×3 Kästchen um die Figur, auch fremde", () => {
    let match = placed(start(2), (state) => {
      emptyField(state);
      put(state, "p1", 10, 10);
      state.public.grid = state.public.grid.slice(0, cellIndex(11, 11)) + "2" + state.public.grid.slice(cellIndex(11, 11) + 1);
    });
    match = step(match, [blob("p1")]);
    for (let y = 9; y <= 11; y++) {
      for (let x = 9; x <= 11; x++) {
        expect(owner(match, x, y)).toBe("1");
      }
    }
    expect(owner(match, 12, 10)).toBe(emptyCell);
    expect(owner(match, 10, 8)).toBe(emptyCell);
    expect(countCells(match.state.public.grid, 2)).toEqual([9, 0]);
  });

  it("färbt in der Ecke nur die Kästchen, die im Feld liegen", () => {
    let match = placed(start(2), (state) => {
      emptyField(state);
      put(state, "p1", 0, 0);
    });
    match = step(match, [blob("p1")]);
    expect(countCells(match.state.public.grid, 2)).toEqual([4, 0]);
  });

  it("muss danach 8 Sekunden warten, bis es wieder geht", () => {
    let match = step(start(2), [blob("p1")]);
    expect(match.state.public.figures["p1"]!.blobWait).toBe(blobCooldownTicks - 1);
    expect(match.moves["p1"]).not.toContainEqual({ type: "blob" });
    expect(match.moves["p2"]).toContainEqual({ type: "blob" });
    match = step(match, [], blobCooldownTicks - 2);
    expect(match.moves["p1"]).not.toContainEqual({ type: "blob" });
    match = step(match, [], 1);
    expect(match.state.public.figures["p1"]!.blobWait).toBe(0);
    expect(match.moves["p1"]).toContainEqual({ type: "blob" });
  });

  it("klappt auch im Laufen und merkt sich, wo gekleckst wurde", () => {
    let match = placed(start(2), (state) => {
      put(state, "p1", 5, 5);
    });
    match = step(match, [steer("p1", "right")], 2);
    match = step(match, [blob("p1")]);
    expect(match.state.public.figures["p1"]).toMatchObject({ blobX: 6, blobY: 5 });
    expect(owner(match, 7, 6)).toBe("1");
  });

  it("lässt bei zwei Klecksen im selben Augenblick den späteren gewinnen", () => {
    let match = placed(start(2), (state) => {
      emptyField(state);
      put(state, "p1", 10, 10);
      put(state, "p2", 11, 10);
    });
    match = step(match, [blob("p1"), blob("p2")]);
    expect(owner(match, 10, 10)).toBe("2");
    expect(owner(match, 9, 10)).toBe("1");
    expect(owner(match, 12, 10)).toBe("2");
  });
});

describe("Farbfelder: Ende", () => {
  it("dauert 90 Sekunden", () => {
    let match = start(2);
    match = step(match, [], roundTicks - 1);
    expect(match.result).toBeUndefined();
    match = step(match, [], 1);
    expect(match.result).toBeDefined();
    expect(match.moves).toEqual({ p1: [], p2: [] });
  });

  it("lässt den mit den meisten Kästchen gewinnen", () => {
    let match = placed(start(3), (state) => {
      state.public.ticksLeft = 1;
      state.public.grid = "1".repeat(10) + "2".repeat(12) + "3".repeat(11) + emptyCell.repeat(gridWidth * gridHeight - 33);
    });
    match = step(match);
    expect(match.result).toEqual({ winners: ["p2"] });
  });

  it("lässt bei Gleichstand alle mit den meisten Kästchen gewinnen", () => {
    let match = placed(start(4), (state) => {
      state.public.ticksLeft = 1;
      state.public.grid = "1".repeat(7) + "2".repeat(3) + "3".repeat(7) + "4".repeat(5) + emptyCell.repeat(gridWidth * gridHeight - 22);
    });
    match = step(match);
    expect(match.result).toEqual({ winners: ["p1", "p3"] });
  });

  it("zählt die Kästchen pro Spieler", () => {
    expect(countCells("0120210", 3)).toEqual([2, 2, 0]);
    expect(countCells("", 2)).toEqual([0, 0]);
  });
});
