import { EmlRow } from './emp-data';

/**
 * eML V/D comparison helper — builds the side-by-side field pairs shown in
 * the Karteikarten-/eML-Detail modal. The clicked row supplies one side
 * (V = Verordnung or D = Dispensierung); the counterpart is synthesised so
 * the prototype can demonstrate diff highlights without a real backend link
 * between V and D records.
 *
 * Production note: replace the synthesis with a real backend join keyed by
 *   `medicationId` or `prescriptionId`. See BACKEND-INTEGRATION block in
 *   `emp-data.ts` for the eML endpoint contract.
 */

export interface EmlFieldDiff {
  /** German field label rendered in the modal column header. */
  label:   string;
  /** Value on the V (Verordnung) side. */
  v:       string;
  /** Value on the D (Dispensierung) side. */
  d:       string;
  /** True when v !== d — highlighted in the UI. */
  differs: boolean;
}

interface EmlFieldRow {
  datum:         string;
  wirkstoff:     string;
  handelsname:   string;
  wirkstaerke:   string;
  form:          string;
  dosierangabe:  string;
  grund:         string;
  abgabehinweis: string;
  autIdem:       string;
  privatrezept:  string;
}

const FIELD_LABELS: { key: keyof EmlFieldRow; label: string }[] = [
  { key: 'datum',         label: 'Datum' },
  { key: 'wirkstoff',     label: 'Wirkstoff' },
  { key: 'handelsname',   label: 'Handelsname' },
  { key: 'wirkstaerke',   label: 'Wirkstärke' },
  { key: 'form',          label: 'Form' },
  { key: 'dosierangabe',  label: 'Dosierangabe' },
  { key: 'grund',         label: 'Grund' },
  { key: 'abgabehinweis', label: 'Abgabehinweis' },
  { key: 'autIdem',       label: 'Aut idem (Ja/Nein)' },
  { key: 'privatrezept',  label: 'Privatrezept (Ja/Nein)' },
];

/** Shifts a 'TT.MM.JJJJ' date forward/backward by `days`. */
function shiftDate(date: string, days: number): string {
  const [d, m, y] = date.split('.').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(dt.getDate())}.${pad(dt.getMonth() + 1)}.${dt.getFullYear()}`;
}

/** Heuristic: strips a trailing manufacturer suffix and appends "Generika"
 *  so the synthesised counterpart looks plausibly different. */
function alternativeBrand(brand: string): string {
  return brand.replace(/[ -](TAD|Heumann|AL|1A|Basics|Pharma|Generika)$/i, '').trim() + ' Generika';
}

/**
 * Builds the V/D diff for the given eML row. The row's own values populate
 * the V or D side (based on `row.typ`); the opposite side is synthesised
 * (date shifted by ±8 days, brand swapped to "Generika", privatrezept set to "—").
 */
export function compareEmlFields(row: EmlRow): EmlFieldDiff[] {
  const isV = row.typ === 'V';

  const own: EmlFieldRow = {
    datum:         row.datum,
    wirkstoff:     row.wirkstoff,
    handelsname:   row.handelsname,
    wirkstaerke:   row.staerke,
    form:          row.form,
    dosierangabe:  row.dosierung,
    grund:         'Bluthochdruck',
    abgabehinweis: '—',
    autIdem:       'Nein',
    privatrezept:  'Nein',
  };

  const counterpart: EmlFieldRow = {
    ...own,
    datum:        shiftDate(row.datum, isV ? 8 : -8),
    handelsname:  alternativeBrand(row.handelsname),
    privatrezept: '—',
  };

  const v = isV ? own : counterpart;
  const d = isV ? counterpart : own;

  return FIELD_LABELS.map(f => ({
    label:   f.label,
    v:       v[f.key],
    d:       d[f.key],
    differs: v[f.key] !== d[f.key],
  }));
}
