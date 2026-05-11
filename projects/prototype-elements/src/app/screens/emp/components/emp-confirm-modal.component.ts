import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ModalComponent, ButtonComponent } from '@indamed/ui';

export interface ConfirmOptions {
  title:   string;
  message: string;
  /** When true, the Bestätigen button uses the destructive variant. */
  danger:  boolean;
  /** Invoked when the user clicks Bestätigen. */
  action:  () => void;
}

/**
 * Generic confirmation dialog — used by EmpScreenComponent for Pause / Beenden /
 * destructive flows. Renders nothing when `options` is null; the parent owns
 * the open signal pair (presence == open).
 */
@Component({
  selector: 'emp-confirm-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent],
  template: `
    @if (options) {
      <inm-modal
        [open]="open"
        [title]="options.title"
        width="400px"
        (closed)="closed.emit()">

        <div class="modal-body-pad">
          <p class="confirm-message">{{ options.message }}</p>
        </div>

        <ng-container modal-footer>
          <inm-button
            [variant]="options.danger ? 'destructive' : 'primary'"
            size="l"
            (click)="run()">
            Bestätigen
          </inm-button>
          <inm-button variant="normal" size="l" (click)="closed.emit()">
            Abbrechen
          </inm-button>
        </ng-container>
      </inm-modal>
    }
  `,
  styles: [`
    .modal-body-pad   { padding: var(--inm-space-4); }
    .confirm-message  {
      margin:      0;
      font-family: var(--inm-font-family-default);
      font-size:   var(--inm-font-size-body);
      color:       var(--inm-color-foreground-default);
    }
  `],
})
export class EmpConfirmModalComponent {
  @Input() options: ConfirmOptions | null = null;
  @Input() open = false;

  @Output() closed = new EventEmitter<void>();

  /** Fires the configured action then emits `closed`. */
  protected run(): void {
    this.options?.action();
    this.closed.emit();
  }
}
