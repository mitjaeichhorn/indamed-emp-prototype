import { Component, signal, computed, inject, viewChild, ChangeDetectionStrategy, HostListener } from '@angular/core';
import { SplitComponent, SplitAreaComponent } from 'angular-split';
import {
  DialogShellComponent,
  TitleBandComponent,
  ButtonComponent,
  HotkeyComponent,
  ContextMenuComponent,
  ContextMenuItem,
  AltHintService,
} from '@indamed/ui';

import { EmpPlanTableComponent, MedGroup } from './components/emp-plan-table.component';
import { EmpSourcesPanelComponent } from './components/emp-sources-panel.component';
import { EmpBearbeitenModalComponent } from './components/emp-bearbeiten-modal.component';
import { EmpPastPlanModalComponent } from './components/emp-past-plan-modal.component';
import { EmpConfirmModalComponent, ConfirmOptions } from './components/emp-confirm-modal.component';
import { EmpAbdataModalComponent } from './components/emp-abdata-modal.component';
import { EmpKarteikarteDetailModalComponent } from './components/emp-karteikarte-detail-modal.component';
import { EmpMedDetailModalComponent } from './components/emp-med-detail-modal.component';
import { EmpEmlDetailModalComponent } from './components/emp-eml-detail-modal.component';
import {
  EmpEmlImportModalComponent,
  EmlImportSubmitPayload,
} from './components/emp-eml-import-modal.component';

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
  KarteikarteRow,
  PastPlanEntry,
  PastPlanMed,
} from '../../data/emp-data';
import { medFromEmlRow, medFromKkRow, medFromPastPlanMed } from '../../data/med-adapter';

export interface ContextMenuState {
  med: MedEntry;
  x:   number;
  y:   number;
}

@Component({
  selector: 'app-emp-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    DialogShellComponent,
    TitleBandComponent,
    ButtonComponent,
    HotkeyComponent,
    ContextMenuComponent,
    EmpPlanTableComponent,
    EmpSourcesPanelComponent,
    EmpBearbeitenModalComponent,
    EmpPastPlanModalComponent,
    EmpConfirmModalComponent,
    EmpAbdataModalComponent,
    EmpKarteikarteDetailModalComponent,
    EmpMedDetailModalComponent,
    EmpEmlDetailModalComponent,
    EmpEmlImportModalComponent,
    SplitComponent,
    SplitAreaComponent,
  ],
  templateUrl: './emp-screen.html',
  styleUrl:    './emp-screen.scss',
})
export class EmpScreenComponent {

  /** Toggles the body.inm-alt-sticky class to pin/un-pin all hotkey hints. */
  readonly altHints = inject(AltHintService);

  /** Reference to the Bearbeiten modal for deterministic dosage-input focus
   *  when the dialog is opened from the Dosierangabe table cell. */
  private readonly bearbeitenModal = viewChild(EmpBearbeitenModalComponent);

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
  collapsedGroups = signal<Set<MedGroup>>(new Set(['beendet']));
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

  // ── eML import modal — form state lives inside the extracted child;
  //    presence of `emlRow` is the open flag.
  emlRow  = signal<EmlRow | null>(null);

  // ── ABDATA medication search modal ───────────────────────────
  abdataOpen      = signal(false);
  abdataWithRezept = signal(true);
  abdataSearch    = signal('');

  // ── eML / Source / Past-plan detail modals ───────────────────
  emlDetailRow   = signal<EmlRow | null>(null);
  emlDetailOpen  = signal(false);

  srcDetailRow   = signal<KarteikarteRow | null>(null);
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

  // ── Confirm modal — presence == open, no separate flag ─────────
  confirm = signal<ConfirmOptions | null>(null);

  // ── Derived ──────────────────────────────────────────────────
  /** Wirkstoffe currently in the active plan — used by the past-plan modal
   *  to mark rows as "Bereits im Plan". */
  aktiveWirkstoffe = computed(() => this.aktive.map(m => m.wirkstoff));

  /** Total count of rows marked `geaendert` across all groups — drives the
   *  badge next to "Medikationsplan aktualisieren". */
  changedCount = computed(() =>
    [...this.aktive, ...this.pausiert, ...this.geplant]
      .filter(m => m.geaendert).length,
  );

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
   *  Triggered by clicking the Dosierangabe cell in the plan table.
   *  Focus is queued via `afterNextRender` inside the modal so the input
   *  exists in the DOM before we call `.focus()` — no setTimeout race. */
  openBearbeitenForDosage(med: MedEntry): void {
    this.openBearbeiten(med);
    this.bearbeitenModal()?.focusDosage();
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
    this.openBearbeiten(existing ?? medFromEmlRow(row));
  }

  /** "Editieren und übernehmen" from the Karteikarte detail modal — same
   *  Bearbeiten dialog. Karteikarte rows only carry a free-text description
   *  (e.g. "IBUPROFEN AL 2% SAFT"); `medFromKkRow` parses it into a partial
   *  MedEntry when no matching active med is found. */
  openBearbeitenFromKk(row: KarteikarteRow): void {
    this.srcDetailOpen.set(false);
    const existing = this.aktive.find(
      m => row.text.toLowerCase().includes(m.wirkstoff.toLowerCase()),
    );
    this.openBearbeiten(existing ?? medFromKkRow(row));
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
    this.emlRow.set(row);     // presence == open; form state lives in the modal
  }

  /**
   * Emitted by `<emp-eml-import-modal>` on "In Plan übernehmen".
   *
   * BACKEND-INTEGRATION — eML-Eintrag in den aktiven Plan übernehmen
   *
   *   POST /api/patients/{patientId}/medications
   *   Body: `EmlImportSubmitPayload` (shape defined alongside the modal).
   *   Response 201: vollständiger MedEntry. On success: refetch `aktive`
   *   and `emlRows` (the latter to flip uebernommen=true on the source).
   *   Errors: 400 (Validation), 409 (Wirkstoff bereits aktiv).
   */
  submitEmlImport(payload: EmlImportSubmitPayload): void {
    console.log('eML übernehmen:', payload);
    this.emlRow.set(null);
  }

  // ── Source row clicks (open detail views) ────────────────────
  openEmlDetail(row: EmlRow): void {
    this.emlDetailRow.set(row);
    this.emlDetailOpen.set(true);
  }

  openKkDetail(row: KarteikarteRow): void {
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
    this.openBearbeiten(existing ?? medFromPastPlanMed(med));
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
  }

  closeConfirm(): void {
    this.confirm.set(null);
  }
}
