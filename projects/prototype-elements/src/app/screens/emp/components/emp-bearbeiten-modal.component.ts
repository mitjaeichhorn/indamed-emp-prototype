import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  ElementRef,
  Injector,
  afterNextRender,
  inject,
  signal,
  computed,
  viewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ModalComponent,
  ButtonComponent,
  InputComponent,
  SelectComponent,
  VorschauBoxComponent,
  KeyValueListComponent,
  KeyValueRowComponent,
  PatientData,
} from '@indamed/ui';
import { MedEntry } from '../../../data/emp-data';

interface DosageFields {
  morgens: string;
  mittags: string;
  abends:  string;
  nachts:  string;
}

type DosisTyp = 'taeglich-tz' | 'taeglich-uz' | 'woechentlich' | 'intervall';

/** Wöchentlich — per-day data. `mode` is the last saved kind of input
 *  (null = no entry yet). Both TZ values and UZ pairs are kept on the
 *  object so switching modes mid-edit doesn't lose the other data. */
interface WkDayData {
  day:     string;
  mode:    'tz' | 'uz' | null;
  tzVals:  [string, string, string, string];   // morgens, mittags, abends, nachts
  uzPairs: { time: string; qty: string }[];
}

const WK_DAY_NAMES = ['Montag','Dienstag','Mittwoch','Donnerstag','Freitag','Samstag','Sonntag'] as const;
const TZ_LABELS    = ['morgens','mittags','abends','nachts'] as const;

function emptyWkDays(): WkDayData[] {
  return WK_DAY_NAMES.map(day => ({
    day, mode: null, tzVals: ['','','',''] as [string, string, string, string], uzPairs: [],
  }));
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

/**
 * Bearbeiten modal — full-form medication editor with patient-context strip,
 * top action row (Wiederholen/m. Austausch/Pausieren/Beenden), readonly
 * Medikament block, dosage editor, Hinweise, and Eintragsdaten.
 *
 * Owns its own form state. When `med` changes, the form is reset from
 * the new med's values. Emits `closed`, `pausieren`, `beenden`, `austausch`.
 *
 * Planned refactor — `DosisTyp`-axis split (deferred)
 * ────────────────────────────────────────────────────
 * This component grew along the four scheduling modes (Täglich-TZ,
 * Täglich-UZ, Wöchentlich, Intervall). Each mode owns its own state shape,
 * its own vorschau computed, and its own keyboard / suggestion logic — they
 * are effectively a discriminated-union UI living inside one class.
 *
 * The clean target structure is:
 *
 *   emp-bearbeiten-modal             ← stays as the shell:
 *     - Medikament readonly block
 *     - DosisTyp / Einheit selects
 *     - Vorschau strip (delegates text to the active mode)
 *     - Grund / ICD / Beginn / Hinweise (shared across modes)
 *     - Top action row + save / cancel footer
 *
 *   components/dosage/
 *     dosage-tz.component            ← Täglich · Tageszeiten (4 inputs + suggestions)
 *     dosage-uz.component            ← Täglich · Uhrzeiten (list of {time, amount})
 *     dosage-woechentlich.component  ← per-day editor
 *     dosage-intervall.component     ← alle N Tage/Wochen/Monate + TZ or UZ
 *
 *   data/dosage-schedule.ts          ← shared types: DosisTyp, DosageSchedule,
 *                                       WkDayData, etc., plus DOSAGE_PATTERNS
 *
 * Why this is deferred from the post-audit refactor batch: it changes zero
 * user-visible behaviour but reshuffles ~400 LOC of form logic. Without
 * test coverage on the dosage modes, an unobserved regression in
 * mode-switching, keyboard nav, or vorschau formatting would be easy to
 * miss. The split deserves its own focused branch with at least snapshot
 * tests per mode before landing.
 */
@Component({
  selector: 'emp-bearbeiten-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormsModule,
    ModalComponent,
    ButtonComponent,
    InputComponent,
    SelectComponent,
    VorschauBoxComponent,
    KeyValueListComponent,
    KeyValueRowComponent,
  ],
  templateUrl: './emp-bearbeiten-modal.component.html',
  styleUrl:    './emp-bearbeiten-modal.component.scss',
})
export class EmpBearbeitenModalComponent {
  @Input() open = false;
  @Input() patient!: PatientData;

  private _med = signal<MedEntry | null>(null);
  get med(): MedEntry | null { return this._med(); }
  @Input() set med(value: MedEntry | null) {
    this._med.set(value);
    if (value) this.resetForm(value);
  }

  @Output() closed    = new EventEmitter<void>();
  @Output() pausieren = new EventEmitter<MedEntry>();
  @Output() beenden   = new EventEmitter<MedEntry>();
  @Output() austausch = new EventEmitter<MedEntry>();

  /** Reference to the first dosage input (morgens) — used by `focusDosage()`
   *  to focus + select after the parent has opened the modal. The template
   *  binds it on the TZ-mode input. */
  private readonly firstDosageInput = viewChild<ElementRef<HTMLInputElement>>('firstDosageInput');
  private readonly injector = inject(Injector);

  /**
   * Public entry point for parents that want to open the modal directly on
   * the dosage editor (e.g. clicking the Dosierangabe cell in the plan
   * table). The parent flips `open` + `med` first; then calls this method.
   * `afterNextRender` waits for Angular to render the modal contents before
   * we touch the DOM — no `setTimeout` race.
   */
  focusDosage(): void {
    afterNextRender(
      () => {
        const el = this.firstDosageInput()?.nativeElement;
        el?.focus();
        el?.select();
      },
      { injector: this.injector },
    );
  }

  editDosistyp     = signal<DosisTyp>('taeglich-tz');
  editEinheit      = signal('Stück');
  editDosage       = signal<DosageFields>({ morgens: '0', mittags: '0', abends: '0', nachts: '0' });
  editGrund        = signal('');
  editIcd          = signal('');
  editBeginn       = signal('');
  editEnde         = signal('');
  editVersicherte  = signal('');
  editMitbehandler = signal('');

  /** Native HTML5 datalist suggestions for the two Hinweis fields. */
  readonly hinweisVersicherteSuggestions: string[] = [
    'Nüchtern einnehmen',
    'Nüchtern einnehmen, 30 Min vor dem Frühstück',
    'Morgens einnehmen',
    'Abends einnehmen',
    'Vor dem Schlafengehen',
    'Zu den Mahlzeiten',
    'Nach dem Essen',
    'Mit reichlich Wasser einnehmen',
    'Nicht zerkleinern',
    'Bei Bedarf',
    'Bei Schmerzen 1 Tbl., max. 4 Tbl. pro Tag',
  ];

  /** Native HTML5 datalist suggestions for the Grund/Indikation field. */
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

  readonly hinweisMitbehandlerSuggestions: string[] = [
    'Kardiologe informiert',
    'Hausarzt informiert',
    'Endokrinologe informiert',
    'INR-Kontrolle erforderlich',
    'Niereninsuffizienz beachten',
    'QT-Zeit überwachen',
    'Dosierung nach Blutzucker',
    'Spiegelkontrolle empfohlen',
    'Wechselwirkung beachten',
  ];

  /** Quick-pick patterns shown below the empty TZ grid; clicking one fills
   *  all 4 fields. Suggestions are gated on focus + empty state. */
  readonly dosagePatterns: { values: [string, string, string, string]; label: string }[] = [
    { values: ['1','0','0','0'], label: '1× morgens' },
    { values: ['0','0','1','0'], label: '1× abends' },
    { values: ['1','0','1','0'], label: 'morgens + abends' },
    { values: ['1','1','1','0'], label: '3× täglich' },
    { values: ['1','1','1','1'], label: '4× täglich' },
    { values: ['0','0','0','1'], label: '1× nachts' },
  ];

  dosageSuggestionsOpen = signal(false);
  /** Index of the currently highlighted suggestion (−1 = none). Driven by
   *  arrow-key navigation; mirrored as `aria-activedescendant` on inputs. */
  activeSuggestionIdx   = signal(-1);

  // Täglich · Uhrzeiten — list of {time, amount} rows.
  editUzRows = signal<{ time: string; amount: string }[]>([
    { time: '08:00', amount: '' },
  ]);

  /** Wöchentlich — per-day data with both TZ values and UZ pairs.
   *  `mode` records which dataset was last saved (null = no entry yet). */
  editWkDays = signal<WkDayData[]>(emptyWkDays());

  /** Whether new Wöchentlich-day edits use Tageszeiten or Uhrzeiten by default. */
  editWkMode = signal<'tz' | 'uz'>('tz');

  /** Index of the day currently being edited inline (-1 if none). */
  editingWkDayIndex = signal<number>(-1);

  // Intervall — alle N {Tage|Wochen|Monate} + Tageszeiten OR Uhrzeiten dosage.
  editIvN       = signal('2');
  editIvUnit    = signal('Tage');
  editIvMode    = signal<'tz' | 'uz'>('tz');
  editIvDosage  = signal<DosageFields>({ morgens: '0', mittags: '0', abends: '0', nachts: '0' });
  editIvUzRows  = signal<{ time: string; amount: string }[]>([{ time: '08:00', amount: '' }]);

  readonly dosistypOptions = [
    { value: 'taeglich-tz',  label: 'Täglich · Tageszeiten' },
    { value: 'taeglich-uz',  label: 'Täglich · Uhrzeiten' },
    { value: 'woechentlich', label: 'Wöchentlich' },
    { value: 'intervall',    label: 'Intervall' },
  ];

  readonly einheitOptions = [
    { value: 'Stück',   label: 'Stück' },
    { value: 'Tropfen', label: 'Tropfen' },
    { value: 'ml',      label: 'ml' },
    { value: 'mg',      label: 'mg' },
    { value: 'Hübe',    label: 'Hübe' },
    { value: 'I.E.',    label: 'I.E.' },
  ];

  readonly intervalUnitOptions = [
    { value: 'Tage',   label: 'Tage' },
    { value: 'Wochen', label: 'Wochen' },
    { value: 'Monate', label: 'Monate' },
  ];

  vorschauTaeglichTz = computed(() => {
    const d = this.editDosage();
    const u = this.editEinheit();
    const parts: string[] = [];
    if (this.toNum(d.morgens)) parts.push(`${d.morgens} ${u} morgens`);
    if (this.toNum(d.mittags)) parts.push(`${d.mittags} ${u} mittags`);
    if (this.toNum(d.abends))  parts.push(`${d.abends} ${u} abends`);
    if (this.toNum(d.nachts))  parts.push(`${d.nachts} ${u} nachts`);
    return parts.length ? `Täglich: ${parts.join(', ')}.` : '';
  });

  vorschauTaeglichUz = computed(() => {
    const u = this.editEinheit();
    const rows = this.editUzRows().filter(r => r.time && this.toNum(r.amount));
    if (!rows.length) return '';
    return `Täglich: ${rows.map(r => `${r.time} ${r.amount} ${u}`).join(', ')}.`;
  });

  vorschauWoechentlich = computed(() => {
    const u = this.editEinheit();
    const dayParts: string[] = [];
    for (const d of this.editWkDays()) {
      if (d.mode === 'tz') {
        const parts: string[] = [];
        d.tzVals.forEach((v, i) => {
          if (this.toNum(v) > 0) parts.push(`${this.formatMenge(v)} ${u} ${TZ_LABELS[i]}`);
        });
        if (parts.length) dayParts.push(`${d.day}: ${parts.join(' und ')}`);
      } else if (d.mode === 'uz') {
        const parts = d.uzPairs
          .filter(p => p.time && this.toNum(p.qty) > 0)
          .map(p => `um ${p.time} Uhr ${this.formatMenge(p.qty)} ${u}`);
        if (parts.length) dayParts.push(`${d.day}: ${parts.join(', ')}`);
      }
    }
    return dayParts.length ? `Wöchentlich: ${dayParts.join('; ')}.` : '';
  });

  vorschauIntervall = computed(() => {
    const n      = this.editIvN();
    const unit   = this.editIvUnit();
    const u      = this.editEinheit();
    const prefix = `Alle ${n} ${unit}: `;

    if (this.editIvMode() === 'tz') {
      const d = this.editIvDosage();
      const vals = [d.morgens, d.mittags, d.abends, d.nachts];
      const parts = vals
        .map((v, i) => this.toNum(v) > 0 ? `${this.formatMenge(v)} ${u} ${TZ_LABELS[i]}` : null)
        .filter((s): s is string => !!s);
      return parts.length ? prefix + parts.join(' und ') + '.' : '';
    }
    const parts = this.editIvUzRows()
      .filter(r => r.time && this.toNum(r.amount) > 0)
      .map(r => `um ${r.time} Uhr ${this.formatMenge(r.amount)} ${u}`);
    return parts.length ? prefix + parts.join(', ') + '.' : '';
  });

  // ── Täglich · Tageszeiten — quick-pick suggestions ───────────
  /** Patterns narrowed by what's already typed (typed slot must match the
   *  pattern's value at that index). When nothing matches we fall back to
   *  the full list so the suggestions stay visible while the user types. */
  filteredDosagePatterns = computed(() => {
    const d = this.editDosage();
    const slots = [d.morgens, d.mittags, d.abends, d.nachts];
    const matching = this.dosagePatterns.filter(p =>
      p.values.every((v, i) => !slots[i] || slots[i] === v),
    );
    return matching.length > 0 ? matching : this.dosagePatterns;
  });

  onDosageFocus(): void {
    this.dosageSuggestionsOpen.set(true);
    this.activeSuggestionIdx.set(-1);
  }

  /**
   * Close the suggestions list — except when focus is moving to another
   * slot in the same `.dosage-grid` (so Tab/Shift+Tab between morgens →
   * mittags → abends → nachts keeps the list open). Clicks on a
   * suggestion don't trigger blur at all: the suggestions <ul> binds
   * `(mousedown)="$event.preventDefault()"`, which keeps focus on the
   * active input, and the suggestion's own mousedown handler runs first
   * to apply + close synchronously.
   */
  onDosageBlur(event: FocusEvent): void {
    const next = event.relatedTarget as Element | null;
    if (next?.closest('.dosage-grid')) return;
    this.dosageSuggestionsOpen.set(false);
  }

  /** Keyboard navigation while suggestions are open: ↑/↓ moves the active
   *  item (over the filtered list), Enter accepts, Escape closes. */
  onDosageKeydown(event: KeyboardEvent): void {
    if (!this.dosageSuggestionsOpen()) return;
    const items = this.filteredDosagePatterns();
    if (items.length === 0) return;
    const last = items.length - 1;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.activeSuggestionIdx.update(i => i >= last ? 0 : i + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.activeSuggestionIdx.update(i => i <= 0 ? last : i - 1);
        break;
      case 'Enter': {
        const idx = this.activeSuggestionIdx();
        if (idx >= 0 && idx < items.length) {
          event.preventDefault();
          this.applyDosagePattern(items[idx].values);
        }
        break;
      }
      case 'Escape':
        event.preventDefault();
        this.dosageSuggestionsOpen.set(false);
        break;
    }
  }

  applyDosagePattern(values: [string, string, string, string]): void {
    this.editDosage.set({
      morgens: values[0],
      mittags: values[1],
      abends:  values[2],
      nachts:  values[3],
    });
    this.dosageSuggestionsOpen.set(false);
    this.activeSuggestionIdx.set(-1);
  }

  // ── Täglich · Uhrzeiten — row helpers ────────────────────────
  addUzRow(): void {
    this.editUzRows.update(rows => [...rows, { time: '12:00', amount: '' }]);
  }
  removeUzRow(i: number): void {
    this.editUzRows.update(rows => rows.filter((_, idx) => idx !== i));
  }
  updateUzRow(i: number, patch: Partial<{ time: string; amount: string }>): void {
    this.editUzRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  // ── Wöchentlich — inline per-day editor ──────────────────────
  setWkMode(mode: 'tz' | 'uz'): void { this.editWkMode.set(mode); }

  openWkDay(i: number): void { this.editingWkDayIndex.set(i); }

  /** Closes the inline editor; consolidates `mode` based on what was filled. */
  closeWkDay(): void {
    const i = this.editingWkDayIndex();
    if (i < 0) return;
    const mode = this.editWkMode();
    this.editWkDays.update(days => days.map((d, idx) => {
      if (idx !== i) return d;
      const hasTz = d.tzVals.some(v => this.toNum(v) > 0);
      const hasUz = d.uzPairs.some(p => p.time && this.toNum(p.qty) > 0);
      const next: WkDayData['mode'] =
        mode === 'tz' && hasTz ? 'tz' :
        mode === 'uz' && hasUz ? 'uz' : null;
      return { ...d, mode: next };
    }));
    this.editingWkDayIndex.set(-1);
  }

  updateWkTz(dayIdx: number, slot: number, value: string): void {
    this.editWkDays.update(days => days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      const tzVals = [...d.tzVals] as [string, string, string, string];
      tzVals[slot] = value;
      return { ...d, tzVals };
    }));
  }

  addWkUzPair(dayIdx: number): void {
    this.editWkDays.update(days => days.map((d, idx) =>
      idx === dayIdx ? { ...d, uzPairs: [...d.uzPairs, { time: '12:00', qty: '' }] } : d,
    ));
  }
  updateWkUzPair(dayIdx: number, pairIdx: number, patch: Partial<{ time: string; qty: string }>): void {
    this.editWkDays.update(days => days.map((d, idx) => {
      if (idx !== dayIdx) return d;
      return { ...d, uzPairs: d.uzPairs.map((p, j) => j === pairIdx ? { ...p, ...patch } : p) };
    }));
  }
  removeWkUzPair(dayIdx: number, pairIdx: number): void {
    this.editWkDays.update(days => days.map((d, idx) =>
      idx === dayIdx ? { ...d, uzPairs: d.uzPairs.filter((_, j) => j !== pairIdx) } : d,
    ));
  }

  /** Compact summary of a day for the collapsed row chip. */
  wkDaySummary(d: WkDayData): string {
    if (d.mode === 'tz') return d.tzVals.map(v => v || '0').join(' - ');
    if (d.mode === 'uz') return d.uzPairs.map(p => `${p.time} (${p.qty})`).join(', ');
    return '—';
  }

  // ── Intervall — UZ row helpers ───────────────────────────────
  setIvMode(mode: 'tz' | 'uz'): void { this.editIvMode.set(mode); }

  addIvUzRow(): void {
    this.editIvUzRows.update(rows => [...rows, { time: '12:00', amount: '' }]);
  }
  removeIvUzRow(i: number): void {
    this.editIvUzRows.update(rows => rows.filter((_, idx) => idx !== i));
  }
  updateIvUzRow(i: number, patch: Partial<{ time: string; amount: string }>): void {
    this.editIvUzRows.update(rows => rows.map((r, idx) => idx === i ? { ...r, ...patch } : r));
  }

  private toNum(v: string): number {
    const n = parseFloat(v.replace(',', '.'));
    return isFinite(n) ? n : 0;
  }
  private formatMenge(v: string): string { return v.replace('.', ','); }

  private resetForm(med: MedEntry): void {
    this.editDosistyp.set('taeglich-tz');
    this.editEinheit.set('Stück');
    this.editDosage.set(parseDosage(med.dosierung));
    this.editUzRows.set([{ time: '08:00', amount: '' }]);
    this.editWkDays.set(emptyWkDays());
    this.editWkMode.set('tz');
    this.editingWkDayIndex.set(-1);
    this.editIvN.set('2');
    this.editIvUnit.set('Tage');
    this.editIvMode.set('tz');
    this.editIvDosage.set({ morgens: '0', mittags: '0', abends: '0', nachts: '0' });
    this.editIvUzRows.set([{ time: '08:00', amount: '' }]);
    this.editGrund.set(med.grund);
    this.editIcd.set(med.details.icd);
    this.editBeginn.set(med.details.beginn);
    this.editEnde.set(med.details.ende ?? '');
    this.editVersicherte.set(med.details.versicherte || med.hinweise);
    this.editMitbehandler.set(med.details.mitbehandler);
  }

  saveBearbeiten(): void {
    // BACKEND-INTEGRATION — Medikament speichern (Update ODER Create)
    //
    //   Update bestehender Plan-Eintrag (med.id beginnt mit 'med-'):
    //     PUT /api/patients/{patientId}/medications/{med.id}
    //
    //   Übernahme aus Quelle (med.id beginnt mit 'eml-' / 'kk-' / 'pp-'):
    //     POST /api/patients/{patientId}/medications
    //     + zusätzlich  "sourceType": "eml" | "karteikarte" | "pastPlan",
    //                   "sourceRef":  "<original row id>"
    //
    //   Body (gemeinsam):
    //     {
    //       "wirkstoff":   "Bisoprolol",                   // unverändert (read-only im Modal)
    //       "handelsname": "Bisoprolol-1A Pharma",
    //       "staerke":     "2,5 mg",
    //       "form":        "Tabls",
    //       "dosierung":   "1-0-0-0",                      // formatDosage(...) — 'M-M-A-N'
    //       "dosistyp":    "taeglich-tz",                  // "taeglich-tz" | "taeglich-uz" |
    //                                                      // "woechentlich" | "intervall"
    //       "einheit":     "Stück",                        // "Stück"|"Tropfen"|"ml"|"mg"|"Hübe"|"I.E."
    //       "grund":       "Herzinsuffizienz",             // freier Text / Datalist-Auswahl
    //       "icd":         "I50.0",                        // ICD-10
    //       "beginn":      "01.03.2024",                   // 'TT.MM.JJJJ'
    //       "ende":        "",                             // optional
    //       "hinweise": {
    //         "versicherte":  "Nüchtern einnehmen",        // sichtbar für Versicherten
    //         "mitbehandler": "Kardiologe informiert"      // intern
    //       }
    //     }
    //
    //   Bei wöchentlich/intervall zusätzlich (statt `dosierung`):
    //     "schedule": {
    //        "kind":   "woechentlich",
    //        "days": [
    //          { "day": "Montag",   "tz": ["1","0","0","0"] },
    //          { "day": "Dienstag", "uz": [{ "time": "08:00", "qty": "1" }] }
    //        ]
    //     }
    //   bzw. { "kind": "intervall", "everyN": 2, "unit": "Tage", "tz": [...] | "uz": [...] }
    //
    //   Response 200/201: vollständiger MedEntry. Im Parent: 'aktive' refetchen.
    //   Errors:           400 (Validation), 409 (Wirkstoff-Konflikt).
    console.log('Speichern:', {
      medId:        this._med()?.id,
      dosistyp:     this.editDosistyp(),
      einheit:      this.editEinheit(),
      dosierung:    formatDosage(this.editDosage()),
      grund:        this.editGrund(),
      icd:          this.editIcd(),
      beginn:       this.editBeginn(),
      ende:         this.editEnde(),
      versicherte:  this.editVersicherte(),
      mitbehandler: this.editMitbehandler(),
    });
    this.closed.emit();
  }

  onClose():     void { this.closed.emit(); }
  // Die folgenden drei Aktionen werden hier nur weitergereicht. Die
  // tatsächlichen Backend-Calls (Pause/Beenden via PATCH, Austausch via
  // ABDATA-Suche) liegen im Parent — siehe `emp-screen.ts`
  // (`onBearbeitenPausieren`, `onBearbeitenBeenden`, `onBearbeitenAustausch`).
  onPausieren(): void { const m = this._med(); if (m) this.pausieren.emit(m); }
  onBeenden():   void { const m = this._med(); if (m) this.beenden.emit(m); }
  onAustausch(): void { const m = this._med(); if (m) this.austausch.emit(m); }
}
