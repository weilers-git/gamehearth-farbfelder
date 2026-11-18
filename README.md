# Farbfelder

Ein Partyspiel für Gamehearth, die selbst gehostete Spieleplattform. Der Fernseher zeigt das Spielfeld, jeder steuert seine Figur mit dem Handy.

Farbfelder ist das zweite eigene Spiel von Gamehearth und das Beispiel für Echtzeit mit Fernseher und Handys als Controller. Es entstand aus der Vorlage `echtzeit` des Gamehearth-Werkzeugs, gebaut von einem KI-Agenten nach einer Beschreibung in Alltagssprache.

Auf einen Gamehearth-Server kommt das Spiel über einen Katalog, etwa den [Gamehearth-Katalog](https://github.com/weilers-git/gamehearth-catalog): In der Verwaltung den Katalog hinzufügen und Farbfelder installieren. Zum Spielen öffnet ein Fernseher oder Laptop die Adresse des Servers mit `/tv` und wird in der Lobby per Code gekoppelt; die Handys treten dem Raum wie gewohnt bei.

## Regeln

Für 2 bis 8 Spieler. Eine Runde dauert 90 Sekunden.

- Das Spielfeld ist ein Raster aus 32 × 18 Kästchen. Jeder hat eine eigene Farbe und eine Figur auf dem Feld.
- Am Handy gibt es ein Steuerkreuz (hoch, runter, links, rechts). Solange man drückt, läuft die Figur in diese Richtung.
- Jedes Kästchen, über das die Figur läuft, bekommt ihre Farbe, auch wenn es vorher jemand anderem gehörte.
- Am Handy gibt es außerdem den Knopf **Klecks**: Er färbt auf einen Schlag die 3 × 3 Kästchen rund um die Figur. Danach muss man 8 Sekunden warten, bis man wieder klecksen kann. Das Handy zeigt, wie lange es noch dauert.
- Nach 90 Sekunden gewinnt, wer die meisten Kästchen hat. Bei Gleichstand gewinnen alle mit den meisten.
- Auf dem Fernseher sieht man das Feld mit allen Figuren und ihren Namen, die Restzeit und rechts eine Rangliste, wie viele Kästchen jeder hat.
- Auf dem Handy sieht man seinen Namen, seine Farbe, wie viele Kästchen man hat, das Steuerkreuz und den Klecks-Knopf.
- Es gibt keinen Ton.

### Einzelheiten

- **Feldgröße:** immer 32 × 18 Kästchen (passt ins Fernsehformat), egal wie viele mitspielen.
- **Tempo:** Eine Figur braucht für ein Kästchen 0,15 Sekunden, schafft also gut 6 Kästchen pro Sekunde. Einmal quer übers Feld dauert etwa 5 Sekunden.
- **Laufen in ganzen Kästchen:** Figuren stehen immer auf einem Kästchen. Kurz antippen heißt: genau ein Kästchen weiter. Lässt man los, läuft die Figur noch bis zum nächsten Kästchen und bleibt dort stehen. Drückt man während eines Schritts schon die nächste Richtung, biegt die Figur auf dem nächsten Kästchen ab. Umkehren geht sofort.
- **Steuerkreuz am Handy:** Man kann den Daumen auf dem Steuerkreuz von einer Richtung zur nächsten ziehen, ohne loszulassen. Hält man das Handy quer, liegt das Steuerkreuz links und der Klecks-Knopf groß rechts, wie bei einem Gamepad. Mit Tastatur gehen die Pfeiltasten oder W, A, S, D, der Klecks mit der Leertaste oder K. Hält man eine zweite Richtung kurz dazu und lässt sie los, läuft die Figur in die erste weiter. Hat ein Knopf des Steuerkreuzes den Fokus, drückt Enter diese Richtung; die Leertaste bleibt auch dort der Klecks.
- **Start:** Die Figuren stehen gleichmäßig verteilt; das Startkästchen hat schon die eigene Farbe, also beginnt jeder mit 1 Kästchen. Vor dem Start zählt Gamehearth selbst 3 Sekunden herunter.
- **Wann ein Kästchen gefärbt wird:** sobald die Figur zur Hälfte darauf steht. Wer stehen bleibt, färbt nichts nach; läuft jemand anderes über das Kästchen, unter dem man steht, gehört es ihm.
- **Begegnungen:** Figuren halten sich nicht gegenseitig auf; man kann durch andere hindurchlaufen und auf demselben Kästchen stehen. Betreten zwei im selben Augenblick dasselbe Kästchen, bekommt es per Zufall einer von beiden.
- **Klecks:** Er ist schon zu Beginn bereit und geht auch im Laufen; die Mitte ist das Kästchen, auf dem die Figur gerade steht. Am Rand färbt er nur die Kästchen, die im Feld liegen (in einer Ecke also 4). Klecksen zwei im selben Augenblick und überlappen sich die Flecken, gehört der überlappende Teil dem, dessen Klecks zuletzt beim Server ankam. Auf dem Fernseher blitzt ein frischer Klecks kurz auf.
- **Farben** in der Reihenfolge der Plätze: Gelb, Blau, Grün, Rot, Lila, Orange, Türkis, Rosa. Das Handy nennt die eigene Farbe auch als Wort.
- **Extras:** Das Handy zeigt zusätzlich den eigenen Platz und die Restzeit. Auf dem Fernseher wird die Uhr in den letzten 10 Sekunden rot. Am Ende stehen Gewinner und alle Ergebnisse groß auf dem Fernseher, und jedes Handy sagt, ob man gewonnen hat.

## Ausprobieren

Voraussetzung ist Node 22 oder neuer.

```bash
npm install
npm run dev
```

Dann http://localhost:5180 öffnen. Oben steht der Fernseher, darunter ein Rahmen pro Handy. Jeden Platz kann man selbst spielen (in einen Rahmen klicken und das Steuerkreuz oder die Pfeiltasten benutzen) oder einem Bot geben, der zufällig drückt. Oben wählt man, wie viele mitspielen.

Mit `npm run dev -- --host` geht es auch mit echten Handys im WLAN: den Fernseher unter `/tv` auf einem großen Bildschirm öffnen, jedes Handy unter `/p1`, `/p2` … So fühlt sich das Spiel echt an.

## Entwickeln

Dieses Spiel lässt sich gut mit einem KI-Agenten (Claude Code, Cursor, Copilot …) weiterbauen. Die Anleitung für den Agenten steht in [AGENTS.md](AGENTS.md).

| Befehl | Was er tut |
|---|---|
| `npm run dev` | startet das Spiel lokal mit Fernseher und allen Handys im Browser |
| `npm test` | Tests |
| `npm run typecheck` | Typprüfung |
| `npm run check` | prüft das Spiel wie die Plattform, mit Bot-Partien Tick für Tick |
| `npm run pack` | baut das Spielpaket für einen Katalog |

## Lizenz

Code unter MIT, Grafik unter CC0 (siehe [LICENSE](LICENSE) und `manifest.json`).
