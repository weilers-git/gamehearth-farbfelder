import { describe, expect, it } from "vitest";
import {
  blendFigures,
  blobStatus,
  cellsLabel,
  clock,
  controllerStatus,
  controllerView,
  finalLines,
  fitField,
  hurry,
  listNames,
  markColor,
  needsResend,
  padDirection,
  pressKey,
  releaseKey,
  steer,
  topKey,
  place,
  ranking,
  resultLine,
  screenLayout,
  seatColor,
  seatColors,
  splashStrength,
  type Snapshot,
} from "../client/src/view";
import { blobCooldownTicks, emptyCell, gridHeight, gridWidth, stepsPerCell, type Figure, type FarbfelderAction, type Public } from "../src/index";

const players = {
  p1: { name: "Anna", connected: true, you: true },
  p2: { name: "Ben", connected: true, you: false },
  p3: { name: "Clara", connected: true, you: false },
};
const seats = ["p1", "p2", "p3"];

function figure(x: number, y: number, changes: Partial<Figure> = {}): Figure {
  return { x: x * stepsPerCell, y: y * stepsPerCell, dir: "none", next: "none", heading: "none", blobWait: 0, blobX: x, blobY: y, ...changes };
}

function grid(p1: number, p2: number, p3: number): string {
  return "1".repeat(p1) + "2".repeat(p2) + "3".repeat(p3) + emptyCell.repeat(gridWidth * gridHeight - p1 - p2 - p3);
}

function view(changes: Partial<Public> = {}): Public {
  return {
    grid: grid(5, 9, 5),
    figures: { p1: figure(2, 2), p2: figure(10, 5), p3: figure(20, 8) },
    ticksLeft: 1800,
    ...changes,
  };
}

function snapshot(changes: Partial<Snapshot> = {}): Snapshot {
  const moves: FarbfelderAction[] = [{ type: "steer", dir: "none" }, { type: "blob" }];
  return { player: "p1", players: seats, public: view(), me: {}, moves, version: 1, tick: 1, ...changes };
}

describe("Oberfläche von Farbfelder: Fernseher", () => {
  it("mischt Figuren zwischen zwei Ständen und rechnet in Kästchen, springt aber bei großen Sprüngen", () => {
    const from = view({ figures: { p1: figure(2, 2), p2: figure(10, 5), p3: figure(20, 8) } });
    const to = view({ figures: { p1: { ...figure(2, 2), x: 2 * stepsPerCell + 1 }, p2: figure(1, 1), p3: figure(20, 8) } });
    const blended = blendFigures(from, to, 0.5);
    expect(blended["p1"]!.x).toBeCloseTo(2 + 0.5 / stepsPerCell);
    expect(blended["p2"]).toEqual({ x: 1, y: 1 });
    expect(blended["p3"]).toEqual({ x: 20, y: 8 });
  });

  it("passt das Feld mit Rand in jede Fläche ein und zentriert es", () => {
    expect(fitField(400, 240, 840, 280, 20)).toEqual({ scale: 1, left: 220, top: 20 });
    expect(fitField(400, 240, 440, 1000, 20).scale).toBe(1);
  });

  it("lässt auf dem Fernseher Platz für Kopfzeile und Rangliste", () => {
    const layout = screenLayout(1920, 1080, 1);
    const { field, board } = layout;
    expect(field.top).toBeGreaterThanOrEqual(layout.headerHeight);
    expect(field.left + gridWidth * field.scale).toBeLessThanOrEqual(board.left);
    expect(field.top + gridHeight * field.scale).toBeLessThanOrEqual(1080);
    expect(board.left + board.width).toBeLessThanOrEqual(1920);
    expect(board.rowHeight * 8).toBeLessThanOrEqual(gridHeight * field.scale);
    expect(field.scale).toBeGreaterThan(40);
  });

  it("hält Kopfzeile und Feld auch auf hohen Bildschirmen beisammen und zentriert beide", () => {
    const layout = screenLayout(1400, 1200, 1);
    const gapBelowHeader = layout.field.top - (layout.headerTop + layout.headerHeight);
    expect(gapBelowHeader).toBe(16);
    const below = 1200 - (layout.field.top + gridHeight * layout.field.scale);
    expect(Math.abs(below - 16 - layout.headerTop)).toBeLessThan(0.001);
    expect(screenLayout(1920, 1080, 1).headerTop).toBeGreaterThanOrEqual(0);
  });

  it("zeigt die Restzeit als Minuten und Sekunden und warnt in den letzten 10 Sekunden", () => {
    expect(clock(1800)).toBe("1:30");
    expect(clock(1199)).toBe("1:00");
    expect(clock(19)).toBe("0:01");
    expect(clock(0)).toBe("0:00");
    expect(hurry(201)).toBe(false);
    expect(hurry(200)).toBe(true);
  });

  it("sortiert die Rangliste nach Kästchen, bei Gleichstand nach Sitz", () => {
    expect(ranking(view(), seats, players)).toEqual([
      { seat: "p2", name: "Ben", count: 9, color: seatColors[1]!.color },
      { seat: "p1", name: "Anna", count: 5, color: seatColors[0]!.color },
      { seat: "p3", name: "Clara", count: 5, color: seatColors[2]!.color },
    ]);
  });

  it("nennt am Ende Gewinner und Kästchen, bei Gleichstand alle", () => {
    expect(resultLine(["p2"], view(), seats, players)).toBe("Ben gewinnt mit 9 Kästchen!");
    expect(resultLine(["p1", "p3"], view(), seats, players)).toBe("Gleichstand! Anna und Clara gewinnen mit je 5 Kästchen.");
    expect(listNames(["Anna", "Ben", "Clara"])).toBe("Anna, Ben und Clara");
    expect(finalLines(ranking(view(), seats, players))).toEqual(["1. Ben: 9 Kästchen", "2. Anna: 5 Kästchen", "2. Clara: 5 Kästchen"]);
    expect(cellsLabel(1)).toBe("1 Kästchen");
  });

  it("lässt einen frischen Klecks kurz aufleuchten", () => {
    expect(splashStrength(figure(1, 1, { blobWait: blobCooldownTicks - 1 }))).toBeGreaterThan(0.8);
    expect(splashStrength(figure(1, 1, { blobWait: blobCooldownTicks - 20 }))).toBe(0);
    expect(splashStrength(figure(1, 1, { blobWait: 0 }))).toBe(0);
  });

  it("gibt bis zu 8 Sitzen verschiedene Farben mit Namen und färbt Kästchen in der Farbe ihres Besitzers", () => {
    const eight = ["p1", "p2", "p3", "p4", "p5", "p6", "p7", "p8"];
    expect(new Set(eight.map((seat) => seatColor(seat, eight).color)).size).toBe(8);
    expect(new Set(eight.map((seat) => seatColor(seat, eight).name)).size).toBe(8);
    expect(markColor("1")).toBe(seatColor("p1", eight).color);
    expect(markColor("8")).toBe(seatColor("p8", eight).color);
    expect(markColor(emptyCell)).toBeUndefined();
  });
});

describe("Oberfläche von Farbfelder: Handy", () => {
  it("zeigt Name, Farbe, Kästchen, Platz und Restzeit", () => {
    const shown = controllerView(snapshot(), players);
    expect(shown).toMatchObject({ name: "Anna", colorName: "Gelb", cells: "5 Kästchen", canBlob: true });
    expect(shown.status).toBe("Platz 2 von 3 · noch 1:30");
    expect(place("p3", view(), seats)).toBe(2);
    expect(place("p2", view(), seats)).toBe(1);
  });

  it("zeigt, wann der Klecks wieder bereit ist", () => {
    expect(blobStatus(0)).toEqual({ ready: true, label: "Klecks!", progress: 1 });
    expect(blobStatus(blobCooldownTicks)).toEqual({ ready: false, label: "Klecks in 8 s", progress: 0 });
    expect(blobStatus(21)).toMatchObject({ ready: false, label: "Klecks in 2 s" });
    expect(blobStatus(20).label).toBe("Klecks in 1 s");
    const waiting = snapshot({
      public: view({ figures: { p1: figure(2, 2, { blobWait: 100 }), p2: figure(10, 5), p3: figure(20, 8) } }),
      moves: [{ type: "steer", dir: "none" }],
    });
    expect(controllerView(waiting, players)).toMatchObject({ canBlob: false, blob: { ready: false, label: "Klecks in 5 s" } });
  });

  it("sagt jedem am Ende, wer gewonnen hat", () => {
    expect(controllerStatus(snapshot({ result: { winners: ["p1"] } }), players)).toBe("Du gewinnst!");
    expect(controllerStatus(snapshot({ result: { winners: ["p1", "p3"] } }), players)).toBe("Gleichstand! Du gewinnst zusammen mit Clara.");
    expect(controllerStatus(snapshot({ result: { winners: ["p2"] } }), players)).toBe("Ben gewinnt mit 9 Kästchen!");
    expect(controllerView(snapshot({ result: { winners: ["p2"] }, moves: [] }), players)).toMatchObject({
      over: true,
      canBlob: false,
      blob: { ready: false, label: "Runde vorbei" },
    });
  });

  it("liest nur das Ergebnis vor, nicht die jede Sekunde neue Restzeit", () => {
    expect(controllerView(snapshot(), players).announcement).toBe("");
    expect(controllerView(snapshot({ public: view({ ticksLeft: 1780 }) }), players).announcement).toBe("");
    expect(controllerView(snapshot({ result: { winners: ["p1"] }, moves: [] }), players).announcement).toBe("Du gewinnst!");
  });

  it("kehrt beim Loslassen einer Taste zur noch gehaltenen zurück", () => {
    let keys = pressKey([], "left");
    keys = pressKey(keys, "up");
    expect(topKey(keys)).toBe("up");
    keys = releaseKey(keys, "up");
    expect(topKey(keys)).toBe("left");
    expect(topKey(releaseKey(keys, "left"))).toBe("none");
  });

  it("schickt die gehaltene Richtung erneut, wenn sie auf dem Server verloren ging und nichts mehr unterwegs ist", () => {
    const moves: FarbfelderAction[] = [...(["up", "down", "left", "right", "none"] as const).map((dir) => steer(dir)), { type: "blob" }];
    const lost = snapshot({ moves });
    expect(needsResend(lost, "right", 0)).toBe(true);
    expect(needsResend(lost, "right", 1)).toBe(false);
    const arrived = snapshot({ moves, public: view({ figures: { p1: figure(2, 2, { dir: "right" }), p2: figure(10, 5), p3: figure(20, 8) } }) });
    expect(needsResend(arrived, "right", 0)).toBe(false);
    expect(needsResend({ ...lost, result: { winners: ["p1"] } }, "right", 0)).toBe(false);
    expect(needsResend({ ...lost, moves: [] }, "right", 0)).toBe(false);
  });

  it("macht aus der Fingerposition auf dem Steuerkreuz eine Richtung", () => {
    expect(padDirection(0, -50, 10)).toBe("up");
    expect(padDirection(0, 50, 10)).toBe("down");
    expect(padDirection(-50, 10, 10)).toBe("left");
    expect(padDirection(50, -10, 10)).toBe("right");
    expect(padDirection(3, 4, 10)).toBe("none");
  });
});
