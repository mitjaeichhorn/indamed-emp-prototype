import { Component, signal, computed, inject, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import {
  DialogShellComponent,
  TitleBandComponent,
  ButtonComponent,
  BadgeComponent,
  HotkeyComponent,
  ModalComponent,
  ContextMenuComponent,
  ContextMenuItem,
  InputComponent,
  VorschauBoxComponent,
  AltHintService,
  KeyValueListComponent,
  KeyValueRowComponent,
} from '@indamed/ui';

import { EmpPlanTableComponent, MedGroup } from './components/emp-plan-table.component';
import { EmpSourcesPanelComponent } from './components/emp-sources-panel.component';
import { EmpBearbeitenModalComponent } from './components/emp-bearbeiten-modal.component';
import { EmpPastPlanModalComponent } from './components/emp-past-plan-modal.component';

import {
  PATIENT,
  AKTIVE_MEDIKATION,
  PAUSIERTE_MEDIKATION,
  GEPLANTE_MEDIKATION,
  EML_ROWS,
  KARTEIKARTE_ROWS,
  PAST_PLANS,
  MedEntry,
  EmlRow,
  KarteikartzeRow,
  PastPlanEntry,
  PastPlanMed,
} from '../../data/emp-data';

export interface ConfirmOptions {
  title:   string;
  message: string;
  danger:  boolean;
  action:  () => void;
}

export interface ContextMenuState {
  med: MedEntry;
  x:   number;
  y:   number;
}

export interface DosageFields {
  morgens: string;
  mittags: string;
  abends:  string;
  nachts:  string;
}

function parseDosage(dos: string): DosageFields {
  const parts = dos.split('-');
  if (parts.length === 4) {
    return { morgens: parts[0], mittags: parts[1], abends: parts[2], nachts: parts[3] };
  }
  return { morgens: dos, mittags: '', abends: '', nachts: '' };
}

function formatDosage(f: DosageFields): string {
  if (f.mittags !== '' || f.abends !== '' || f.nachts !== '') {
    return `${f.morgens}-${f.mittags}-${f.abends}-${f.nachts}`;
  }
  return f.morgens;
}

// Note: DosageFields/parseDosage/formatDosage are still used by the eML import
// modal which is inline in this screen. The bearbeiten modal has its own copy
// inside the extracted component.

@Component({
  selector: 'app-emp-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    DialogShellComponent,
    TitleBandComponent,
    ButtonComponent,
    BadgeComponent,
    HotkeyComponent,
    ModalComponent,
    ContextMenuComponent,
    InputComponent,
    VorschauBoxComponent,
    EmpPlanTableComponent,
    EmpSourcesPanelComponent,
    EmpBearbeitenModalComponent,
    EmpPastPlanModalComponent,
    KeyValueListComponent,
    KeyValueRowComponent,
    SplitComponent,
    SplitAreaComponent,
  ],
  templateUrl: './emp-screen.html',
  styleUrl:    './emp-screen.scss',
})
export class EmpScreenComponent {

  /** Toggles the body.inm-alt-sticky class to pin/un-pin all hotkey hints. */
  readonly altHints = inject(AltHintService);

  // ── BACKEND-INTEGRATION (Read-Side) ─────────────────────────────────────
  // Im Prototyp werden statische Konstanten aus `emp-data.ts` zugewiesen.
  // Produktiv:
  //   constructor(private api: EmpBackendService) {}
  //   readonly patient  = toSignal(this.api.getPatient(patientId),       { initialValue: null });
  //   readonly aktive   = toSignal(this.api.getMedications('active'),    { initialValue: [] });
  //   readonly pausiert = toSignal(this.api.getMedications('paused'),    { initialValue: [] });
  //   readonly geplant  = toSignal(this.api.getMedications('planned'),   { initialValue: [] });
  //   readonly emlRows  = toSignal(this.api.getEml(),                    { initialValue: [] });
  //   readonly kkRows   = toSignal(this.api.getKarteikarte(),            { initialValue: [] });
  //   readonly plans    = toSignal(this.api.getPastPlans(),              { initialValue: [] });
  // Endpoints und Response-Shapes sind in `data/emp-data.ts` annotiert.
  // Beispiel-Service: `data/emp-backend.service.example.ts`
  // ────────────────────────────────────────────────────────────────────────
  readonly patient  = PATIENT;
  readonly aktive   = AKTIVE_MEDIKATION;
  readonly pausiert = PAUSIERTE_MEDIKATION;
  readonly geplant  = GEPLANTE_MEDIKATION;
  readonly emlRows  = EML_ROWS;
  readonly kkRows   = KARTEIKARTE_ROWS;
  readonly plans    = PAST_PLANS;

  /** Common indications for the Grund / Indikation datalist in the eML
   *  import modal. Mirrors the list in emp-bearbeiten-modal. */
  readonly grundSuggestions: string[] = [
    'Arterielle Hypertonie',
    'Bluthochdruck',
    'Herzinsuffizienz',
    'Vorhofflimmern',
    'Koronare Herzkrankheit',
    'Sekundärprophylaxe',
    'Hypercholesterinämie',
    'Diabetes mellitus Typ 2',
    'Hypothyreose',
    'Osteoporose',
    'Asthma bronchiale',
    'COPD',
    'Magenschutz',
    'Refluxösophagitis',
    'Schmerztherapie',
    'Migräne',
    'Rheuma',
    'Antikoagulation',
    'Hyperurikämie',
    'Allergie',
  ];

  readonly rowMenuItems: ContextMenuItem[] = [
    { icon: 'pencil-simple',   label: 'Bearbeiten' },
    { separator: true },
    { icon: 'arrow-clockwise', label: 'Wiederholen' },
    { icon: 'swap',            label: 'Austauschen' },
    { separator: true },
    { icon: 'pause-circle',    label: 'Pausieren' },
    { icon: 'x-circle',        label: 'Beenden', danger: true },
  ];

  // ── View state ────────────────────────────────────────────────
  expandedRows    = signal<Set<string>>(new Set());
  collapsedGroups = signal<Set<MedGroup>>(new Set());
  planSearch      = signal<string>('');
  hideUsedSrc     = signal<boolean>(false);

  toggleGroup(g: MedGroup): void {
    const s = new Set(this.collapsedGroups());
    s.has(g) ? s.delete(g) : s.add(g);
    this.collapsedGroups.set(s);
  }

  isGroupCollapsed(g: MedGroup): boolean {
    return this.collapsedGroups().has(g);
  }

  // ── Context menu ──────────────────────────────────────────────
  ctxMenu = signal<ContextMenuState | null>(null);

  // ── Med detail modal ──────────────────────────────────────────
  medDetailMed  = signal<MedEntry | null>(null);
  medDetailOpen = signal(false);

  // ── Bearbeiten modal — state owned by the extracted component;
  //    we just hold the currently-edited row + open flag ─────────
  bearbeitenMed  = signal<MedEntry | null>(null);
  bearbeitenOpen = signal(false);

  // ── eML import modal ─────────────────────────────────────────
  emlRow       = signal<EmlRow | null>(null);
  emlOpen      = signal(false);
  emlDosage    = signal<DosageFields>({ morgens: '', mittags: '', abends: '', nachts: '' });
  emlHinweise  = signal('');
  emlGrund     = signal('');
  emlIcd       = signal('');
  emlBeginn    = signal('');

  // ── ABDATA medication search modal ───────────────────────────
  abdataOpen      = signal(false);
  abdataWithRezept = signal(true);
  abdataSearch    = signal('');

  // ── eML / Source / Past-plan detail modals ───────────────────
  emlDetailRow   = signal<EmlRow | null>(null);
  emlDetailOpen  = signal(false);

  /** V/D field pair for the eML detail comparison view. The clicked row supplies
   *  one side (V or D); the counterpart is synthesised so the prototype can
   *  demonstrate the diff highlights without a real link between V and D records. */
  emlDetailFields = computed<{ label: string; v: string; d: string; differs: boolean }[]>(() => {
    const row = this.emlDetailRow();
    if (!row) return [];
    const isV = row.typ === 'V';

    const own = {
      datum:         row.datum,
      wirkstoff:     row.wirkstoff,
      handelsname:   row.handelsname,
      wirkstaerke:   row.staerke,
      form:          row.form,
      dosierangabe:  row.dosierung,
      grund:         'Bluthochdruck',
      abgabehinweis: '—',
      autIdem:       'Nein',
      privatrezept:  'Nein',
    };

    const counterpart = {
      ...own,
      datum:        this.shiftDate(row.datum, isV ? 8 : -8),
      handelsname:  this.alternativeBrand(row.handelsname),
      privatrezept: '—',
    };

    const v = isV ? own : counterpart;
    const d = isV ? counterpart : own;

    const FIELDS: { key: keyof typeof own; label: string }[] = [
      { key: 'datum',         label: 'Datum' },
      { key: 'wirkstoff',     label: 'Wirkstoff' },
      { key: 'handelsname',   label: 'Handelsname' },
      { key: 'wirkstaerke',   label: 'Wirkstärke' },
      { key: 'form',          label: 'Form' },
      { key: 'dosierangabe',  label: 'Dosierangabe' },
      { key: 'grund',         label: 'Grund' },
      { key: 'abgabehinweis', label: 'Abgabehinweis' },
      { key: 'autIdem',       label: 'Aut idem (Ja/Nein)' },
      { key: 'privatrezept',  label: 'Privatrezept (Ja/Nein)' },
    ];

    return FIELDS.map(f => ({
      label:   f.label,
      v:       v[f.key],
      d:       d[f.key],
      differs: v[f.key] !== d[f.key],
    }));
  });

  private shiftDate(date: string, days: number): string {
    const [d, m, y] = date.split('.').map(Number);
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() + days);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
  }

  private alternativeBrand(brand: string): string {
    return brand.replace(/[ -](TAD|Heumann|AL|1A|Basics|Pharma|Generika)$/i, '').trim() + ' Generika';
  }

  srcDetailRow   = signal<KarteikartzeRow | null>(null);
  srcDetailOpen  = signal(false);

  pastPlanRow    = signal<PastPlanEntry | null>(null);
  pastPlanOpen   = signal(false);

  // ── Source-row context menu (eML / Karteikarte ⋮) ────────────
  srcCtxMenu = signal<{ source: 'eml' | 'kk'; x: number; y: number } | null>(null);

  readonly srcRowMenuItems: ContextMenuItem[] = [
    { icon: 'arrow-up-right', label: 'In Plan übernehmen' },
    { icon: 'pencil-simple',  label: 'Editieren und übernehmen' },
    { separator: true },
    { icon: 'eye',            label: 'Detail anzeigen' },
    { icon: 'check',          label: 'Als verwendet markieren' },
  ];

  // ── Confirm modal ─────────────────────────────────────────────
  confirm     = signal<ConfirmOptions | null>(null);
  confirmOpen = signal(false);

  // ── Derived ──────────────────────────────────────────────────
  /** Wirkstoffe currently in the active plan — used by the past-plan modal
   *  to mark rows as "Bereits im Plan". */
  aktiveWirkstoffe = computed(() => this.aktive.map(m => m.wirkstoff));

  // (filteredAktive moved into emp-plan-table — search filtering now lives
  //  in each sub-component along with highlighting.)

  // ── Row expand ───────────────────────────────────────────────
  toggleRow(id: string): void {
    const s = new Set(this.expandedRows());
    s.has(id) ? s.delete(id) : s.add(id);
    this.expandedRows.set(s);
  }

  isExpanded(id: string): boolean { return this.expandedRows().has(id); }

  // ── Med detail ───────────────────────────────────────────────
  openMedDetail(med: MedEntry, event: Event): void {
    event.stopPropagation();
    this.medDetailMed.set(med);
    this.medDetailOpen.set(true);
  }

  // ── Context menu ─────────────────────────────────────────────
  openRowMenu(med: MedEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.ctxMenu.set({ med, x: event.clientX, y: event.clientY });
  }

  onRowMenuAction(label: string): void {
    const med = this.ctxMenu()?.med;
    this.ctxMenu.set(null);
    if (!med) return;

    switch (label) {
      case 'Bearbeiten':
        this.openBearbeiten(med);
        break;
      case 'Pausieren':
        this.openConfirm({
          title:   'Medikament pausieren',
          message: `Möchten Sie „${med.wirkstoff}" wirklich pausieren?`,
          danger:  true,
          // BACKEND-INTEGRATION — Medikament pausieren
          //   PATCH /api/patients/{patientId}/medications/{med.id}
          //   Body:    { "status": "paused", "endDate": "<heute, TT.MM.JJJJ>" }
          //   Returns: aktualisierter MedEntry (siehe emp-data.ts)
          //   On success: Liste 'aktive' refetchen ODER lokal in 'pausiert' verschieben.
          action:  () => { /* prototype: no-op */ },
        });
        break;
      case 'Beenden':
        this.openConfirm({
          title:   'Medikament beenden',
          message: `Möchten Sie „${med.wirkstoff}" wirklich beenden?`,
          danger:  true,
          // BACKEND-INTEGRATION — Medikament beenden
          //   PATCH /api/patients/{patientId}/medications/{med.id}
          //   Body:    { "status": "ended", "endDate": "<heute, TT.MM.JJJJ>" }
          //   Returns: aktualisierter MedEntry; aus 'aktive' entfernen.
          action:  () => { /* prototype: no-op */ },
        });
        break;
    }
  }

  @HostListener('document:click')
  closeCtxMenu(): void {
    this.ctxMenu.set(null);
    this.srcCtxMenu.set(null);
  }

  // ── Bearbeiten ───────────────────────────────────────────────
  openBearbeiten(med: MedEntry): void {
    this.bearbeitenMed.set(med);
    this.bearbeitenOpen.set(true);
  }

  /** Opens the Bearbeiten modal and focuses the first dosage input.
   *  Triggered by clicking the Dosierangabe cell in the plan table. */
  openBearbeitenForDosage(med: MedEntry): void {
    this.openBearbeiten(med);
    // Defer until the modal's dosage section has rendered.
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '.dosage-grid .dos-input-num',
      );
      input?.focus();
      input?.select();
    }, 50);
  }

  /** "Editieren und übernehmen" from the eML V/D modal — open the same
   *  Bearbeiten dialog used for plan rows. If a matching active med exists
   *  we hand it to the modal; otherwise we synthesise a minimal MedEntry
   *  from the eML record so the form is pre-filled. */
  openBearbeitenFromEml(row: EmlRow): void {
    this.emlDetailOpen.set(false);
    const existing = this.aktive.find(
      m => m.wirkstoff.toLowerCase() === row.wirkstoff.toLowerCase(),
    );
    const med: MedEntry = existing ?? {
      id:          'eml-' + row.id,
      wirkstoff:   row.wirkstoff,
      handelsname: row.handelsname,
      staerke:     row.staerke,
      form:        row.form,
      dosierung:   row.dosierung,
      hinweise:    '',
      grund:       '',
      rw:          0,
      art:         '',
      details: {
        versicherte:  '',
        mitbehandler: '',
        beginn:       row.datum,
        icd:          '',
        historie:     [],
      },
    };
    this.openBearbeiten(med);
  }

  /** "Editieren und übernehmen" from the Karteikarte detail modal — same
   *  Bearbeiten dialog. Karteikarte rows only carry a free-text description
   *  (e.g. "IBUPROFEN AL 2% SAFT"), so we parse it into wirkstoff / staerke /
   *  form when no matching active med is found. */
  openBearbeitenFromKk(row: KarteikartzeRow): void {
    this.srcDetailOpen.set(false);
    const existing = this.aktive.find(
      m => row.text.toLowerCase().includes(m.wirkstoff.toLowerCase()),
    );
    const med: MedEntry = existing ?? this.medFromKkText(row);
    this.openBearbeiten(med);
  }

  /** Best-effort parse of "WIRKSTOFF [BRAND] STÄRKE FORM" → MedEntry fields. */
  private medFromKkText(row: KarteikartzeRow): MedEntry {
    const text = row.text.trim();
    // Stärke: first number + optional decimal + unit (mg, µg, g, ml, %, IE, …).
    const staerkeMatch = text.match(/\d+(?:[.,]\d+)?\s*(?:mg|µg|mcg|g|ml|%|i\.?e\.?|hub|stk)\b/i);
    const staerke = staerkeMatch?.[0] ?? '';
    // Form: last token if it looks like a galenic form abbreviation.
    const tokens   = text.replace(staerke, '').trim().split(/\s+/);
    const formSet  = new Set(['TAB','TABL','TABLS','TBL','KAPS','KAP','HKP','SAFT','TR','TRP','AMP','SUPP','SAL','PUL','SPR','CR']);
    const last     = tokens[tokens.length - 1] ?? '';
    const form     = formSet.has(last.toUpperCase()) ? last : '';
    // Wirkstoff: first word, title-cased so it matches the Bearbeiten layout.
    const first    = tokens[0] ?? text;
    const wirkstoff = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

    return {
      id:          'kk-' + row.id,
      wirkstoff,
      handelsname: text,
      staerke,
      form,
      dosierung:   '',
      hinweise:    '',
      grund:       '',
      rw:          0,
      art:         '',
      details: {
        versicherte:  '',
        mitbehandler: '',
        beginn:       row.datum,
        icd:          '',
        historie:     [],
      },
    };
  }

  /** Called by emp-bearbeiten-modal when its inner Pausieren button is hit. */
  onBearbeitenPausieren(med: MedEntry): void {
    this.bearbeitenOpen.set(false);
    this.openConfirm({
      title:   'Medikament pausieren',
      message: `Möchten Sie „${med.wirkstoff}" wirklich pausieren?`,
      danger:  true,
      // BACKEND-INTEGRATION — siehe `onRowMenuAction` (PATCH ... { status: 'paused' }).
      action:  () => { /* prototype: no-op */ },
    });
  }

  /** Called by emp-bearbeiten-modal when its inner Beenden button is hit. */
  onBearbeitenBeenden(med: MedEntry): void {
    this.bearbeitenOpen.set(false);
    this.openConfirm({
      title:   'Medikament beenden',
      message: `Möchten Sie „${med.wirkstoff}" wirklich beenden?`,
      danger:  true,
      // BACKEND-INTEGRATION — siehe `onRowMenuAction` (PATCH ... { status: 'ended' }).
      action:  () => { /* prototype: no-op */ },
    });
  }

  /** Called by emp-bearbeiten-modal when "m. Austausch" is hit. */
  onBearbeitenAustausch(_med: MedEntry): void {
    this.bearbeitenOpen.set(false);
    this.openAbdata(true);
  }

  /** Called by emp-bearbeiten-modal on close (cancel or save). */
  onBearbeitenClosed(): void {
    this.bearbeitenOpen.set(false);
  }

  // ── eML import ────────────────────────────────────────────────
  openEmlImport(row: EmlRow, event: Event): void {
    event.stopPropagation();
    this.emlRow.set(row);
    this.emlDosage.set(parseDosage(row.dosierung));
    this.emlHinweise.set('');
    this.emlGrund.set('');
    this.emlIcd.set('');
    this.emlBeginn.set('');
    this.emlOpen.set(true);
  }

  submitEmlImport(): void {
    // BACKEND-INTEGRATION — eML-Eintrag in den aktiven Plan übernehmen
    //
    //   POST /api/patients/{patientId}/medications
    //   Body:
    //     {
    //       "sourceType":  "eml",                       // "eml" | "karteikarte" | "pastPlan" | "manual"
    //       "sourceRef":   "<emlRow.id>",               // Rückverweis auf Quelle (für Audit)
    //       "wirkstoff":   "Bisoprolol",
    //       "handelsname": "Bisoprolol-TAD",
    //       "staerke":     "2,5 mg",
    //       "form":        "Tabls",
    //       "dosierung":   "1-0-0-0",                   // 'M-M-A-N' oder Freitext
    //       "hinweise":    "Nüchtern einnehmen",        // optional
    //       "grund":       "Bluthochdruck",             // Indikation als Klartext
    //       "icd":         "I10",                       // ICD-10
    //       "beginn":      "10.05.2026"                 // 'TT.MM.JJJJ'
    //     }
    //   Response 201: vollständiger MedEntry (siehe emp-data.ts) inkl. Backend-`id`.
    //   Errors:       400 (Validation), 409 (Wirkstoff bereits aktiv).
    //   On success:   `aktive` neu laden + `emlRows` refetchen (uebernommen=true).
    console.log('eML übernehmen:', {
      sourceType: 'eml',
      sourceRef:  this.emlRow()?.id,
      wirkstoff:  this.emlRow()?.wirkstoff,
      dosierung:  formatDosage(this.emlDosage()),
      hinweise:   this.emlHinweise(),
      grund:      this.emlGrund(),
      icd:        this.emlIcd(),
      beginn:     this.emlBeginn(),
    });
    this.emlOpen.set(false);
  }

  // ── Source row clicks (open detail views) ────────────────────
  openEmlDetail(row: EmlRow): void {
    this.emlDetailRow.set(row);
    this.emlDetailOpen.set(true);
  }

  openKkDetail(row: KarteikartzeRow): void {
    this.srcDetailRow.set(row);
    this.srcDetailOpen.set(true);
  }

  openPastPlan(plan: PastPlanEntry): void {
    this.pastPlanRow.set(plan);
    this.pastPlanOpen.set(true);
  }

  /** Past-plan row → "Editieren und übernehmen": close the past-plan modal
   *  and hand the row to the same Bearbeiten dialog used by the plan table.
   *  If a matching active med exists we reuse it; otherwise synthesise.
   *
   *  BACKEND-INTEGRATION: kein Direkt-Call. Speichern aus dem Bearbeiten-Modal
   *  triggert POST /api/patients/{id}/medications (Body wie bei `submitEmlImport`,
   *  sourceType="pastPlan"). */
  onPastPlanAdopt(med: PastPlanMed): void {
    this.pastPlanOpen.set(false);
    const existing = this.aktive.find(
      m => m.wirkstoff.toLowerCase() === med.wirkstoff.toLowerCase(),
    );
    const entry: MedEntry = existing ?? {
      id:          'pp-' + med.wirkstoff,
      wirkstoff:   med.wirkstoff,
      handelsname: med.handelsname,
      staerke:     med.staerke,
      form:        med.form,
      dosierung:   med.dosierung,
      hinweise:    '',
      grund:       med.grund,
      rw:          0,
      art:         '',
      details: {
        versicherte:  '',
        mitbehandler: '',
        beginn:       '',
        icd:          '',
        historie:     [],
      },
    };
    this.openBearbeiten(entry);
  }

  // ── ABDATA modal ─────────────────────────────────────────────
  // BACKEND-INTEGRATION — ABDATA-Suche (Arzneimittel-Datenbank)
  //
  //   GET /api/abdata/search?q={query}&withRezept={true|false}
  //
  // Live-Such-Endpoint (debounce ≥ 250 ms im UI). Response 200:
  //   [
  //     {
  //       "pzn":         "12345678",                  // 8-stellige PZN
  //       "wirkstoff":   "Ibuprofen",
  //       "handelsname": "Ibuprofen AL 600",
  //       "staerke":     "600 mg",
  //       "form":        "Tabls",
  //       "rezeptpflichtig": true,
  //       "hersteller":  "Aliud Pharma"
  //     }, ...
  //   ]
  // Bei Auswahl: Daten in den Bearbeiten-Modal übernehmen, kein Direkt-Save.
  openAbdata(withRezept: boolean): void {
    this.abdataWithRezept.set(withRezept);
    this.abdataSearch.set('');
    this.abdataOpen.set(true);
  }

  // ── Source row context menu ─────────────────────────────────
  openSrcRowMenu(source: 'eml' | 'kk', event: MouseEvent): void {
    event.stopPropagation();
    this.srcCtxMenu.set({ source, x: event.clientX, y: event.clientY });
  }

  onSrcRowMenuAction(label: string): void {
    const menu = this.srcCtxMenu();
    this.srcCtxMenu.set(null);
    if (!menu) return;
    // BACKEND-INTEGRATION — Aktionen auf Quellzeilen (eML / Karteikarte):
    //
    //   "In Plan übernehmen"          → POST /api/patients/{id}/medications
    //                                    Body wie bei `submitEmlImport`,
    //                                    sourceType = menu.source ('eml' | 'karteikarte').
    //
    //   "Editieren und übernehmen"    → kein Backend-Call hier; öffnet
    //                                    Bearbeiten-Modal (siehe openBearbeitenFromEml/Kk),
    //                                    Speichern dort triggert dann POST.
    //
    //   "Detail anzeigen"             → kein Backend (öffnet Detail-Modal).
    //
    //   "Als verwendet markieren"     → PATCH /api/patients/{id}/sources/{eml|karteikarte}/{rowId}
    //                                    Body: { "used": true }
    //                                    Returns: 204; UI-State `used`/`uebernommen` setzen.
    console.log(`source ${menu.source} action:`, label);
  }

  // ── Confirm ───────────────────────────────────────────────────
  openConfirm(opts: ConfirmOptions): void {
    this.confirm.set(opts);
    this.confirmOpen.set(true);
  }

  runConfirm(): void {
    this.confirm()?.action();
    this.confirmOpen.set(false);
  }
}
