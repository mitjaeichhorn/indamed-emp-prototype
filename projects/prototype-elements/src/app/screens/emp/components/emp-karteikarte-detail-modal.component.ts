import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import {
  ModalComponent,
  ButtonComponent,
  KeyValueListComponent,
  KeyValueRowComponent,
} from '@indamed/ui';
import { KarteikarteRow } from '../../../data/emp-data';

/**
 * Karteikarte detail modal — read-only view of a single Karteikarte row.
 * The "Editieren und übernehmen" action emits `editAndAdopt(row)` so the
 * parent can hand the row to the Bearbeiten modal (the kk → MedEntry
 * synthesis lives in `data/med-adapter.ts`).
 */
@Component({
  selector: 'emp-karteikarte-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent, KeyValueListComponent, KeyValueRowComponent],
  template: `
    @if (row) {
      <inm-modal
        [open]="open"
        title="Karteikarten-Eintrag"
        width="640px"
        [dismissable]="false"
        (closed)="closed.emit()">

        <div class="modal-body-pad detail-stack">
          <inm-pattern-key-value-list title="Eintrag">
            <inm-pattern-key-value-row label="Datum" [value]="row.datum" />
            <inm-pattern-key-value-row label="Typ"   [value]="row.typ" />
            <inm-pattern-key-value-row label="Arzt"  [value]="row.arzt" />
          </inm-pattern-key-value-list>

          <inm-pattern-key-value-list title="Medikament">
            <inm-pattern-key-value-row label="Bezeichnung" [value]="row.text" />
          </inm-pattern-key-value-list>
        </div>

        <ng-container modal-footer>
          <inm-button variant="primary" size="l" iconLeft="pencil-simple"
            (click)="editAndAdopt.emit(row)">
            Editieren und übernehmen
          </inm-button>
          <inm-button variant="normal" size="l" (click)="closed.emit()">Abbrechen</inm-button>
        </ng-container>
      </inm-modal>
    }
  `,
  styles: [`
    .modal-body-pad { padding: var(--inm-space-4); }
    .detail-stack   { display: flex; flex-direction: column; gap: var(--inm-space-3); }
  `],
})
export class EmpKarteikarteDetailModalComponent {
  @Input() row: KarteikarteRow | null = null;
  @Input() open = false;

  @Output() editAndAdopt = new EventEmitter<KarteikarteRow>();
  @Output() closed       = new EventEmitter<void>();
}
