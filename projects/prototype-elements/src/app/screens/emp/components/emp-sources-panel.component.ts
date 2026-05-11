import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { HotkeyComponent, ButtonComponent, HighlightPipe, SwitchComponent } from '@indamed/ui';
import { EmlRow, KarteikarteRow, PastPlanEntry } from '../../../data/emp-data';
import { emlMatches, kkMatches, planMedMatches } from '../../../data/search';

/**
 * Quellen panel — 4 columns (eML / Karteikarte / Vergangene Pläne / BMP)
 * with the Quellen heading + legend + "Bereits übernommene ausblenden" toggle.
 *
 * BACKEND-INTEGRATION:
 *   Diese Komponente ist rein präsentational. Eingangs-Daten kommen über
 *   `[emlRows]`, `[kkRows]`, `[plans]` aus dem Parent — die zugehörigen
 *   GET-Endpoints sind in `data/emp-data.ts` annotiert. Aktionen (Import,
 *   Detail-Open, Kontextmenü) werden via `@Output()` an `emp-screen.ts`
 *   weitergereicht; dort liegen die POST/PATCH-Calls
 *   (siehe `submitEmlImport`, `onSrcRowMenuAction`).
 */
@Component({
  selector: 'emp-sources-panel',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [HotkeyComponent, ButtonComponent, HighlightPipe, SwitchComponent],
  templateUrl: './emp-sources-panel.component.html',
  styleUrl:    './emp-sources-panel.component.scss',
})
export class EmpSourcesPanelComponent {
  @Input({ required: true }) set emlRows(list: EmlRow[])           { this._eml.set(list); }
  @Input({ required: true }) set kkRows(list: KarteikarteRow[])   { this._kk.set(list); }
  @Input({ required: true }) set plans(list: PastPlanEntry[])      { this._plans.set(list); }
  @Input() set search(value: string)                                { this._search.set(value); }
  @Input() hideUsed = false;

  private _eml    = signal<EmlRow[]>([]);
  private _kk     = signal<KarteikarteRow[]>([]);
  private _plans  = signal<PastPlanEntry[]>([]);
  private _search = signal<string>('');

  q = computed(() => this._search().trim());

  filteredEml = computed(() => this._eml().filter(r => emlMatches(r, this.q())));
  filteredKk  = computed(() => this._kk().filter(r => kkMatches(r, this.q())));

  /** Past-plan rows with their per-plan match count when search is active.
   *  Plans with zero matches are hidden when filtering. */
  filteredPlans = computed(() => {
    const q = this.q();
    return this._plans()
      .map(p => ({ plan: p, hits: q ? p.meds.filter(m => planMedMatches(m, q)).length : 0 }))
      .filter(({ hits }) => !q || hits > 0);
  });

  @Output() hideUsedChange = new EventEmitter<boolean>();

  @Output() emlRowClick = new EventEmitter<EmlRow>();
  @Output() emlImport   = new EventEmitter<{ row: EmlRow; event: Event }>();
  @Output() emlMenu     = new EventEmitter<MouseEvent>();

  @Output() kkRowClick  = new EventEmitter<KarteikarteRow>();
  @Output() kkImport    = new EventEmitter<KarteikarteRow>();
  @Output() kkMenu      = new EventEmitter<MouseEvent>();

  @Output() planClick   = new EventEmitter<PastPlanEntry>();

  onEmlRow(row: EmlRow): void { this.emlRowClick.emit(row); }
  onEmlImport(row: EmlRow, event: Event): void {
    event.stopPropagation();
    this.emlImport.emit({ row, event });
  }
  onEmlMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.emlMenu.emit(event);
  }

  onKkRow(row: KarteikarteRow): void { this.kkRowClick.emit(row); }
  onKkImport(row: KarteikarteRow, event: Event): void {
    event.stopPropagation();
    this.kkImport.emit(row);
  }
  onKkMenu(event: MouseEvent): void {
    event.stopPropagation();
    this.kkMenu.emit(event);
  }

  onPlanClick(plan: PastPlanEntry): void { this.planClick.emit(plan); }

  onToggleHideUsed(checked: boolean): void { this.hideUsedChange.emit(checked); }
}
