import { MedEntry, EmlRow, KarteikarteRow, PastPlanMed } from './emp-data';

/**
 * Search predicates — pure functions that decide whether a given row
 * matches a free-text query. Centralised here so the screen, sources
 * panel and past-plan modal stay in sync (previously `planMedMatches`
 * was duplicated in two files).
 *
 * Convention:
 *   - Empty query → `medMatches` / `emlMatches` / `kkMatches` return true
 *     (no filter applied), but `planMedMatches` returns false (used only
 *     for match-count rendering, where "no query" means "no hits").
 *   - Comparison is case-insensitive against a fixed set of fields per
 *     row type.
 */

function normalise(query: string): string {
  return query.trim().toLowerCase();
}

function fieldsInclude(fields: (string | undefined)[], q: string): boolean {
  return fields.some(v => !!v && v.toLowerCase().includes(q));
}

export function medMatches(med: MedEntry, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return fieldsInclude(
    [
      med.wirkstoff, med.handelsname, med.staerke, med.form,
      med.dosierung, med.grund,
      med.details?.mitbehandler, med.details?.versicherte,
    ],
    q,
  );
}

export function emlMatches(row: EmlRow, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return fieldsInclude(
    [row.wirkstoff, row.handelsname, row.staerke, row.form, row.dosierung],
    q,
  );
}

export function kkMatches(row: KarteikarteRow, query: string): boolean {
  const q = normalise(query);
  if (!q) return true;
  return fieldsInclude([row.text, row.arzt], q);
}

/** Note: returns FALSE for an empty query — past-plan rows light up the
 *  match-count badge only when an actual query is typed. */
export function planMedMatches(m: PastPlanMed, query: string): boolean {
  const q = normalise(query);
  if (!q) return false;
  return fieldsInclude(
    [m.wirkstoff, m.handelsname, m.staerke, m.form, m.dosierung, m.grund],
    q,
  );
}
