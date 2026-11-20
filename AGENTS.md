# Anleitung für KI-Agenten

Dieses Repo ist ein Echtzeit-Spiel für **Gamehearth**, eine selbst gehostete Spieleplattform. Ein Fernseher (oder ein Laptop am Fernseher) zeigt das Spielfeld, die Handys der Mitspieler sind Controller. Die Spielregeln laufen auf dem Server und rechnen die Welt 20-mal pro Sekunde weiter; Fernseher und Handys zeigen nur, was der Server schickt. Du baust hier mit einer Person zusammen ein Spiel. Lies diese Datei ganz, bevor du etwas änderst.

## Mit wem du arbeitest

Die Person kann vermutlich nicht programmieren. Sie kennt ihr Spiel, nicht den Code.

- Sprich über Spielregeln, nicht über Code. Frag nach, was passieren soll („Was passiert, wenn zwei gleichzeitig auf dasselbe Feld laufen?“), nicht wie es gebaut wird.
- Kläre die Regeln vollständig, bevor du sie baust: Spielerzahl, was man am Handy drücken kann, was auf dem Fernseher zu sehen ist, wie lange eine Runde dauert, wer gewinnt, was bei Gleichstand gilt. Frag auch nach Varianten, die man vor der Partie einstellen möchte (Spielzeit, Feldgröße); sie werden Optionen. Schreib die Regeln in Alltagssprache in die `README.md` und lass sie bestätigen.
- Arbeite in kleinen Schritten und zeig nach jedem Schritt etwas zum Ausprobieren (`npm run dev`, siehe unten). Sag in einem Satz, was sich geändert hat und was die Person ausprobieren soll.
- Fachwörter nur mit Erklärung. Fehlermeldungen übersetzt du in einen Satz, was nicht stimmt und was du dagegen tust.
- Vor dem ersten Veröffentlichen fragst du nach Lizenz und Namen (siehe „Veröffentlichen“).

## Aufbau

| Pfad | Inhalt |
|---|---|
| `manifest.json` | Name, Version, Spielerzahl, Rollen (Fernseher und Controller), Lizenz, Optionen und Profil-Katalog (`stats`) des Spiels |
| `ids.lock` | alle IDs des Profils, die das Spiel je hatte; pflegt `npm run check`, gehört ins Repo |
| `src/game.ts` | die Spielregeln (Reducer mit `tick`), laufen auf dem Server |
| `src/index.ts` | exportiert das Spiel als `default` |
| `client/src/main.ts` | verbindet die Oberfläche mit der Plattform und startet je nach Rolle Fernseher oder Controller |
| `client/src/screen.ts` | das Spielfeld auf dem Fernseher, mit Phaser 4 gezeichnet und geglättet |
| `client/src/controller.ts` | der Controller am Handy: Knöpfe, die eine Richtung halten, auch per Tastatur |
| `client/src/view.ts` | alles, was die Oberfläche entscheidet, ohne Phaser (Texte, Farben, Positionen mischen, Feld einpassen); gut testbar |
| `test/` | Tests für Regeln und Oberflächenlogik (Vitest) |
| `dist/client/` | die gebaute Oberfläche (entsteht durch `npm run build`, nicht von Hand ändern) |

Die Vorlage enthält ein kleines Beispielspiel, **Fangen**: Einer ist Fänger; wen er berührt, der wird Fänger. Ist die Spielzeit um (Option „Spielzeit“, Standard 60 Sekunden), gewinnt, wer am kürzesten Fänger war. Es zeigt die wichtigsten Muster. Ersetze es vollständig durch das Spiel der Person (siehe „Das Beispiel ersetzen“).

## Befehle

| Befehl | Wofür |
|---|---|
| `npm run dev` | startet das Spiel lokal unter http://localhost:5180 mit Fernseher und allen Handys nebeneinander |
| `npm test` | Tests |
| `npm run typecheck` | Typprüfung von Regeln und Oberfläche |
| `npm run check` | prüft das Spiel wie die Plattform: Manifest, Lizenz, Partien mit Zufallsbots Tick für Tick, Lecks, Determinismus, Lauf und Tempo in der Server-Sandbox. Dauert bei Echtzeit je nach Spielerzahl und Rundenlänge einige Minuten: im Hintergrund starten und die Ausgabe lesen; für schnelle Zwischenläufe `npm run check -- --players 2` |
| `npm run pack` | baut das Spielpaket `dist/<id>-<version>.zip`, nur wenn `check` keine Fehler meldet |

`npm run dev` läuft, bis man es beendet. Starte es im Hintergrund und lies seine Ausgabe: Die Adresse steht dort (meist http://localhost:5180; ist der Port belegt, etwa weil `dev` schon läuft, ein anderer), und Fehler aus den Regeln und aus der Oberfläche stehen dort als Textblock, den du direkt beheben kannst. Läuft schon ein `dev` für dieses Spiel, nutze es weiter, statt ein zweites zu starten. Die Person öffnet die Adresse im Browser: oben der Fernseher, darunter ein schmaler Rahmen pro Handy. Mit „Anhalten“, „Ein Tick“ und der Zeitlupe lässt sich eine Szene genau ansehen; jeder Sitz kann ein Bot sein, der zufällig drückt. Ändern sich die Regeln, beginnt `dev` eine neue Partie mit denselben Sitzen und Bots; ändert sich die Oberfläche, lädt es die Rahmen neu. Beende `dev` am Ende samt Kindprozessen (unter Windows etwa `taskkill /T /F` auf den Prozess an dem Port aus der Ausgabe).

Mit `npm run dev -- --host` ist `dev` im WLAN erreichbar: den Fernseher unter `/tv` auf einem großen Bildschirm öffnen, jedes Handy unter `/p1`, `/p2` … So fühlt sich das Spiel echt an.

### Die Oberfläche prüfen

Die Oberfläche läuft in `dev` so abgeschottet wie auf der Plattform: in einem Sandbox-iframe ohne eigene Origin, auch unter den Adressen einzelner Sitze (`/p1`, `/tv`). Manche eingebauten Browser von KI-Werkzeugen laden solche iframes nicht (etwa der Browser-Bereich der Claude-App: die Rahmen bleiben leer, die Anfragen scheitern mit `net::ERR_BLOCKED_BY_CLIENT`). Dort läuft der Code der Oberfläche gar nicht; ein Terminal ohne Fehler beweist dann nichts. Was hilft:

- Hast du Playwright oder einen Chrome mit Fernsteuerung, bediene die Seite selbst. Mit Playwright erreichst du das erste Handy mit `page.locator(".seat:not(.tv)").nth(0).frameLocator("iframe")` und den Fernseher mit `page.locator(".seat.tv").frameLocator("iframe")`. Über das DevTools-Protokoll von Chrome fehlen die abgeschotteten Rahmen in `Page.getFrameTree`, weil sie in einem eigenen Prozess laufen; du erreichst sie mit `Target.setAutoAttach({ autoAttach: true, flatten: true, waitForDebuggerOnStart: false })`. Im Rahmen eines Handys gibt es die Knöpfe des Controllers (Gruppe „Steuerkreuz“), die Pfeiltasten gehen auch.
- Sobald ein Browser die Rahmen wirklich lädt, stehen Fehler und `console.log` der Oberfläche mit Sitz und Stelle im Quelltext im Terminal von `dev`. Lies sie dort.
- Was die Oberfläche entscheidet (Texte, Farben, Positionen mischen, Feld einpassen), gehört nach `client/src/view.ts` und wird in `test/view.test.ts` getestet. Je mehr dort steht, desto weniger musst du im Browser nachsehen.
- Konntest du die Oberfläche nicht selbst sehen, sag das bei der Übergabe ausdrücklich und bitte die Person, http://localhost:5180 in ihrem normalen Browser zu öffnen und zu sagen, was sie sieht. Das ist ohnehin der wichtigste Test.

## Arbeitsablauf

1. Regeln mit der Person klären und in die `README.md` schreiben.
2. Den Zustand entwerfen: Was sehen alle (`public`), was sieht nur ein Spieler (`players[sitz]`), was sieht niemand (`secret`)? Bei Partyspielen liegt meist alles in `public`.
3. `src/game.ts` schreiben, dazu Tests in `test/rules.test.ts` für jede Regel, besonders für Zusammenstöße, Ränder und das Ende.
4. `npm test` und `npm run typecheck`.
5. `npm run check`, bis keine Fehler mehr kommen. Warnungen lesen und bewusst entscheiden.
6. Die Oberfläche anpassen: erst `client/src/view.ts` (mit Tests in `test/view.test.ts`), dann `client/src/screen.ts` und `client/src/controller.ts`.
7. `npm run dev`, die Person spielt es aus. Rückmeldung einarbeiten, ab Schritt 3 wiederholen.

Vor jeder Übergabe an die Person müssen `npm test`, `npm run typecheck` und `npm run check` ohne Fehler durchlaufen.

## Die wichtigsten Regeln für `src/`

Die Spielregeln sind ein **Reducer**: fünf reine Funktionen in `defineGame` aus `@gamehearth/sdk`.

```ts
setup({ players, random, options })   // Startzustand; players = ["p1", "p2", …]
legalMoves(state, player, { players, options })  // alle Eingaben, die dieser Sitz gerade machen darf (Array, leer = keine)
apply(state, action, { player, players, random, options, now })  // eine Eingabe anwenden; state direkt ändern ist erlaubt
tick(state, dt, { players, random, options, now })  // die Welt einen Schritt weiterrechnen, 20-mal pro Sekunde, dt ist immer 50
result(state)                         // undefined, solange es läuft; sonst { winners: ["p2"] }
```

So läuft ein Tick: Alle Eingaben, die seit dem letzten Tick angekommen sind, gehen in der Reihenfolge ihrer Ankunft durch `apply`; danach rechnet `tick`. Nach jedem Schritt fragt die Plattform `result`.

1. **Eingaben sagen, was gerade gedrückt ist.** Beim Drücken `{ type: "steer", dir: "left" }`, beim Loslassen `{ type: "steer", dir: "none" }`. `apply` merkt sich das im Zustand, `tick` bewegt, solange gedrückt ist. Schick nicht in jedem Tick eine Eingabe: Die Plattform nimmt von jedem Handy höchstens 30 Eingaben pro Sekunde an, und warten von einem Sitz mehr als 4 auf den nächsten Tick, verfällt die älteste. Geht eine Eingabe trotzdem verloren (etwa wenn eine neue Runde alle Richtungen zurücksetzt), schickt das Beispiel die gehaltene Richtung erneut, sobald der Snapshot etwas anderes zeigt und nichts mehr unterwegs ist (`needsResend` in `client/src/view.ts`).
2. **Zeit über Ticks zählen.** Restzeit, Abklingzeiten, Countdown im Spiel: in `tick` herunterzählen (wie `ticksLeft` im Beispiel). `ctx.now` ist die Uhrzeit des Servers und läuft während einer Pause weiter; für Spielzeit taugt es nicht.
3. **Jede Partie muss enden**, meist über ein Zeitlimit. `check` spielt mit Bots, die zufällig drücken; endet eine Partie nach 10 Minuten Spielzeit nicht, ist das ein Fehler.
4. **Ganze Zahlen für Positionen und Tempo.** Das Beispiel rechnet in Feldeinheiten mit ganzzahligem Tempo. `Math.sin`, `Math.cos`, `Math.exp`, `Math.pow`, `Math.hypot` und ähnliche rechnen auf dem Server (QuickJS) in den letzten Stellen manchmal anders als in Node; Grundrechenarten und `Math.sqrt` sind überall gleich. Abstände vergleichst du am einfachsten quadriert (`dx * dx + dy * dy <= r * r`), wie `touching` im Beispiel.
5. **Der Zustand bleibt klein.** Er wird 20-mal pro Sekunde geprüft, kopiert und an alle Geräte geschickt. Ein Raster lieber als Text oder Zahlenliste als als Tausende Objekte. `check` warnt, wenn ein Tick auf dem Server zu lange braucht.
6. **Kein `Math.random()`, kein `Date.now()`, kein `new Date()`.** Zufall nur über `random` (`random.int(1, 6)`, `random.pick(liste)`, `random.shuffle(liste)` gibt eine gemischte Kopie zurück, `random.weighted(tabelle)` zieht einen Eintrag nach seinem ganzzahligen `weight`), Zeit nur über `ctx.now` und das Zählen von Ticks. Jede Partie muss sich aus Seed und Eingaben exakt wiederholen lassen.
7. **Der Zustand ist reines JSON** mit genau drei Bereichen: `public` (sehen alle, auch der Fernseher), `players` (ein Eintrag pro Sitz, sieht nur dieses Handy), `secret` (sieht niemand). Kein `Set`, keine `Map`, kein `Date`, keine Klassen, kein `undefined` in Arrays.
8. **Der Fernseher sieht nur `public`.** Was auf dem Feld erscheinen soll, gehört nach `public`. Was nur ein Handy zeigen soll (etwa eine geheime Aufgabe), gehört nach `players[sitz]`.
9. **Eingaben verraten nichts.** Alles, was in `legalMoves` steht, geht an das Handy dieses Spielers.
10. **`apply` bekommt nur erlaubte Eingaben.** Prüf darin nicht noch einmal, ob eine Eingabe erlaubt ist; das macht die Plattform mit `legalMoves`.
11. **`legalMoves` darf für alle leer sein**, etwa am Ende oder in einer Pause im Spiel; anders als bei rundenbasierten Spielen hängt die Partie dann nicht, weil `tick` weiterläuft.
12. **Sitze statt Namen.** Spieler heißen `p1`, `p2`, …; Namen gibt es nur in der Oberfläche über `players`.
13. **Keine Variablen außerhalb der Funktionen, die sich ändern.** Auf dem Server laufen viele Partien im selben Modul.
14. **Nur die Sprache selbst.** Die Regeln laufen auf dem Server in QuickJS: kein `console`, kein `structuredClone`, kein `Intl`, kein Netz, keine Dateien. Importieren darfst du nur Dateien aus diesem Ordner und `@gamehearth/sdk`.
15. **`setup` muss die Spielerzahl nicht prüfen.** Die Plattform startet nur mit einer Zahl aus `manifest.json`.

### Optionen

Varianten, die man vor der Partie einstellt, stehen in `manifest.json` unter `options`, wie „Spielzeit“ im Beispiel: entweder eine Auswahl aus festen Werten (`"type": "choice"` mit `choices`, Werte sind ganze Zahlen oder kurze Texte) oder Ja/Nein (`"type": "boolean"`), immer mit `label` und `default`. Der Gastgeber stellt sie in der Lobby ein. Namen bestehen aus Buchstaben und Ziffern, etwa `feldGroesse`.

- Die Regeln lesen sie als `ctx.options` in `setup`, `legalMoves`, `apply` und `tick`, immer vollständig. Den Typ gibt man `defineGame` als dritten Typparameter, so wie `Options` in `src/game.ts`. Das Beispiel rechnet in `setup` die Spielzeit in Ticks um.
- `result` bekommt keine Optionen; was das Ende braucht, steht im Zustand (im Beispiel `ticksLeft`).
- Die Oberfläche bekommt sie mit jedem Stand als `update.options`.
- `check` spielt jeden Wert jeder Option. Funde nennen die Optionen, der Befehl zum Nachspielen setzt sie mit `--option spielzeit=30`.
- Tests geben `createMatch` die Optionen mit (`options: { spielzeit: 60 }`, siehe `test/rules.test.ts`); ohne sie ist `ctx.options` leer.
- Eine Option fragt man nur, wenn die Person die Variante wirklich will. Braucht ein Spiel keine, fliegt `options` aus dem Manifest und `Options` aus den Regeln.

### Profile

Was über eine Partie hinaus bleiben soll, steht im **Profil** des Spielers: gesammelte Gegenstände, Siege, Bestwerte, Freischaltungen. Die Plattform hält pro Account und Spiel ein Profil; das Spiel hat keine eigene Datenbank. In Farbfelder bekommen im letzten Tick alle mit den meisten Kästchen einen Sieg (`siege`, mit Bestenliste). Frag die Person, ob etwas über eine Partie hinaus bleiben soll; wenn nicht, braucht das Spiel kein Profil.

- **Katalog im Manifest.** Jede ID steht mit Anzeigenamen in `manifest.json`: `items` (Anzahl, etwa Joker oder Münzen), `stats` (Zahlen; mit `"better": "higher"` oder `"lower"` bekommt der Stat eine Bestenliste auf der Spielseite der Plattform, ohne `better` ist er ein Zähler) und `flags` (`true` oder ein kurzer Text, etwa für Freischaltungen). Namen aus Kleinbuchstaben, Ziffern und `-`.
- **IDs sind für immer.** `npm run check` trägt jede ID in `ids.lock` ein; die Datei gehört ins Repo. Eine veröffentlichte ID nie umbenennen oder löschen, sondern mit `"deprecated": true` stehen lassen, sonst verlieren alle Spieler, was sie gesammelt haben. Nur IDs, die nie veröffentlicht wurden (etwa die des Beispiels), darfst du von Hand aus `ids.lock` löschen.
- **Lesen:** `ctx.profiles[sitz]` in `setup`, `legalMoves`, `apply` und `tick`, etwa `ctx.profiles[player]?.items.joker ?? 0`. Leere Einträge fehlen.
- **`legalMoves` bietet nur an, was das Profil hergibt.** Ein Zug, der einen Joker verbraucht, steht nur in der Liste, wenn einer da ist. `check` meldet es als Fehler, wenn das fehlt.
- **Schreiben:** `ctx.profile.add(sitz, item, n)`, `stat(sitz, name, n)` (Zähler ändern, auch für Siege), `record(sitz, name, wert)` (Bestwert: die Plattform behält den besseren, nur für Stats mit `better`) und `flag(sitz, name, wert)` (`false` löscht) in `apply` und `tick`; `use(sitz, item, n)` (verbrauchen) nur in `apply`, weil sich ein Tick nicht ablehnen lässt. Jede echte Änderung in `tick` kostet den Server eine Schreibtransaktion: Schreib Siege und Zähler am Ende der Partie einmal, nicht in jedem Tick.
- Fehlt ein Item inzwischen, weil eine andere Partie desselben Spielers es verbraucht hat, lehnt die Plattform den Zug ab, und nichts ändert sich. Das Spiel muss dafür nichts tun.
- Gäste haben ein leeres Profil, das nach der Partie verfällt; das Spiel muss Gäste nicht kennen.
- **Typen:** `import manifest from "../manifest.json"` und `CatalogOf<typeof manifest>` als vierter Typparameter von `defineGame` (so wie `Ids` in `src/game.ts`). Dann ist ein Tippfehler in einer ID ein Typfehler.
- **Tests:** `createMatch` und `stepMatch` bekommen `catalog: manifest` und die Profile je Sitz; die Änderungen eines Schritts stehen in `outcome.changes`. Beispiel in `test/rules.test.ts`.
- **Oberfläche:** Sie bekommt das eigene Profil mit jedem Stand als `update.profile`, nie das der Mitspieler. Den Typ gibt man `connect` als vierten Typparameter.
- **In `dev`** hat jeder Sitz unten ein aufklappbares Profil, das du bearbeiten kannst, etwa um einem Sitz zehn Siege zu geben. Es liegt in `.gamehearth/dev-profiles.json` (steht in `.gitignore`) und bleibt über Partien und Neustarts; wer die Datei direkt ändert, startet danach eine neue Partie. „Gast“ an einem Sitz lässt ihn mit einem leeren Profil spielen, das nach der Partie verfällt.

### Was die Plattform selbst macht

Darum kümmert sich das Spiel nicht: Vor dem Start und nach jeder Pause zählt die Plattform 3 Sekunden herunter. Sie hält die Partie an, solange ein Handy weg ist (gesperrt, kein Netz) oder kein Fernseher verbunden ist, und zeigt den Grund an. Der Gastgeber kann anhalten. Ein Fehler in `tick` hält die Partie beim letzten guten Stand an. Beitreten geht nur in der Lobby zwischen den Runden.

## Die Oberfläche

- Die Oberfläche läuft in einem abgeschotteten iframe. Sie spricht nur über `@gamehearth/sdk/client` mit der Plattform: `connect()`, `game.onUpdate(...)`, `game.move(eingabe)`. Ein Spiel mit Fernseher ruft `connect({ screen: true })` auf und fragt dann `game.role`: `"screen"` ist der Fernseher (kein Sitz, keine Eingaben, nur `public`), sonst ist es ein Handy mit `game.seat`. So macht es `client/src/main.ts`.
- Kein `fetch`, kein WebSocket, keine Bilder oder Schriften von fremden Adressen; nur Dateien aus dem eigenen Build.
- **Glätten:** Der Server schickt 20 Stände pro Sekunde, der Fernseher zeichnet 60. `createTimeline(game)` aus dem SDK liefert in jedem Bild `{ from, to, alpha }`; Positionen mischt man mit `lerp(from, to, alpha)`, alles andere (Punkte, wer Fänger ist) nimmt man aus `to`. Siehe `client/src/screen.ts` und `blendPositions` in `client/src/view.ts`. Springt eine Figur (etwa zurück an den Start), nicht mischen, sondern setzen.
- Der Controller schickt nur, wenn sich etwas ändert (drücken, loslassen), und beim Verlassen des Fensters ein Loslassen. Jeder Knopf geht auch mit Tastatur.
- Phaser 4, nicht Phaser 3: Beispiele aus dem Netz sind oft Phaser 3. Halte dich an die Muster in `client/src/screen.ts`; bei Fehlermeldungen zu unbekannten Methoden steckt meist Phaser-3-Code dahinter. In Phaser zeichnet `update()` jedes Bild neu; erzeuge dort keine neuen Objekte pro Bild, sondern verwende sie weiter (wie die Namensschilder im Beispiel).
- Grafik und Ton: am einfachsten mit Phaser zeichnen (wie im Beispiel). Eigene Dateien kommen nach `client/public/` und brauchen eine Lizenz CC0, CC-BY oder CC-BY-SA; keine Bilder aus dem Internet ohne klare Lizenz.

## Typische Fehler

| Meldung oder Symptom | Ursache und Abhilfe |
|---|---|
| `Math.random() ist in Spielen nicht erlaubt` | `random` aus `setup` oder `ctx.random` in `apply` und `tick` benutzen |
| `Partien enden nach … Sekunden Spielzeit … noch nicht` | ein Zeitlimit einbauen, das `tick` herunterzählt, und `result` darauf prüfen lassen |
| Partie endet nur im eigenen Test sofort oder nie, `ctx.options.spielzeit` ist `undefined` | der Test ruft `createMatch` ohne `options` auf |
| `mode "realtime", aber es hat keine Funktion tick` | `tick` in `defineGame` fehlt oder ist falsch geschrieben |
| `tick hat einen Fehler geworfen: …` | Stelle und Tick stehen dabei; mit dem genannten `--seed` nachspielen |
| Warnung: Ein Tick braucht auf dem Server lange | weniger Objekte im Zustand, nichts in jedem Tick neu aufbauen, was sich nicht ändert |
| `beim ersten Durchlauf … beim Wiederholen …` | Zustand außerhalb der Funktionen oder nicht wiederholbarer Zufall |
| Figuren ruckeln auf dem Fernseher | Positionen nicht mit `createTimeline` gemischt, oder in jedem Bild neue Phaser-Objekte |
| Figur läuft weiter, obwohl losgelassen | der Controller schickt beim Loslassen kein `none` (auch bei `pointercancel` und `blur`) |
| `liegt außerhalb des Spielordners` | nur Dateien aus diesem Ordner und `@gamehearth/sdk` importieren |
| Typfehler `Type 'string' is not assignable to type '"steer"'` | eine Eingabe als Objekt-Literal ohne Typ; `const action: MeineEingabe = { type: "steer", … }` schreiben |
| Oberfläche bleibt leer, `dev` zeigt einen Fehler aus dem iframe | Fehlermeldung samt Datei und Zeile in der Ausgabe von `dev` lesen |
| In der Konsole des Browsers: `Unrecognized Content-Security-Policy directive 'webrtc'` | harmlos: Die Abschottung der Plattform verbietet WebRTC auch für Browser, die die Regel kennen; Chromium kennt sie noch nicht |

Jeder Fund von `check` nennt einen Befehl, mit dem sich genau diese Partie nachspielen lässt (`npx gamehearth check . --players 3 --seed check-3-17`, bei geänderten Optionen mit `--option`). Damit siehst du alle Eingaben einzeln mit ihrem Tick.

## Das Beispiel ersetzen

Wenn das eigene Spiel steht, darf vom Fangen nichts übrig bleiben:

- `manifest.json`: `name`, `description`, `players`, `roles` und `options` passend setzen (ohne Varianten fällt `options` weg). `mode` bleibt `"realtime"`. Die `id` kommt aus dem Ordnernamen. Passt sie nicht (etwa `mein-spiel`), änder sie jetzt in `manifest.json` und `package.json`: nur Kleinbuchstaben, Ziffern und Bindestriche. Nach dem ersten Veröffentlichen ändert sie sich nie mehr.
- `package.json`: `description`.
- `src/`, `client/src/`, `test/`: Regeln, Oberfläche und Tests des eigenen Spiels. Die Dateinamen darfst du behalten oder ändern, nur `src/index.ts` muss das Spiel als `default` exportieren.
- `client/index.html`: Titel.
- `README.md`: Regeln des eigenen Spiels; den Hinweis „enthält noch das Beispiel“ oben entfernen.
- Zum Schluss nach Resten suchen: `Fangen`, `Fänger`, `TagState`, `TagAction`, `catcher`, `tagBack` und den Export `tag` in `src/`, `client/`, `test/`, `README.md`, `manifest.json` und `package.json`.
- `AGENTS.md` und `CLAUDE.md` bleiben, wie sie sind. Sie erwähnen Fangen als Beispiel der Vorlage.
- Das ursprüngliche Beispiel liegt danach weiter zum Nachschlagen unter `node_modules/gamehearth/templates/echtzeit/`, etwa wie `client/src/screen.ts` glättet oder `client/src/controller.ts` Finger und Tasten liest.

## Mehr Einzelheiten

Diese Dateien passen immer zur installierten Version. Lies sie, bevor du etwas benutzt, das hier nicht steht:

- `node_modules/@gamehearth/sdk/README.md`: der vollständige Vertrag für Regeln und Oberfläche, Echtzeit, Rollen und Glätten, Fehler der Plattform, Grenzen der Server-Sandbox
- `node_modules/gamehearth/README.md`: `dev`, `check`, `pack` und Kataloge

Ändere nichts in `node_modules` und schalte keine Prüfungen ab. Wenn der Vertrag etwas nicht hergibt, sag der Person, was nicht geht.

## Veröffentlichen

Vor dem ersten Release fragst du die Person:

- **Lizenz:** Vorbelegt sind MIT für den Code und CC0 für Grafik (siehe `LICENSE` und `manifest.json`). Erklär kurz: Jeder darf das Spiel dann benutzen, ändern und weitergeben. Andere erlaubte Lizenzen: jede OSI-Lizenz für Code, CC0, CC-BY oder CC-BY-SA für Grafik.
- **Name in der `LICENSE`:** wer als Urheber dasteht; das ist öffentlich sichtbar.

Ablauf:

1. Version in `manifest.json` und `package.json` erhöhen (`0.1.0` → `0.2.0`), committen.
2. Das Repo auf GitHub hochladen. Ein Tag startet die Release-CI: `git tag v0.2.0 && git push origin v0.2.0`. Sie baut mit `check` und `pack` das Spielpaket und hängt es an ein Release.
3. Damit ein Gamehearth-Server das Spiel installieren kann, braucht es einen **Katalog**: ein eigenes Repo mit einer `catalog.json`. Anlegen und eintragen mit `npx gamehearth catalog add catalog.json <adresse-des-pakets> --name "Mein Katalog"`. Auf dem Server fügt ein Admin unter „Verwaltung“ die Raw-Adresse der `catalog.json` hinzu und installiert das Spiel. Einzelheiten in `node_modules/gamehearth/README.md`.
4. Zum Spielen öffnet jemand auf dem Fernseher die Adresse des Servers mit `/tv` und koppelt ihn in der Lobby per Code.
