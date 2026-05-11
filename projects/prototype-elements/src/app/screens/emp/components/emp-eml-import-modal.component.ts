import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ModalComponent,
  ButtonComponent,
  InputComponent,
  BadgeComponent,
} from '@indamed/ui';
import { EmlRow } from '../../../data/emp-data';

interface DosageFields {
  morgens: string;
  mittags: string;
  abends:  string;
  nachts:  string;
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

/** Payload emitted on "In Plan übernehmen". Maps 1:1 to the POST body the
 *  parent forwards to /api/patients/{id}/medications (see emp-screen.ts
 *  submitEmlImport for the full backend contract). */
export interface EmlImportSubmitPayload {
  sourceType:  'eml';
  sourceRef:   string;
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;
  hinweise:    string;
  grund:       string;
  icd:         string;
  beginn:      string;
}

/**
 * eML import modal — short form for adopting a single eML V/D record into
 * the active plan. Owns its own dosage / hinweise / grund / ICD / beginn
 * state; when the parent opens the modal with a new `row`, the form resets
 * from that row's values.
 *
 * Emits `submitted(payload)` on "In Plan übernehmen" — the parent posts to
 * the backend and closes the modal in response.
 */
@Component({
  selector: 'emp-eml-import-modal',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ModalComponent, ButtonComponent, InputComponent, BadgeComponent],
  templateUrl: './emp-eml-import-modal.component.html',
  styleUrl:    './emp-eml-import-modal.component.scss',
})
export class EmpEmlImportModalComponent {
  @Input() open = false;
  /** Datalist suggestions for the "Grund / Indikation" field. */
  @Input() grundSuggestions: readonly string[] = [];

  private _row: EmlRow | null = null;
  get row(): EmlRow | null { return this._row; }
  @Input() set row(value: EmlRow | null) {
    this._row = value;
    if (value) this.resetForm(value);
  }

  @Output() submitted = new EventEmitter<EmlImportSubmitPayload>();
  @Output() closed    = new EventEmitter<void>();

  /** Form state — reset from `row` whenever the parent opens the modal. */
  protected dosage   = signal<DosageFields>({ morgens: '', mittags: '', abends: '', nachts: '' });
  protected hinweise = signal('');
  protected grund    = signal('');
  protected icd      = signal('');
  protected beginn   = signal('');

  private resetForm(row: EmlRow): void {
    this.dosage.set(parseDosage(row.dosierung));
    this.hinweise.set('');
    this.grund.set('');
    this.icd.set('');
    this.beginn.set('');
  }

  protected submit(): void {
    const row = this._row;
    if (!row) return;
    this.submitted.emit({
      sourceType:  'eml',
      sourceRef:   row.id,
      wirkstoff:   row.wirkstoff,
      handelsname: row.handelsname,
      staerke:     row.staerke,
      form:        row.form,
      dosierung:   formatDosage(this.dosage()),
      hinweise:    this.hinweise(),
      grund:       this.grund(),
      icd:         this.icd(),
      beginn:      this.beginn(),
    });
  }
}
