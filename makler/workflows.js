// Workflow-Vorlagen als reine Daten. Neue Prozesse = neues Objekt in WORKFLOWS.
// Regeln für Erweiterungen:
//  - IDs (Workflow, Phase, Schritt) NIE ändern, sonst gehen gespeicherte Antworten verloren.
//  - Neue Schritte/Phasen dürfen jederzeit ergänzt werden; bestehende Vorgänge zeigen sie automatisch.
// Schritt-Felder:
//  id, label            Pflicht
//  info                 Hinweistext (aufklappbar)
//  input                'text' | 'textarea' | 'number' | 'date' | 'select'
//  options              Auswahlwerte bei input:'select'
//  unit                 Einheit bei number (z. B. '€', 'm²')
//  required             muss vor Abschluss des Vorgangs erledigt sein
//  warn                 als kritisch markieren
//  kind                 'task' (Standard) | 'rule' (No-Go/Regel bestätigen)

const FIELDS_OBJEKT = [
  { id: 'objektart', label: 'Objektart', input: 'select', options: ['Eigentumswohnung', 'Einfamilienhaus', 'Mehrfamilienhaus', 'Grundstück', 'Gewerbe'] },
  { id: 'adresse', label: 'Adresse', input: 'text' },
  { id: 'eigentuemer', label: 'Eigentümer', input: 'text' },
  { id: 'telefon', label: 'Telefon', input: 'text' },
  { id: 'email', label: 'E-Mail', input: 'text' },
  { id: 'termin', label: 'Besichtigungstermin', input: 'date' },
  { id: 'wohnflaeche', label: 'Wohnfläche (Angabe)', input: 'number', unit: 'm²' },
  { id: 'zimmer', label: 'Zimmer', input: 'number' },
  { id: 'baujahr', label: 'Baujahr', input: 'number' },
  { id: 'etage', label: 'Etage', input: 'text' },
  { id: 'vermietet', label: 'Vermietet', input: 'select', options: ['nein', 'ja', 'teilweise'] },
];

export const WORKFLOWS = [
  {
    id: 'verkauf-akquise',
    name: 'Verkaufsvermittlung – Akquise bis Notar',
    short: 'Verkauf',
    fields: FIELDS_OBJEKT,
    phases: [
      {
        id: 'vorbereitung', title: 'Vorbereitung (vor dem Termin)',
        steps: [
          { id: 'v-34c', label: 'Erlaubnis §34c GewO, Vermögensschadenhaftpflicht, Weiterbildung (20 h / 3 J.) aktuell', required: true },
          { id: 'v-boris', label: 'Bodenrichtwert recherchiert (BORIS)', input: 'number', unit: '€/m²' },
          { id: 'v-vergleich', label: 'Vergleichsangebote recherchiert', input: 'textarea' },
          { id: 'v-mietspiegel', label: 'Mietspiegel geprüft', input: 'text' },
          { id: 'v-lage', label: 'Mikrolage geprüft (ÖPNV, Schulen, Lärm, Nahversorgung)', input: 'textarea' },
          { id: 'v-material', label: 'Material dabei', info: 'Maklervertrag, Widerrufsbelehrung, GwG-Formular, Unterlagen-Checkliste, Laser-Entfernungsmesser, Kamera, Feuchtemessgerät.' },
        ],
      },
      {
        id: 'motiv', title: 'Gespräch: Motiv & Rahmen',
        steps: [
          { id: 'm-grund', label: 'Verkaufsgrund', input: 'select', options: ['Umzug', 'Erbe', 'Scheidung/Trennung', 'Finanzielle Gründe', 'Alter/Verkleinerung', 'Kapitalanlage', 'Sonstiges'], info: 'Bestimmt Tempo, Preisflexibilität und Diskretionsbedarf.', required: true },
          { id: 'm-zeit', label: 'Gewünschter Verkauf bis', input: 'date' },
          { id: 'm-frei', label: 'Wohnung frei ab', input: 'date' },
          { id: 'm-entscheider', label: 'Entscheider / Eigentumsverhältnisse', input: 'textarea', required: true, warn: true, info: 'Erbengemeinschaft: alle Miterben müssen zustimmen. Betreuung: Genehmigung des Betreuungsgerichts. Eheleute: ggf. Zustimmung nach §1365 BGB.' },
          { id: 'm-preis', label: 'Preisvorstellung des Eigentümers', input: 'number', unit: '€', info: 'Woher stammt sie? (Nachbar, Portal, Bank, Bauchgefühl)' },
          { id: 'm-vorher', label: 'Bereits inseriert / anderer Makler beauftragt?', input: 'select', options: ['nein', 'ja – inseriert', 'ja – Makler', 'ja – beides'], warn: true, info: 'Ein bereits länger inseriertes Objekt gilt als „verbrannt“ – Strategie anpassen.' },
        ],
      },
      {
        id: 'recht', title: 'Gespräch: Recht & Finanzen',
        steps: [
          { id: 'r-kauf', label: 'Erwerbsdatum & Selbstnutzung', input: 'text', info: 'Verkauf < 10 Jahre nach Erwerb ohne Selbstnutzung → ggf. Spekulationssteuer (§23 EStG). Nur Hinweis, an Steuerberater verweisen.' },
          { id: 'r-schuld', label: 'Restschuld / Vorfälligkeitsentschädigung', input: 'textarea' },
          { id: 'r-grundbuch', label: 'Lasten im Grundbuch (Abt. II/III: Wohnrecht, Nießbrauch, Vorkaufsrecht, Grundschulden)', input: 'textarea' },
          { id: 'r-miete', label: 'Mietverhältnis (Vertrag, Miete, Kaution, Rückstände, Sperrfristen)', input: 'textarea', info: 'Nur relevant bei Vermietung.' },
        ],
      },
      {
        id: 'weg', title: 'WEG & Verwaltung',
        steps: [
          { id: 'w-hausgeld', label: 'Hausgeld', input: 'number', unit: '€/Monat' },
          { id: 'w-ruecklage', label: 'Erhaltungsrücklage (gesamt / Anteil)', input: 'text' },
          { id: 'w-verwaltung', label: 'Hausverwaltung (Kontakt)', input: 'text' },
          { id: 'w-umlagen', label: 'Sonderumlagen beschlossen/geplant (Dach, Fassade, Heizung/GEG)', input: 'textarea', warn: true },
          { id: 'w-streit', label: 'Streitigkeiten / Beschlussklagen', input: 'textarea' },
          { id: 'w-snr', label: 'Sondernutzungsrechte (Garten, Stellplatz, Keller)', input: 'text' },
        ],
      },
      {
        id: 'zustand', title: 'Objektzustand',
        steps: [
          { id: 'z-modern', label: 'Modernisierungen mit Jahr & Belegen', input: 'textarea', info: 'Bad, Fenster, Elektrik, Böden, Heizung.' },
          { id: 'z-maengel', label: 'Bekannte Mängel', input: 'textarea', warn: true, required: true, info: 'Feuchte, Schimmel, Wasserschäden, Risse, Asbest (Baujahr ≤ 1993). Alles dokumentieren – Verschweigen = Haftung.' },
          { id: 'z-heizung', label: 'Heizung: Art & Baujahr, Warmwasser', input: 'text' },
          { id: 'z-genehmigung', label: 'Umbauten genehmigt? (Wanddurchbruch, Dachausbau, Balkon)', input: 'textarea' },
          { id: 'z-flaeche', label: 'Wohnfläche nachgemessen (WoFlV)', input: 'number', unit: 'm²' },
          { id: 'z-fotos', label: 'Fotos erstellt (nur mit Einwilligung)', info: 'Keine Personen, Familienfotos, Post, Wertsachen. Fotos als Dateien an diesen Schritt hängen.' },
        ],
      },
      {
        id: 'unterlagen', title: 'Unterlagen',
        steps: [
          { id: 'u-grundbuch', label: 'Grundbuchauszug (aktuell)', required: true },
          { id: 'u-teilung', label: 'Teilungserklärung inkl. Aufteilungsplan & Gemeinschaftsordnung' },
          { id: 'u-protokolle', label: 'WEG-Protokolle letzte 3 Jahre' },
          { id: 'u-wirtschaftsplan', label: 'Wirtschaftsplan & Hausgeldabrechnung' },
          { id: 'u-energie', label: 'Energieausweis', required: true, warn: true, info: 'Pflicht ab Inserat, Pflichtangaben in die Anzeige (GEG). Fehlen = Bußgeld.' },
          { id: 'u-grundriss', label: 'Grundrisse, Baubeschreibung, Wohnflächenberechnung' },
          { id: 'u-mietvertrag', label: 'Mietvertrag (falls vermietet)' },
          { id: 'u-belege', label: 'Belege Modernisierungen' },
        ],
      },
      {
        id: 'pflichten', title: 'Rechtliche Pflichten beim Termin',
        steps: [
          { id: 'p-vertrag', label: 'Maklervertrag in Textform geschlossen (§656a BGB)', required: true, info: 'Bei Wohnung/EFH an Verbraucher: Provisionsteilung (§656c BGB).' },
          { id: 'p-widerruf', label: 'Widerrufsbelehrung übergeben', input: 'date', required: true, warn: true, info: 'Vertrag in der Wohnung = außerhalb von Geschäftsräumen (§312b BGB) → 14 Tage Widerruf. Ohne Belehrung droht Provisionsverlust.' },
          { id: 'p-gwg', label: 'GwG: Auftraggeber identifiziert (Ausweis) & dokumentiert', required: true },
          { id: 'p-dsgvo', label: 'DSGVO: Einwilligung für Fotos/Daten eingeholt', required: true },
        ],
      },
      {
        id: 'nogos', title: 'No-Gos (bestätigen)',
        steps: [
          { id: 'n-preis', kind: 'rule', label: 'Kein Preis aus dem Bauch – nur Spanne „vorbehaltlich Bewertung“' },
          { id: 'n-hochluegen', kind: 'rule', label: 'Preis nicht hochlügen, um den Auftrag zu bekommen' },
          { id: 'n-maengel', kind: 'rule', label: 'Nie raten, Mängel zu verschweigen' },
          { id: 'n-rdg', kind: 'rule', label: 'Keine Rechts-/Steuerberatung (RDG) – an Fachleute verweisen' },
          { id: 'n-geschmack', kind: 'rule', label: 'Einrichtung/Geschmack nicht abwerten' },
          { id: 'n-mieter', kind: 'rule', label: 'Vermietete Wohnung nur nach Absprache mit Mieter betreten' },
          { id: 'n-druck', kind: 'rule', label: 'Kein Unterschriftsdruck am selben Tag' },
          { id: 'n-diskretion', kind: 'rule', label: 'Nichts über andere Kunden/Objekte erzählen' },
        ],
      },
      {
        id: 'abschluss', title: 'Abschluss des Termins',
        steps: [
          { id: 'a-next', label: 'Nächste Schritte vereinbart', input: 'textarea', required: true },
          { id: 'a-bewertung', label: 'Bewertung zugesagt bis', input: 'date' },
          { id: 'a-fototermin', label: 'Fototermin', input: 'date' },
          { id: 'a-liste', label: 'Unterlagen-Liste übergeben' },
          { id: 'a-protokoll', label: 'Protokoll am selben Tag erstellt', info: 'Ansicht „Protokoll“ drucken / als PDF speichern.' },
        ],
      },
      {
        id: 'bewertung', title: 'Bewertung',
        steps: [
          { id: 'b-vergleich', label: 'Vergleichswert ermittelt', input: 'number', unit: '€' },
          { id: 'b-ertrag', label: 'Ertragswert (bei Vermietung)', input: 'number', unit: '€' },
          { id: 'b-spanne', label: 'Empfohlene Angebotsspanne', input: 'text', required: true },
          { id: 'b-praesentation', label: 'Bewertung dem Eigentümer präsentiert', input: 'date' },
          { id: 'b-preis', label: 'Angebotspreis vereinbart', input: 'number', unit: '€' },
        ],
      },
      {
        id: 'vermarktung', title: 'Vermarktung',
        steps: [
          { id: 'k-expose', label: 'Exposé erstellt & vom Eigentümer freigegeben' },
          { id: 'k-inserat', label: 'Inserat online (inkl. Energieausweis-Pflichtangaben)', input: 'date' },
          { id: 'k-besichtigungen', label: 'Besichtigungen durchgeführt', input: 'textarea' },
          { id: 'k-bonitaet', label: 'Finanzierungsnachweis Käufer geprüft', required: true },
        ],
      },
      {
        id: 'verkauf', title: 'Notar & Übergabe',
        steps: [
          { id: 's-reservierung', label: 'Käufer ausgewählt / Reservierung', input: 'text' },
          { id: 's-entwurf', label: 'Notarvertragsentwurf versendet', input: 'date' },
          { id: 's-beurkundung', label: 'Beurkundung', input: 'date', required: true },
          { id: 's-uebergabe', label: 'Übergabe mit Protokoll (Zählerstände, Schlüssel)', input: 'date' },
          { id: 's-rechnung', label: 'Provisionsrechnung gestellt', input: 'date' },
        ],
      },
    ],
  },
];

export const getWorkflow = id => WORKFLOWS.find(w => w.id === id);
