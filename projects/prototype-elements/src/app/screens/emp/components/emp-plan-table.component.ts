import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  computed,
  signal,
} from '@angular/core';
import { BadgeComponent, HighlightPipe } from '@indamed/ui';
import { MedEntry } from '../../../data/emp-data';

export type MedGroup = 'aktiv' | 'pausiert' | 'geplant' | 'beendet';

/** Returns true if any of the med's searchable fields includes the query. */
function medMatches(med: MedEntry, query: string): boolean {
  if (!query) return true;
  const q = query.toLowerCase();
  const fields: (string | undefined)[] = [
    med.wirkstoff, med.handelsname, med.staerke, med.form,
    med.dosierung, med.grund,
    med.details?.mitbehandler, med.details?.versicherte,
  ];
  return fields.some(v => !!v && v.toLowerCase().includes(q));
}

/**
 * 10-column plan table — header, group dividers, data rows, and the
 * expanded eML history detail block.
 *
 * State is owned by the parent (expanded/collapsed sets); the child
 * emits row/menu/group events back up.
 *
 * BACKEND-INTEGRATION:
 *   Rein präsentational. `[aktive]`, `[pausiert]`, `[geplant]` kommen aus
 *   GET /api/patients/{id}/medications?status=… (siehe `data/emp-data.ts`).
 *   Mutationen (Bearbeiten, Pausieren, Beenden) werden im Parent ausgelöst
 *   (siehe `emp-screen.ts → onRowMenuAction`).
 */
@Component({
  selector: 'emp-plan-table',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [BadgeComponent, HighlightPipe],
  templateUrl: './emp-plan-table.component.html',
  styleUrl:    './emp-plan-table.component.scss',
})
export class EmpPlanTableComponent {
  @Input({ required: true }) set aktive(list: MedEntry[]) { this._aktive.set(list); }
  @Input({ required: true }) set pausiert(list: MedEntry[]) { this._pausiert.set(list); }
  @Input({ required: true }) set geplant(list: MedEntry[]) { this._geplant.set(list); }
  @Input() set search(value: string) { this._search.set(value); }
  @Input() expanded:  Set<string>   = new Set();
  @Input() collapsed: Set<MedGroup> = new Set();

  private _aktive   = signal<MedEntry[]>([]);
  private _pausiert = signal<MedEntry[]>([]);
  private _geplant  = signal<MedEntry[]>([]);
  private _search   = signal<string>('');

  /** "Nur Veränderte anzeigen" toggle in the plan heading. When on, all
   *  three groups are filtered to only rows with `geaendert: true`. */
  showChangedOnly = signal(false);

  q = computed(() => this._search().trim());

  private applyFilters(list: MedEntry[]): MedEntry[] {
    const q = this.q();
    const onlyChanged = this.showChangedOnly();
    return list.filter(m =>
      medMatches(m, q) && (!onlyChanged || !!m.geaendert),
    );
  }

  filteredAktive   = computed(() => this.applyFilters(this._aktive()));
  filteredPausiert = computed(() => this.applyFilters(this._pausiert()));
  filteredGeplant  = computed(() => this.applyFilters(this._geplant()));

  onToggleChangedOnly(checked: boolean): void {
    this.showChangedOnly.set(checked);
  }

  @Output() rowClick    = new EventEmitter<{ med: MedEntry; event: Event }>();
  @Output() rowExpand   = new EventEmitter<string>();
  @Output() rowMenu     = new EventEmitter<{ med: MedEntry; event: MouseEvent }>();
  @Output() groupToggle = new EventEmitter<MedGroup>();
  @Output() dosageEdit  = new EventEmitter<MedEntry>();

  isExpanded(id: string): boolean { return this.expanded.has(id); }
  isCollapsed(g: MedGroup): boolean { return this.collapsed.has(g); }

  onRowClick(med: MedEntry, event: Event): void {
    this.rowClick.emit({ med, event });
  }

  onExpand(id: string, event: Event): void {
    event.stopPropagation();
    this.rowExpand.emit(id);
  }

  onMenu(med: MedEntry, event: MouseEvent): void {
    event.stopPropagation();
    this.rowMenu.emit({ med, event });
  }

  /** Cell click on Dosierangabe — open the edit modal focused on the dosage. */
  onDosageEdit(med: MedEntry, event: Event): void {
    event.stopPropagation();
    this.dosageEdit.emit(med);
  }

  onGroup(g: MedGroup): void { this.groupToggle.emit(g); }
}
