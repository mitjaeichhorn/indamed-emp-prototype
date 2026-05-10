/**
 * BEISPIEL — Backend-Service für den EMP-Prototypen
 * ─────────────────────────────────────────────────────────────────────────────
 * Diese Datei ist ein Referenz-Beispiel und wird im Prototyp NICHT verwendet.
 * Sie zeigt, wie die in `emp-data.ts`, `emp-screen.ts` und
 * `emp-bearbeiten-modal.component.ts` annotierten Endpoints konkret
 * angebunden werden — inklusive Datums-Formatierung, Status-Mapping und
 * Optimistic-UI-Hinweisen.
 *
 * Aktivierung:
 *   1. Datei umbenennen → `emp-backend.service.ts`
 *   2. In `emp-screen.ts` injizieren:
 *        constructor(private api: EmpBackendService) {}
 *      und die statischen Konstanten durch `toSignal(this.api.getXxx())` ersetzen
 *      (siehe Hinweis-Block in `emp-screen.ts`).
 *   3. `EMP_API_BASE_URL` per `provideHttpClient()` + `InjectionToken` setzen.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { Injectable, InjectionToken, inject } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { PatientData } from '@indamed/ui';
import {
  MedEntry,
  EmlRow,
  KarteikartzeRow,
  PastPlanEntry,
} from './emp-data';

// ─────────────────────────────────────────────────────────────────────────────
// Konfiguration
// ─────────────────────────────────────────────────────────────────────────────

export const EMP_API_BASE_URL = new InjectionToken<string>('EMP_API_BASE_URL');

export type MedStatus = 'active' | 'paused' | 'planned' | 'ended';

/** Backend-Wire-Format (ISO-Datums, englische Status). Wird im Service in
 *  das deutsche Anzeigeformat aus `emp-data.ts` umformatiert. */
interface MedEntryDto {
  id:          string;
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;
  hinweise:    string;
  grund:       string;
  rw:          number;
  art:         string;
  status:      MedStatus;
  details: {
    versicherte:  string;
    mitbehandler: string;
    beginn:       string;          // ISO 'YYYY-MM-DD'
    ende?:        string | null;
    icd:          string;
    historie:     unknown[];       // hier vereinfacht
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Datums-Helfer (ISO ↔ deutsche Anzeige)
// ─────────────────────────────────────────────────────────────────────────────

/** 'YYYY-MM-DD' → 'TT.MM.JJJJ' */
function isoToDe(iso: string | null | undefined): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}.${m}.${y}`;
}

/** 'TT.MM.JJJJ' → 'YYYY-MM-DD' */
function deToIso(de: string): string {
  const [d, m, y] = de.split('.');
  return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
}

function dtoToMedEntry(dto: MedEntryDto): MedEntry {
  return {
    id:          dto.id,
    wirkstoff:   dto.wirkstoff,
    handelsname: dto.handelsname,
    staerke:     dto.staerke,
    form:        dto.form,
    dosierung:   dto.dosierung,
    hinweise:    dto.hinweise,
    grund:       dto.grund,
    rw:          dto.rw,
    art:         dto.art,
    details: {
      versicherte:  dto.details.versicherte,
      mitbehandler: dto.details.mitbehandler,
      beginn:       isoToDe(dto.details.beginn),
      ende:         dto.details.ende ? isoToDe(dto.details.ende) : undefined,
      icd:          dto.details.icd,
      historie:     [],
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export interface CreateMedicationPayload {
  sourceType:  'eml' | 'karteikarte' | 'pastPlan' | 'manual';
  sourceRef?:  string;
  wirkstoff:   string;
  handelsname: string;
  staerke:     string;
  form:        string;
  dosierung:   string;             // 'M-M-A-N' oder Freitext
  hinweise?:   { versicherte: string; mitbehandler: string };
  grund:       string;
  icd:         string;
  beginn:      string;             // 'TT.MM.JJJJ' — wird intern zu ISO
}

export type UpdateMedicationPayload = Partial<CreateMedicationPayload>;

@Injectable({ providedIn: 'root' })
export class EmpBackendService {
  private readonly http    = inject(HttpClient);
  private readonly baseUrl = inject(EMP_API_BASE_URL);

  /** Bearer-Token kommt aus dem Auth-Service der App. Hier vereinfacht. */
  private headers(): HttpHeaders {
    return new HttpHeaders({ 'Content-Type': 'application/json; charset=utf-8' });
  }

  // ── Read ───────────────────────────────────────────────────────────────

  /** GET /api/patients/{patientId} */
  getPatient(patientId: string): Observable<PatientData> {
    return this.http.get<PatientData>(
      `${this.baseUrl}/patients/${patientId}`,
      { headers: this.headers() },
    );
  }

  /** GET /api/patients/{patientId}/medications?status=… */
  getMedications(patientId: string, status: MedStatus): Observable<MedEntry[]> {
    return this.http
      .get<MedEntryDto[]>(
        `${this.baseUrl}/patients/${patientId}/medications`,
        { headers: this.headers(), params: { status } },
      )
      .pipe(map(list => list.map(dtoToMedEntry)));
  }

  /** GET /api/patients/{patientId}/sources/eml */
  getEml(patientId: string): Observable<EmlRow[]> {
    return this.http.get<EmlRow[]>(
      `${this.baseUrl}/patients/${patientId}/sources/eml`,
      { headers: this.headers() },
    );
  }

  /** GET /api/patients/{patientId}/sources/karteikarte */
  getKarteikarte(patientId: string): Observable<KarteikartzeRow[]> {
    return this.http.get<KarteikartzeRow[]>(
      `${this.baseUrl}/patients/${patientId}/sources/karteikarte`,
      { headers: this.headers() },
    );
  }

  /** GET /api/patients/{patientId}/plans?archived=true */
  getPastPlans(patientId: string): Observable<PastPlanEntry[]> {
    return this.http.get<PastPlanEntry[]>(
      `${this.baseUrl}/patients/${patientId}/plans`,
      { headers: this.headers(), params: { archived: 'true' } },
    );
  }

  // ── Write ──────────────────────────────────────────────────────────────

  /** POST /api/patients/{patientId}/medications — neuer Plan-Eintrag,
   *  z. B. aus eML-Übernahme oder ABDATA-Auswahl. */
  createMedication(patientId: string, payload: CreateMedicationPayload): Observable<MedEntry> {
    const body = { ...payload, beginn: deToIso(payload.beginn) };
    return this.http
      .post<MedEntryDto>(
        `${this.baseUrl}/patients/${patientId}/medications`,
        body,
        { headers: this.headers() },
      )
      .pipe(map(dtoToMedEntry));
  }

  /** PUT /api/patients/{patientId}/medications/{medId} — Bearbeiten-Modal Save. */
  updateMedication(patientId: string, medId: string, patch: UpdateMedicationPayload): Observable<MedEntry> {
    const body = { ...patch, beginn: patch.beginn ? deToIso(patch.beginn) : undefined };
    return this.http
      .put<MedEntryDto>(
        `${this.baseUrl}/patients/${patientId}/medications/${medId}`,
        body,
        { headers: this.headers() },
      )
      .pipe(map(dtoToMedEntry));
  }

  /** PATCH /api/patients/{patientId}/medications/{medId} — Status-Wechsel
   *  (Pausieren, Beenden, Wieder-Aufnehmen). `endDate` ist 'TT.MM.JJJJ'. */
  setMedicationStatus(
    patientId: string,
    medId: string,
    status: MedStatus,
    endDate?: string,
  ): Observable<MedEntry> {
    const body = { status, endDate: endDate ? deToIso(endDate) : null };
    return this.http
      .patch<MedEntryDto>(
        `${this.baseUrl}/patients/${patientId}/medications/${medId}`,
        body,
        { headers: this.headers() },
      )
      .pipe(map(dtoToMedEntry));
  }

  /** PATCH /api/patients/{patientId}/sources/{kind}/{rowId} — markiert eine
   *  Quellzeile als verarbeitet (für die "Bereits übernommen"-Anzeige). */
  markSourceUsed(
    patientId: string,
    kind: 'eml' | 'karteikarte',
    rowId: string,
    used: boolean,
  ): Observable<void> {
    return this.http.patch<void>(
      `${this.baseUrl}/patients/${patientId}/sources/${kind}/${rowId}`,
      { used },
      { headers: this.headers() },
    );
  }

  /** GET /api/abdata/search?q=…&withRezept=… — ABDATA-Suche. */
  searchAbdata(query: string, withRezept: boolean): Observable<{
    pzn:              string;
    wirkstoff:        string;
    handelsname:      string;
    staerke:          string;
    form:             string;
    rezeptpflichtig:  boolean;
    hersteller:       string;
  }[]> {
    return this.http.get<any[]>(
      `${this.baseUrl}/abdata/search`,
      { headers: this.headers(), params: { q: query, withRezept: String(withRezept) } },
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Verwendung in `emp-screen.ts` (Skizze)
// ─────────────────────────────────────────────────────────────────────────────
//
//   private readonly api = inject(EmpBackendService);
//   private readonly patientId = '123456789';
//
//   readonly patient  = toSignal(this.api.getPatient(this.patientId), { initialValue: null });
//   readonly aktive   = toSignal(this.api.getMedications(this.patientId, 'active'),  { initialValue: [] });
//   readonly pausiert = toSignal(this.api.getMedications(this.patientId, 'paused'),  { initialValue: [] });
//   readonly geplant  = toSignal(this.api.getMedications(this.patientId, 'planned'), { initialValue: [] });
//
//   submitEmlImport(): void {
//     const row = this.emlRow();
//     if (!row) return;
//     this.api.createMedication(this.patientId, {
//       sourceType:  'eml',
//       sourceRef:   row.id,
//       wirkstoff:   row.wirkstoff,
//       handelsname: row.handelsname,
//       staerke:     row.staerke,
//       form:        row.form,
//       dosierung:   formatDosage(this.emlDosage()),
//       hinweise:    { versicherte: this.emlHinweise(), mitbehandler: '' },
//       grund:       this.emlGrund(),
//       icd:         this.emlIcd(),
//       beginn:      this.emlBeginn(),
//     }).subscribe({
//       next: () => this.emlOpen.set(false),     // Liste wird via Refetch aktualisiert
//       error: err => this.handleApiError(err),
//     });
//   }
//
//   onBearbeitenPausieren(med: MedEntry): void {
//     this.bearbeitenOpen.set(false);
//     this.openConfirm({
//       title:   'Medikament pausieren',
//       message: `Möchten Sie „${med.wirkstoff}" wirklich pausieren?`,
//       danger:  true,
//       action:  () => this.api
//         .setMedicationStatus(this.patientId, med.id, 'paused', heuteAlsDe())
//         .subscribe(),
//     });
//   }
//
