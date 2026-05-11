import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';
import { ModalComponent, ButtonComponent, PatientData } from '@indamed/ui';
import { EmlRow } from '../../../data/emp-data';
import { compareEmlFields } from '../../../data/eml-comparison';

/**
 * Side-by-side V/D comparison modal for an eML row. The clicked row supplies
 * one column (V or D); the counterpart is synthesised in `compareEmlFields`
 * so the prototype can demonstrate diff highlights without a real backend
 * link between Verordnung and Dispensierung records.
 *
 * The component computes its own field-diff signal from the input row —
 * the parent only passes the row + patient header context.
 */
@Component({
  selector: 'emp-eml-detail-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ModalComponent, ButtonComponent],
  template: `
    @if (row()) {
      <inm-modal
        [open]="open"
        title="eML"
        width="900px"
        (closed)="closed.emit()">
        <!-- All bindings below read the signal-input value via row(). -->


        <span modal-title-after class="modal-title-context">
          <span class="value">{{ patient.name }}</span>
          <span class="value">{{ patient.birthDate }}</span>
          <span class="meta">(<span class="value">{{ patient.age }}</span> J)</span>
          <span class="value">{{ patient.gender }}</span>
          <span class="meta">ID: <span class="value">{{ patient.id }}</span></span>
        </span>

        <!-- Side-by-side V/D comparison; right-side cells highlight when they
             deviate from the prescription on the left. -->
        <div class="eml-compare">
          <div class="eml-compare-grid">
            <div class="eml-compare-col">
              <h3 class="eml-compare-title eml-compare-title-muted">Verordnung</h3>
              <div class="eml-compare-fields">
                @for (f of fields(); track f.label) {
                  <div class="eml-compare-field">
                    <div class="eml-compare-label">{{ f.label }}</div>
                    <div class="eml-compare-value">{{ f.v || '—' }}</div>
                  </div>
                }
              </div>
            </div>
            <div class="eml-compare-col">
              <h3 class="eml-compare-title">Dispensierung</h3>
              <div class="eml-compare-fields">
                @for (f of fields(); track f.label) {
                  <div class="eml-compare-field" [class.diff]="f.differs">
                    <div class="eml-compare-label">{{ f.label }}</div>
                    <div class="eml-compare-value">{{ f.d || '—' }}</div>
                  </div>
                }
              </div>
            </div>
          </div>
        </div>

        <ng-container modal-footer>
          <inm-button variant="primary" size="l" iconLeft="pencil-simple"
            (click)="editAndAdopt.emit(row()!)">
            Editieren und übernehmen
          </inm-button>
          <inm-button variant="normal" size="l" (click)="closed.emit()">Abbrechen</inm-button>
        </ng-container>
      </inm-modal>
    }
  `,
  styles: [`
    .modal-title-context {
      display:     inline-flex;
      align-items: baseline;
      gap:         var(--inm-space-2);
      font-family: var(--inm-font-family-default);
      font-size:   var(--inm-font-size-caption);
      color:       var(--inm-color-foreground-subtle);

      .value { color: var(--inm-color-foreground-default); font-weight: var(--inm-font-weight-semibold); }
      .meta  { color: var(--inm-color-foreground-subtle);  }
    }

    /* ── V/D side-by-side comparison ─────────────────────────────
       Left col = dialog grey (the existing record), right col = white
       (the new entry); right-col diffs are tinted with the same warning
       token used by the eML source-table abweichung rows. */
    .eml-compare-grid {
      display:               grid;
      grid-template-columns: 1fr 1fr;
      gap:                   0;
    }

    .eml-compare-col            { padding: var(--inm-space-4); }
    .eml-compare-col:first-child  { background: var(--inm-color-surface-dialog); }
    .eml-compare-col:last-child   { background: var(--inm-color-surface-default); }

    .eml-compare-title {
      margin:      0 0 var(--inm-space-3);
      font-family: var(--inm-font-family-default);
      font-size:   22px;
      font-weight: var(--inm-font-weight-light);
      color:       var(--inm-color-foreground-default);
    }
    .eml-compare-title-muted { color: var(--inm-color-foreground-muted); }

    .eml-compare-fields {
      display:        flex;
      flex-direction: column;
    }

    .eml-compare-field {
      padding:       var(--inm-space-2);
      border-bottom: 1px solid var(--inm-color-border-subtle);

      &.diff { background: var(--inm-color-status-warning-tint); }
    }

    .eml-compare-label {
      margin-bottom:  2px;
      font-family:    var(--inm-font-family-default);
      font-size:      var(--inm-font-size-label);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      color:          var(--inm-color-foreground-subtle);
    }

    .eml-compare-value {
      font-family: var(--inm-font-family-default);
      font-size:   var(--inm-font-size-body);
      font-weight: var(--inm-font-weight-semibold);
      color:       var(--inm-color-foreground-default);
    }
  `],
})
export class EmpEmlDetailModalComponent {
  /** Signal-input: re-derives `fields` automatically when the parent
   *  rebinds the row, without an `@Input set` shim. */
  readonly row = input<EmlRow | null>(null);

  @Input() open = false;
  @Input() patient!: PatientData;

  @Output() editAndAdopt = new EventEmitter<EmlRow>();
  @Output() closed       = new EventEmitter<void>();

  /** Derived V/D field pairs — recomputed whenever the row changes. */
  protected readonly fields = computed(() => {
    const r = this.row();
    return r ? compareEmlFields(r) : [];
  });
}
