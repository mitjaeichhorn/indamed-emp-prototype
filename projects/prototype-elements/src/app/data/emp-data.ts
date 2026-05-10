import { PatientData } from '@indamed/ui';

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND-INTEGRATION
// ─────────────────────────────────────────────────────────────────────────────
// Diese Datei enthält statische Demo-Daten für den Prototypen. In der
// produktiven Anbindung werden alle Konstanten durch HTTP-Calls gegen die
// INDAMED-API ersetzt. Jeder Block unten ist mit dem zugehörigen Endpoint,
// der erwarteten Response-Shape und Hinweisen zu Format-Konventionen
// annotiert.
//
// Konventionen für alle Endpoints:
//   • Authentifizierung:   Bearer-Token im `Authorization`-Header
//   • Content-Type:        application/json; charset=utf-8
//   • Datums-Format:       'TT.MM.JJJJ' (deutsches Format, KEIN ISO-8601)
//                          → Backend liefert ISO 'YYYY-MM-DD' und der
//                            Frontend-Adapter formatiert um.
//   • Dosierungs-Format:   'M-M-A-N' (morgens-mittags-abends-nachts) als
//                          String, oder Freitext ('Bei Bedarf', 'Zu den Mahlzeiten').
//   • Patient-Scope:       Alle GETs erwarten `patientId` als Pfad-Parameter.
//
// Beispiel-Service: siehe `src/app/data/emp-backend.service.example.ts`
// ─────────────────────────────────────────────────────────────────────────────

/**
 * BACKEND-INTEGRATION — Patient-Stammdaten
 *
 *   GET /api/patients/{patientId}
 *
 * Response 200 — Shape `PatientData` (aus @indamed/ui):
 *   {
 *     "name":      "Reinhardt, Isabel",   // "Nachname, Vorname"
 *     "birthDate": "*11.11.1947",         // mit führendem '*' (deutsche Konvention)
 *     "age":       78,                    // Jahre, vom Backend berechnet
 *     "gender":    "W",                   // "M" | "W" | "D"
 *     "id":        "123456789"            // Versichertennummer / interne ID
 *   }
 *
 * Errors: 401 (auth), 403 (kein Zugriff auf Patient), 404 (unbekannt).
 */
export const PATIENT: PatientData = {
  name:      'Reinhardt, Isabel',
  birthDate: '*11.11.1947',
  age:       78,
  gender:    'W',
  id:        '123456789',
};

export interface MedHistoryEntry {
  datum:        string;
  typ:          'V' | 'D';
  apotheke?:    string;
  arzt?:        string;
  wirkstoff:    string;
  handelsname:  string;
  staerke:      string;
  form:         string;
  dos:          string;
  geaendert:    boolean;
  mitbehandler: string;
  versicherte:  string;
}

export interface MedEntry {
  id:          string;
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;
  hinweise:    string;
  grund:       string;
  rw:          number;
  art:         string;
  details: {
    versicherte:   string;
    mitbehandler:  string;
    beginn:        string;
    ende?:         string;
    icd:           string;
    historie:      MedHistoryEntry[];
  };
}

/**
 * BACKEND-INTEGRATION — Aktive Medikation des Patienten
 *
 *   GET /api/patients/{patientId}/medications?status=active
 *
 * Response 200 — Array von `MedEntry` (Shape siehe Interface oben):
 *   [
 *     {
 *       "id":          "med-1",                       // stabile Backend-ID, im UI für Selection/Updates
 *       "wirkstoff":   "Bisoprolol",
 *       "handelsname": "Bisoprolol-1A Pharma",
 *       "staerke":     "2,5 mg",                      // Komma als Dezimaltrenner, mit Einheit
 *       "form":        "Tabls",                       // freier Text — Tabls/Kapseln/Tropfen/Inj/...
 *       "dosierung":   "1-0-0-0",                     // 'M-M-A-N' ODER Freitext ('Bei Bedarf')
 *       "hinweise":    "",                            // Kurzhinweis (auf Tabelle sichtbar)
 *       "grund":       "Herzinsuffizienz",            // Indikation als Klartext
 *       "rw":          0,                             // verbleibende Wiederholungen (Rezept)
 *       "art":         "A",                           // Verordnungsart-Kürzel
 *       "details": {
 *         "versicherte":  "Nüchtern einnehmen",       // Hinweis für Versicherten (lang)
 *         "mitbehandler": "Kardiologe informiert",    // interner Hinweis
 *         "beginn":       "01.03.2024",               // 'TT.MM.JJJJ'
 *         "ende":         "31.12.2024",               // optional, nur bei pausiert/beendet
 *         "icd":          "I50.0",                    // ICD-10-Code
 *         "historie":     [ ...MedHistoryEntry ]      // chronologisch absteigend
 *       }
 *     }, ...
 *   ]
 *
 * `historie` enthält V- (Verordnung) und D- (Dispensierung) Datensätze und
 * speist die ausklappbare eML-Detail-Zeile in der Plan-Tabelle.
 */
export const AKTIVE_MEDIKATION: MedEntry[] = [
  {
    id: 'med-1', wirkstoff: 'Bisoprolol', handelsname: 'Bisoprolol-1A Pharma',
    staerke: '2,5 mg', form: 'Tabls', dosierung: '1-0-0-0', hinweise: '', grund: 'Herzinsuffizienz',
    rw: 0, art: 'A',
    details: {
      versicherte: '', mitbehandler: '', beginn: '01.03.2024', icd: 'I50.0',
      historie: [
        { datum: '15.01.2025', typ: 'V', arzt: 'Dr. Müller', wirkstoff: 'Bisoprolol', handelsname: 'Bisoprolol-1A Pharma', staerke: '2,5 mg', form: 'Tabls', dos: '1-0-0-0', geaendert: false, mitbehandler: '', versicherte: '' },
        { datum: '10.10.2024', typ: 'D', apotheke: 'Apotheke am Markt', wirkstoff: 'Bisoprolol', handelsname: 'Bisoprolol-1A Pharma', staerke: '2,5 mg', form: 'Tabls', dos: '1-0-0-0', geaendert: false, mitbehandler: '', versicherte: '' },
      ],
    },
  },
  {
    id: 'med-2', wirkstoff: 'Levothyroxin', handelsname: 'L-Thyroxin Henning',
    staerke: '75 µg', form: 'Tabls', dosierung: '1-0-0-0', hinweise: 'Nüchtern einnehmen', grund: 'Hypothyreose',
    rw: 0, art: 'A',
    details: {
      versicherte: 'Nüchtern einnehmen, 30 Min vor dem Frühstück', mitbehandler: '', beginn: '15.06.2022', icd: 'E03.9',
      historie: [
        { datum: '20.01.2025', typ: 'V', arzt: 'Dr. Müller', wirkstoff: 'Levothyroxin', handelsname: 'L-Thyroxin Henning', staerke: '75 µg', form: 'Tabls', dos: '1-0-0-0', geaendert: false, mitbehandler: '', versicherte: 'Nüchtern einnehmen' },
      ],
    },
  },
  {
    id: 'med-3', wirkstoff: 'Metoprolol', handelsname: 'Metoprolol-ratiopharm',
    staerke: '47,5 mg', form: 'Retardtabl', dosierung: '0-0-1-0', hinweise: '', grund: 'Arterielle Hypertonie',
    rw: 14, art: 'A',
    details: {
      versicherte: '', mitbehandler: 'Kardiologe informiert', beginn: '10.09.2023', icd: 'I10',
      historie: [],
    },
  },
  {
    id: 'med-4', wirkstoff: 'Simvastatin', handelsname: 'Simva Aristo',
    staerke: '20 mg', form: 'Tabls', dosierung: '0-0-1-0', hinweise: 'Abends einnehmen', grund: 'Hypercholesterinämie',
    rw: 0, art: 'A',
    details: {
      versicherte: 'Abends einnehmen', mitbehandler: '', beginn: '03.04.2021', icd: 'E78.0',
      historie: [
        { datum: '15.01.2025', typ: 'V', arzt: 'Dr. Müller', wirkstoff: 'Simvastatin', handelsname: 'Simva Aristo', staerke: '20 mg', form: 'Tabls', dos: '0-0-1-0', geaendert: true, mitbehandler: '', versicherte: 'Abends einnehmen' },
        { datum: '10.10.2024', typ: 'D', apotheke: 'Stadt-Apotheke', wirkstoff: 'Simvastatin', handelsname: 'Simva Aristo', staerke: '20 mg', form: 'Tabls', dos: '0-0-1-0', geaendert: false, mitbehandler: '', versicherte: '' },
      ],
    },
  },
  {
    id: 'med-5', wirkstoff: 'Metamizol', handelsname: 'Novaminsulfon Lichtenstein',
    staerke: '500 mg', form: 'Tabls', dosierung: 'Bei Bedarf', hinweise: 'Max. 4 Tbl./Tag', grund: 'Schmerztherapie',
    rw: 0, art: 'A',
    details: {
      versicherte: 'Bei Schmerzen 1 Tbl., max. 4 Tbl. pro Tag', mitbehandler: '', beginn: '22.11.2024', icd: 'R52',
      historie: [],
    },
  },
  {
    id: 'med-6', wirkstoff: 'Atorvastatin', handelsname: 'Atorvastatin Basics',
    staerke: '40 mg', form: 'Tabls', dosierung: '0-0-1-0', hinweise: '', grund: 'Hypercholesterinämie',
    rw: 30, art: 'A',
    details: {
      versicherte: '', mitbehandler: '', beginn: '01.01.2025', icd: 'E78.0',
      historie: [],
    },
  },
  {
    id: 'med-7', wirkstoff: 'Insulin aspart', handelsname: 'NovoRapid FlexPen',
    staerke: '100 E/ml', form: 'Inj', dosierung: 'Zu den Mahlzeiten', hinweise: 'Dosierung nach BZ', grund: 'Diabetes mellitus Typ 2',
    rw: 0, art: 'A',
    details: {
      versicherte: 'Dosierung nach Blutzuckerwert, siehe Schulungsprotokoll', mitbehandler: 'Diabetologe Dr. Schmidt informiert', beginn: '14.02.2023', icd: 'E11.9',
      historie: [
        { datum: '15.01.2025', typ: 'V', arzt: 'Dr. Müller', wirkstoff: 'Insulin aspart', handelsname: 'NovoRapid FlexPen', staerke: '100 E/ml', form: 'Inj', dos: 'Zu den Mahlzeiten', geaendert: false, mitbehandler: 'Diabetologe Dr. Schmidt', versicherte: '' },
      ],
    },
  },
];

/**
 * BACKEND-INTEGRATION — Pausierte Medikation
 *
 *   GET /api/patients/{patientId}/medications?status=paused
 *
 * Selber `MedEntry`-Shape wie aktive Medikation. Pflichtfelder zusätzlich:
 *   • `details.ende` — Datum, an dem pausiert wurde ('TT.MM.JJJJ')
 *
 * Pause/Beenden wird über die Mutation in `emp-screen.ts` ausgelöst
 * (siehe dortige `onRowMenuAction`-Annotation).
 */
export const PAUSIERTE_MEDIKATION: MedEntry[] = [
  {
    id: 'med-p1', wirkstoff: 'Candesartan', handelsname: 'Candesartan STADA',
    staerke: '8 mg', form: 'Tabls', dosierung: '1-0-0-0', hinweise: '', grund: 'Arterielle Hypertonie',
    rw: 0, art: 'A',
    details: {
      versicherte: '', mitbehandler: '', beginn: '01.06.2020', ende: '31.12.2024', icd: 'I10',
      historie: [],
    },
  },
  {
    id: 'med-p2', wirkstoff: 'Levothyroxin', handelsname: 'Euthyrox',
    staerke: '50 µg', form: 'Tabls', dosierung: '1-0-0-0', hinweise: '', grund: 'Hypothyreose',
    rw: 0, art: 'A',
    details: {
      versicherte: '', mitbehandler: '', beginn: '01.01.2020', ende: '14.06.2022', icd: 'E03.9',
      historie: [],
    },
  },
  {
    id: 'med-p3', wirkstoff: 'Acetylsalicylsäure', handelsname: 'Aspirin Protect',
    staerke: '100 mg', form: 'Tabls', dosierung: '1-0-0-0', hinweise: '', grund: 'Sekundärprophylaxe',
    rw: 0, art: 'A',
    details: {
      versicherte: '', mitbehandler: '', beginn: '10.03.2019', ende: '30.09.2024', icd: 'Z82.4',
      historie: [],
    },
  },
];

/**
 * BACKEND-INTEGRATION — Geplante Medikation
 *
 *   GET /api/patients/{patientId}/medications?status=planned
 *
 * Selber `MedEntry`-Shape. Geplante Medikation hat:
 *   • `details.beginn` — zukünftiges Startdatum
 *   • `details.ende`   — null oder leer
 */
export const GEPLANTE_MEDIKATION: MedEntry[] = [];

export interface EmlRow {
  id:          string;
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;
  datum:       string;
  typ:         'V' | 'D';
  arzt?:       string;
  apotheke?:   string;
  uebernommen: boolean;
  /** Deviates from the active plan entry — renders with the amber Abweichung tint */
  abweichung?: boolean;
}

/**
 * BACKEND-INTEGRATION — Quelle: elektronische Medikationsliste (eML)
 *
 *   GET /api/patients/{patientId}/sources/eml
 *
 * Liefert V/D-Datensätze aus der TI/eML-Schnittstelle. Response 200:
 *   [
 *     {
 *       "id":          "eml-1",
 *       "wirkstoff":   "Bisoprolol",
 *       "handelsname": "Bisoprolol-TAD",
 *       "staerke":     "2,5 mg",
 *       "form":        "Tabls",
 *       "dosierung":   "1-0-0-0",
 *       "datum":       "15.01.2025",          // 'TT.MM.JJJJ'
 *       "typ":         "V",                   // "V" = Verordnung, "D" = Dispensierung
 *       "arzt":        "Dr. Müller",          // optional, nur bei typ='V'
 *       "apotheke":    "Stadt-Apotheke",      // optional, nur bei typ='D'
 *       "uebernommen": true,                  // bereits in den aktiven Plan übernommen?
 *       "abweichung":  false                  // optional — true wenn vom Plan abweichend
 *     }, ...
 *   ]
 *
 * `uebernommen`/`abweichung` sind UI-Hinweise, die der Backend-Resolver aus
 * dem Vergleich gegen den aktuellen Plan ableitet (Wirkstoff-Match).
 */
export const EML_ROWS: EmlRow[] = [
  { id: 'eml-1', wirkstoff: 'Bisoprolol',  handelsname: 'Bisoprolol-TAD',     staerke: '2,5 mg', form: 'Tabls',   dosierung: '1-0-0-0', datum: '15.01.2025', typ: 'V', arzt: 'Dr. Müller', uebernommen: true },
  { id: 'eml-2', wirkstoff: 'Simvastatin', handelsname: 'Simvastatin',        staerke: '20 mg',  form: 'Tabls',   dosierung: '0-0-1-0', datum: '15.01.2025', typ: 'V', arzt: 'Dr. Müller', uebernommen: true },
  { id: 'eml-3', wirkstoff: 'Simvastatin', handelsname: 'Simvastatin Basics', staerke: '20 mg',  form: 'Tabls',   dosierung: '0-0-1-0', datum: '10.10.2024', typ: 'D', apotheke: 'Stadt-Apotheke', uebernommen: false },
  { id: 'eml-4', wirkstoff: 'Omeprazol',   handelsname: 'Omeprazol Heumann',  staerke: '20 mg',  form: 'Kapseln', dosierung: '1-0-0-0', datum: '05.12.2024', typ: 'V', arzt: 'Dr. Weber',  uebernommen: false, abweichung: true },
];

export interface KarteikartzeRow {
  id:        string;
  datum:     string;
  typ:       string;
  text:      string;
  arzt:      string;
  /** Differs from the active plan — renders with the blue left edge */
  diff?:     boolean;
  /** Already adopted into the current plan — renders muted */
  used?:     boolean;
}

/**
 * BACKEND-INTEGRATION — Quelle: Karteikarte (interne Doku des Praxis-Systems)
 *
 *   GET /api/patients/{patientId}/sources/karteikarte
 *
 * Response 200:
 *   [
 *     {
 *       "id":    "kk-1",
 *       "datum": "20.01.2025",
 *       "typ":   "Med",                        // Eintragstyp — "Med", "Diag", "Notiz"...
 *       "text":  "BISOPROLOL RAT 2,5MG TAB",   // unstrukturierter Freitext aus dem Altsystem
 *       "arzt":  "Dr. Müller",
 *       "diff":  true,                         // optional — weicht vom aktiven Plan ab
 *       "used":  false                         // optional — bereits übernommen
 *     }, ...
 *   ]
 *
 * Wichtig: `text` ist NICHT strukturiert (bewusst, weil Altdaten). Das UI
 * parsiert ihn bei Bedarf via `medFromKkText` in `emp-screen.ts`.
 */
export const KARTEIKARTE_ROWS: KarteikartzeRow[] = [
  { id: 'kk-1', datum: '20.01.2025', typ: 'Med', text: 'BISOPROLOL RAT 2,5MG TAB',  arzt: 'Dr. Müller', used: true },
  { id: 'kk-2', datum: '20.01.2025', typ: 'Med', text: 'IBUPROFEN 200MG',            arzt: 'Dr. Müller', diff: true },
  { id: 'kk-3', datum: '15.01.2025', typ: 'Med', text: 'IBUPROFEN AL 2% SAFT',       arzt: 'Dr. Müller', diff: true },
  { id: 'kk-4', datum: '15.01.2025', typ: 'Med', text: 'SIMVASTATIN AL 5MG',         arzt: 'Dr. Müller', used: true },
  { id: 'kk-5', datum: '10.12.2024', typ: 'Med', text: 'THALIDOMID ZEN 50MG HKP',    arzt: 'Dr. Weber',  diff: true },
];

export interface PastPlanMed {
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;
  grund:       string;
}

export interface PastPlanEntry {
  datum:     string;
  arzt:      string;
  meds:      PastPlanMed[];
}

/**
 * BACKEND-INTEGRATION — Vergangene Medikationspläne (Plan-Historie)
 *
 *   GET /api/patients/{patientId}/plans?archived=true
 *
 * Liefert frühere Plan-Snapshots, chronologisch absteigend. Response 200:
 *   [
 *     {
 *       "datum": "15.11.2025",         // Erstellungsdatum des Plans
 *       "arzt":  "Dr. Müller",
 *       "meds":  [                     // Array `PastPlanMed` (kompakter als MedEntry)
 *         {
 *           "wirkstoff":   "Amoxicillin",
 *           "handelsname": "Amoxi AL 1000",
 *           "staerke":     "1000 mg",
 *           "form":        "Tabls",
 *           "dosierung":   "1-0-1-0",
 *           "grund":       "Bronchitis"
 *         }, ...
 *       ]
 *     }, ...
 *   ]
 *
 * Der Endpoint sollte serverseitig auf max. 5–10 letzte Pläne begrenzen
 * (Pagination optional via ?limit=&offset=).
 */
export const PAST_PLANS: PastPlanEntry[] = [
  {
    datum: '15.11.2025', arzt: 'Dr. Müller', meds: [
      { wirkstoff: 'Amoxicillin',  handelsname: 'Amoxi AL 1000',     staerke: '1000 mg', form: 'Tabls', dosierung: '1-0-1-0',     grund: 'Bronchitis' },
      { wirkstoff: 'Pantoprazol',  handelsname: 'Pantoprazol TAD',   staerke: '40 mg',   form: 'Tabls', dosierung: '1-0-0-0',     grund: 'Gastritis' },
      { wirkstoff: 'Ibuprofen',    handelsname: 'IBUPROFEN 400MG',   staerke: '400 mg',  form: 'TAB',   dosierung: 'bei Bedarf',  grund: 'Schmerzen' },
      { wirkstoff: 'Bisoprolol',   handelsname: 'Bisoprolol-TAD',    staerke: '2,5 mg',  form: 'Tabls', dosierung: '1-0-0-0',     grund: 'Hypertonie' },
      { wirkstoff: 'Paracetamol',  handelsname: 'Paracetamol 500',   staerke: '500 mg',  form: 'Tabls', dosierung: '1-0-1-0',     grund: 'Kopfschmerzen' },
      { wirkstoff: 'Simvastatin',  handelsname: 'Simvastatin AL 20', staerke: '20 mg',   form: 'Tabls', dosierung: '0-0-1-0',     grund: 'Hypercholest.' },
      { wirkstoff: 'Metoprolol',   handelsname: 'METOPROLOL AL 100', staerke: '100 mg',  form: 'Tabls', dosierung: '0,5-0-0,5-0', grund: 'Hypertonie' },
    ],
  },
  {
    datum: '20.08.2025', arzt: 'Dr. Müller', meds: [
      { wirkstoff: 'Pantoprazol', handelsname: 'Pantoprazol TAD',   staerke: '40 mg',  form: 'Tabls', dosierung: '1-0-0-0', grund: 'Gastritis' },
      { wirkstoff: 'Ramipril',    handelsname: 'Delix 5mg',         staerke: '5 mg',   form: 'Tabls', dosierung: '1-0-0-0', grund: 'Hypertonie' },
      { wirkstoff: 'Amlodipin',   handelsname: 'Amlodipin-1A',      staerke: '5 mg',   form: 'Tabls', dosierung: '0-0-1-0', grund: 'Hypertonie' },
      { wirkstoff: 'Simvastatin', handelsname: 'Simvastatin AL 20', staerke: '20 mg',  form: 'Tabls', dosierung: '0-0-1-0', grund: 'Hypercholest.' },
      { wirkstoff: 'ASS',         handelsname: 'ASS 100 Hexal',     staerke: '100 mg', form: 'Tabls', dosierung: '1-0-0-0', grund: 'Sekundärprophylaxe' },
    ],
  },
  {
    datum: '14.06.2025', arzt: 'Dr. Müller', meds: [
      { wirkstoff: 'Prednisolon',  handelsname: 'Decortin H 20',     staerke: '20 mg',  form: 'Tabls', dosierung: '1-0-0-0', grund: 'Rheumaschub' },
      { wirkstoff: 'Pantoprazol',  handelsname: 'Pantoprazol TAD',   staerke: '40 mg',  form: 'Tabls', dosierung: '1-0-0-0', grund: 'Magenschutz' },
      { wirkstoff: 'Ibuprofen',    handelsname: 'IBUPROFEN 600MG',   staerke: '600 mg', form: 'TAB',   dosierung: '1-1-1-0', grund: 'Rheuma' },
      { wirkstoff: 'Bisoprolol',   handelsname: 'Bisoprolol-TAD',    staerke: '2,5 mg', form: 'Tabls', dosierung: '1-0-0-0', grund: 'Hypertonie' },
      { wirkstoff: 'Metformin',    handelsname: 'Metformin AL',      staerke: '850 mg', form: 'Tabls', dosierung: '1-0-1-0', grund: 'Diabetes Typ 2' },
      { wirkstoff: 'Simvastatin',  handelsname: 'Simvastatin AL 20', staerke: '20 mg',  form: 'Tabls', dosierung: '0-0-1-0', grund: 'Hypercholest.' },
    ],
  },
  {
    datum: '12.01.2025', arzt: 'Dr. Müller', meds: [
      { wirkstoff: 'Tramadol',      handelsname: 'Tramal long 100', staerke: '100 mg', form: 'Retard', dosierung: '1-0-1-0', grund: 'Postoperative Schmerzen' },
      { wirkstoff: 'Pantoprazol',   handelsname: 'Pantoprazol TAD', staerke: '40 mg',  form: 'Tabls',  dosierung: '1-0-0-0', grund: 'Magenschutz' },
      { wirkstoff: 'Novaminsulfon', handelsname: 'Novalgin',        staerke: '500 mg', form: 'Tabls',  dosierung: '1-1-1-1', grund: 'Schmerzen' },
      { wirkstoff: 'Enoxaparin',    handelsname: 'Clexane 40',      staerke: '40 mg',  form: 'Inj.',   dosierung: '0-0-1-0', grund: 'Thromboseprophylaxe' },
    ],
  },
  {
    datum: '03.09.2024', arzt: 'Dr. Müller', meds: [
      { wirkstoff: 'Levothyroxin', handelsname: 'L-Thyroxin 75',     staerke: '75 µg',  form: 'Tabls',   dosierung: '1-0-0-0', grund: 'Hypothyreose' },
      { wirkstoff: 'Metformin',    handelsname: 'Metformin AL',      staerke: '850 mg', form: 'Tabls',   dosierung: '1-0-1-0', grund: 'Diabetes Typ 2' },
      { wirkstoff: 'Ramipril',     handelsname: 'Delix 5mg',         staerke: '5 mg',   form: 'Tabls',   dosierung: '1-0-0-0', grund: 'Hypertonie' },
      { wirkstoff: 'Amlodipin',    handelsname: 'Amlodipin-1A',      staerke: '5 mg',   form: 'Tabls',   dosierung: '0-0-1-0', grund: 'Hypertonie' },
      { wirkstoff: 'Bisoprolol',   handelsname: 'Bisoprolol-TAD',    staerke: '2,5 mg', form: 'Tabls',   dosierung: '1-0-0-0', grund: 'Hypertonie' },
      { wirkstoff: 'Simvastatin',  handelsname: 'Simvastatin AL 20', staerke: '20 mg',  form: 'Tabls',   dosierung: '0-0-1-0', grund: 'Hypercholest.' },
      { wirkstoff: 'ASS',          handelsname: 'ASS 100 Hexal',     staerke: '100 mg', form: 'Tabls',   dosierung: '1-0-0-0', grund: 'Sekundärprophylaxe' },
      { wirkstoff: 'Omeprazol',    handelsname: 'Omeprazol Heumann', staerke: '20 mg',  form: 'Kapseln', dosierung: '1-0-0-0', grund: 'Magenschutz' },
    ],
  },
];
