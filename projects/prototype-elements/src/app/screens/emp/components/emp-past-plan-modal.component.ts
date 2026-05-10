import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
  computed,
} from '@angular/core';
import {
  ModalComponent,
  ButtonComponent,
  HighlightPipe,
  PatientData,
} from '@indamed/ui';
import { PastPlanEntry, PastPlanMed } from '../../../data/emp-data';

function planMedMatches(m: PastPlanMed, q: string): boolean {
  if (!q) return false;
  const ql = q.toLowerCase();
  return [m.wirkstoff, m.handelsname, m.staerke, m.form, m.dosierung, m.grund]
    .some(v => !!v && v.toLowerCase().includes(ql));
}

/**
 * Past-plan detail modal — shows every med from a previous plan in a wide
 * data table with row markers and per-row "Editieren und übernehmen" / "Bereits
 * im Plan" actions. The modal supports a "Bereits übernommene ausblenden"
 * filter and renders muted styling for rows whose Wirkstoff is in the active
 * plan.
 *
 * BACKEND-INTEGRATION:
 *   Plan-Daten kommen via `[plan]` (Quelle: GET /api/patients/{id}/plans —
 *   siehe `data/emp-data.ts → PAST_PLANS`).
 *   "Editieren und übernehmen" emittiert `editAndAdopt` an den Parent —
 *   dort wird der Bearbeiten-Modal geöffnet, der beim Speichern POST
 *   /api/patients/{id}/medications mit sourceType="pastPlan" auslöst
 *   (siehe `emp-bearbeiten-modal.saveBearbeiten`).
 */
@Component({
  selector: 'emp-past-plan-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent, HighlightPipe],
  templateUrl: './emp-past-plan-modal.component.html',
  styleUrl:    './emp-past-plan-modal.component.scss',
})
export class EmpPastPlanModalComponent {
  @Input() open = false;
  @Input() patient!: PatientData;
  @Input() plan: PastPlanEntry | null = null;
  /** Wirkstoff names currently in the active plan — used to mark "in plan" rows. */
  @Input() set activeWirkstoffe(list: readonly string[]) {
    this._active.set(new Set(list.map(w => w.toLowerCase())));
  }
  /** Search query (drives match highlighting + .pp-match row tint). */
  @Input() set search(value: string) { this._search.set(value); }

  private _active = signal<Set<string>>(new Set());
  private _search = signal<string>('');

  @Output() closed       = new EventEmitter<void>();
  @Output() editAndAdopt = new EventEmitter<PastPlanMed>();

  hideUsed = signal(false);
  q        = computed(() => this._search().trim());

  rows = computed(() => {
    const plan   = this.plan;
    const active = this._active();
    const hide   = this.hideUsed();
    const q      = this.q();
    if (!plan) return [];
    return plan.meds
      .map(m => ({
        ...m,
        used:    active.has(m.wirkstoff.toLowerCase()),
        matches: planMedMatches(m, q),
      }))
      .filter(r => !hide || !r.used);
  });

  onClose(): void { this.closed.emit(); }
  onAdopt(med: PastPlanMed): void { this.editAndAdopt.emit(med); }
  toggleHideUsed(checked: boolean): void { this.hideUsed.set(checked); }
}
