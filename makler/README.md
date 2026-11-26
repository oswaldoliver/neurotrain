# Makler Workflow

Web-App ohne Server und ohne Build-Schritt, die man auf dem Handy, Tablet oder Desktop öffnet. Damit legt man Vorgänge an (Objekte und Aufträge) und arbeitet sie Schritt für Schritt nach festen Workflow-Vorlagen ab.

## Funktionen
- **Vorgänge** anlegen, durchsuchen und nach Status filtern (aktiv, abgeschlossen, archiviert).
- **Workflow** mit Phasen und Schritten:
  - Checkboxen und Eingabefelder (Text, Zahl, Datum, Auswahl).
  - Hinweise zu jedem Schritt, Pflichtschritte und Warnungen.
  - Notizen zu jedem Schritt.
  - Fortschrittsanzeige.
- **Dateien** (Fotos, PDFs) zum ganzen Vorgang oder zu einem einzelnen Schritt ablegen.
- **Verlauf**: Protokoll aller Änderungen.
- **Protokoll** als Ansicht, die man drucken oder als PDF speichern kann.
- **Backup**: Export und Import als JSON, Dateien sind mit enthalten.

## Starten
Die App muss über HTTP oder HTTPS laufen; per Doppelklick als `file://` funktioniert sie nicht. Möglichkeiten:
- **GitHub Pages**: im Repository unter Settings → Pages den Branch auswählen, dann `https://<user>.github.io/<repo>/makler/` öffnen.
- **Lokal**: `python3 -m http.server` im Repository-Ordner starten, dann `http://localhost:8000/makler/` öffnen.

**Wichtig:** Die Daten liegen in IndexedDB, also nur in diesem Browser auf diesem Gerät. Deshalb regelmäßig ein Backup exportieren.

## Aufbau
| Datei | Zweck |
|---|---|
| `workflows.js` | Workflow-Vorlagen als reine Daten. Hier werden Prozesse erweitert. |
| `app.js` | Oberfläche und Logik (Routing über die URL-Raute `#/…`) |
| `db.js` | IndexedDB-Speicher (`cases`, `files`) |
| `style.css` | Layout, helles und dunkles Design |

## Workflow erweitern
In `workflows.js` neue Schritte oder Phasen ergänzen oder ein weiteres Workflow-Objekt anlegen. Bestehende Vorgänge zeigen neue Schritte automatisch an. **Vorhandene IDs nie ändern**, sonst gehen bereits gespeicherte Antworten verloren.

## Roadmap (Vorschlag)
1. Weitere Workflows: Bewertung (Vergleichswert-Rechner), Marktanalyse, Vermietung.
2. Exposé-Generator aus Stammdaten, Antworten und Fotos.
3. Termine und Wiedervorlagen mit Erinnerungen.
4. Backend (z. B. Supabase oder eigener Server) für Synchronisierung über mehrere Geräte und mehrere Nutzer. Das Datenmodell ist darauf vorbereitet.
5. Kontakte und CRM: Eigentümer, Interessenten, Käufer.
