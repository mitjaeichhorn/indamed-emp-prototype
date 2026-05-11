import { MedEntry, EmlRow, KarteikarteRow, PastPlanMed } from './emp-data';

/**
 * Med adapters — pure functions that synthesise a `MedEntry` shape from
 * the various source-row types in the prototype. They are called when the
 * user opens the Bearbeiten modal from a non-plan source (eML row,
 * Karteikarte row, past-plan row) and no matching active plan entry exists.
 *
 * Synthesised meds use a `<source>-` ID prefix so the screen can tell them
 * apart from real plan entries — when the modal saves, the matching
 * `sourceType` / `sourceRef` is added to the POST body (see backend
 * annotations in emp-data.ts).
 */

/** Recognised galenic-form abbreviations for Karteikarte free-text parsing. */
const KK_FORM_SET = new Set([
  'TAB','TABL','TABLS','TBL','KAPS','KAP','HKP','SAFT','TR','TRP',
  'AMP','SUPP','SAL','PUL','SPR','CR',
]);

/** Pattern matched as a Stärke literal inside a Karteikarte free-text row. */
const KK_STAERKE_RE = /\d+(?:[.,]\d+)?\s*(?:mg|µg|mcg|g|ml|%|i\.?e\.?|hub|stk)\b/i;

/** Defaults shared by all source-synthesised meds — no rezept, no history,
 *  empty hints. `beginn` is per-source. */
function basePartial(
  id: string,
  wirkstoff: string,
  handelsname: string,
  staerke: string,
  form: string,
  dosierung: string,
  grund: string,
  beginn: string,
): MedEntry {
  return {
    id, wirkstoff, handelsname, staerke, form, dosierung,
    hinweise: '', grund, rw: 0, art: '',
    details: {
      versicherte:  '',
      mitbehandler: '',
      beginn,
      icd:          '',
      historie:     [],
    },
  };
}

/** Synthesises a MedEntry from an eML V/D row. */
export function medFromEmlRow(row: EmlRow): MedEntry {
  return basePartial(
    `eml-${row.id}`,
    row.wirkstoff,
    row.handelsname,
    row.staerke,
    row.form,
    row.dosierung,
    '',
    row.datum,
  );
}

/** Synthesises a MedEntry from a past-plan row. */
export function medFromPastPlanMed(med: PastPlanMed): MedEntry {
  return basePartial(
    `pp-${med.wirkstoff}`,
    med.wirkstoff,
    med.handelsname,
    med.staerke,
    med.form,
    med.dosierung,
    med.grund,
    '',
  );
}

/**
 * Best-effort parse of "WIRKSTOFF [BRAND] STÄRKE FORM" → MedEntry. The
 * Karteikarte holds free-text descriptions like "IBUPROFEN AL 2% SAFT" — we
 * pull Stärke from the first matching numeric+unit token, the form from a
 * trailing galenic abbreviation, and the wirkstoff from the first word
 * (title-cased so it lines up with the Bearbeiten layout).
 */
export function medFromKkRow(row: KarteikarteRow): MedEntry {
  const text       = row.text.trim();
  const staerke    = text.match(KK_STAERKE_RE)?.[0] ?? '';
  const tokens     = text.replace(staerke, '').trim().split(/\s+/);
  const last       = tokens[tokens.length - 1] ?? '';
  const form       = KK_FORM_SET.has(last.toUpperCase()) ? last : '';
  const first      = tokens[0] ?? text;
  const wirkstoff  = first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();

  return basePartial(
    `kk-${row.id}`,
    wirkstoff,
    text,
    staerke,
    form,
    '',
    '',
    row.datum,
  );
}
