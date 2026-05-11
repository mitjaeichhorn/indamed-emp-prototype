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
  BadgeComponent,
  KeyValueListComponent,
  KeyValueRowComponent,
} from '@indamed/ui';
import { MedEntry } from '../../../data/emp-data';

/**
 * Read-only detail view for a single plan-row medication, plus a row of
 * action shortcuts (Bearbeiten / Wiederholen / m. Austausch / Pausieren /
 * Beenden) in the modal-actions slot. The parent owns the side effects —
 * the modal just emits which action was triggered along with the row, and
 * closes itself.
 */
@Component({
  selector: 'emp-med-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    ModalComponent,
    ButtonComponent,
    BadgeComponent,
    KeyValueListComponent,
    KeyValueRowComponent,
  ],
  template: `
    @if (med) {
      <inm-modal
        [open]="open"
        [title]="med.wirkstoff + ' — ' + med.handelsname"
        width="640px"
        [dismissable]="false"
        (closed)="closed.emit()">

        <inm-button modal-actions variant="akzent" size="m" iconLeft="pencil-simple"
          (click)="trigger(bearbeiten)">Bearbeiten</inm-button>
        <span modal-actions class="action-separator" aria-hidden="true"></span>
        <inm-button modal-actions variant="akzent" size="m" iconLeft="repeat"
          (click)="trigger(wiederholen)">Wiederholen</inm-button>
        <inm-button modal-actions variant="akzent" size="m" iconLeft="swap"
          (click)="trigger(austausch)">m. Austausch</inm-button>
        <inm-button modal-actions variant="akzent" size="m" iconLeft="pause"
          (click)="trigger(pausieren)">Pausieren</inm-button>
        <inm-button modal-actions variant="destructive-akzent" size="m" iconLeft="stop-circle"
          (click)="trigger(beenden)">Beenden</inm-button>

        <div class="modal-body-pad detail-stack">
          <inm-pattern-key-value-list title="Medikament">
            <inm-pattern-key-value-row label="Wirkstoff"   [value]="med.wirkstoff" />
            <inm-pattern-key-value-row label="Handelsname" [value]="med.handelsname" />
            <inm-pattern-key-value-row label="Stärke"      [value]="med.staerke" />
            <inm-pattern-key-value-row label="Form"        [value]="med.form" />
          </inm-pattern-key-value-list>

          <inm-pattern-key-value-list title="Dosierung">
            <inm-pattern-key-value-row label="Dosierangabe" [value]="med.dosierung" />
            <inm-pattern-key-value-row label="Art"          [value]="med.art" />
          </inm-pattern-key-value-list>

          <inm-pattern-key-value-list title="Indikation">
            <inm-pattern-key-value-row label="Grund"  [value]="med.grund" />
            <inm-pattern-key-value-row label="ICD-10">
              <inm-badge variant="icd">{{ med.details.icd }}</inm-badge>
            </inm-pattern-key-value-row>
            <inm-pattern-key-value-row label="Beginn" [value]="med.details.beginn" />
            <inm-pattern-key-value-row label="Restwiederholungen"
              [value]="med.rw > 0 ? (med.rw + '') : '–'" />
          </inm-pattern-key-value-list>

          @if (med.details.versicherte || med.details.mitbehandler) {
            <inm-pattern-key-value-list title="Hinweise">
              @if (med.details.versicherte) {
                <inm-pattern-key-value-row label="Für Versicherte"
                  [value]="med.details.versicherte" />
              }
              @if (med.details.mitbehandler) {
                <inm-pattern-key-value-row label="Für Mitbehandler"
                  [value]="med.details.mitbehandler" />
              }
            </inm-pattern-key-value-list>
          }
        </div>

        <ng-container modal-footer>
          <inm-button variant="normal" size="l" (click)="closed.emit()">Schließen</inm-button>
        </ng-container>
      </inm-modal>
    }
  `,
  styles: [`
    .modal-body-pad   { padding: var(--inm-space-4); }
    .detail-stack     { display: flex; flex-direction: column; gap: var(--inm-space-3); }
    /* Vertical rule between the primary action and the secondary cluster. */
    .action-separator {
      width:        1px;
      align-self:   stretch;
      margin-block: var(--inm-space-1);
      background:   var(--inm-color-border-subtle);
    }
  `],
})
export class EmpMedDetailModalComponent {
  @Input() med: MedEntry | null = null;
  @Input() open = false;

  @Output() bearbeiten = new EventEmitter<MedEntry>();
  @Output() wiederholen = new EventEmitter<MedEntry>();
  @Output() austausch  = new EventEmitter<MedEntry>();
  @Output() pausieren  = new EventEmitter<MedEntry>();
  @Output() beenden    = new EventEmitter<MedEntry>();
  @Output() closed     = new EventEmitter<void>();

  /** Fires the given output with the active med then closes the modal —
   *  every action above follows this same dispatch-then-close pattern. */
  protected trigger(emitter: EventEmitter<MedEntry>): void {
    if (!this.med) return;
    emitter.emit(this.med);
    this.closed.emit();
  }
}
