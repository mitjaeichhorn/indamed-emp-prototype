import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ModalComponent,
  ButtonComponent,
  InputComponent,
  VorschauBoxComponent,
} from '@indamed/ui';

/**
 * ABDATA-Suche modal — placeholder for the Arzneimittel-Datenbank search.
 * In production this dialog hits `GET /api/abdata/search` (debounced live
 * query); see the BACKEND-INTEGRATION block in emp-screen.ts.
 *
 * Two-way bindable for the search query via `[(query)]`.
 */
@Component({
  selector: 'emp-abdata-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, ButtonComponent, InputComponent, VorschauBoxComponent],
  template: `
    @if (open) {
      <inm-modal
        [open]="open"
        [title]="withRezept ? 'Neuer Eintrag — mit Rezept' : 'Neuer Eintrag — ohne Rezept'"
        width="640px"
        [dismissable]="false"
        (closed)="closed.emit()">

        <div class="modal-body-pad modal-form">
          <div class="modal-section-label">ABDATA Medikamentensuche</div>
          <inm-input
            label="Suche"
            placeholder="Wirkstoff, Handelsname, PZN"
            [ngModel]="query"
            (ngModelChange)="queryChange.emit($event)" />
          <inm-vorschau-box variant="info">
            ABDATA-Suchergebnisse erscheinen hier. (Prototyp-Stub — ohne echte Datenbank.)
          </inm-vorschau-box>
        </div>

        <ng-container modal-footer>
          <inm-button variant="primary" size="l" iconLeft="plus" (click)="selected.emit()">
            Auswählen
          </inm-button>
          <inm-button variant="normal" size="l" (click)="closed.emit()">Abbrechen</inm-button>
        </ng-container>
      </inm-modal>
    }
  `,
  styles: [`
    .modal-body-pad      { padding: var(--inm-space-4); }
    .modal-form          { display: flex; flex-direction: column; gap: var(--inm-space-3); }
    .modal-section-label {
      font-family:    var(--inm-font-family-default);
      font-size:      var(--inm-font-size-caption);
      font-weight:    var(--inm-font-weight-semibold);
      color:          var(--inm-color-foreground-subtle);
      text-transform: uppercase;
      letter-spacing: var(--inm-letter-spacing-label);
    }
  `],
})
export class EmpAbdataModalComponent {
  @Input() open = false;
  /** Drives the title — different copy for prescription vs. non-prescription flows. */
  @Input() withRezept = true;
  /** Two-way bindable search query. */
  @Input() query = '';

  @Output() queryChange = new EventEmitter<string>();
  /** Fires when the user clicks "Auswählen". Prototype stub. */
  @Output() selected = new EventEmitter<void>();
  @Output() closed   = new EventEmitter<void>();
}
