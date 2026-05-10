# INDAMED — eMP Prototype

Angular prototype of the **elektronischer Medikationsplan (eMP)** screen for INDAMED.
Consumes the `@indamed/ui` design system as a published npm package.

The screen demonstrates: patient context, plan table (aktiv / pausiert / geplant),
sources panel (eML / Karteikarte / vergangene Pläne), full Bearbeiten-Modal with
multiple Dosistyp modes (Tageszeiten, Uhrzeiten, Wöchentlich, Intervall),
eML-Import, ABDATA search trigger, and Past-Plan adoption.

## Prerequisites

- Node.js 20+ and npm 11+
- Network access to the INDAMED Verdaccio registry: `http://49.12.234.180:4873/`
  (anonymous reads, no token required)

## Install

The `.npmrc` already points at the registry for `@indamed/*` scoped packages —
no extra setup needed.

```bash
npm install
```

## Develop

```bash
npm start          # ng serve on port 4202
```

Open `http://localhost:4202/emp` (the EMP screen is the primary route).

## Build

```bash
npm run build
```

## Backend integration

The prototype uses static demo data (`projects/prototype-elements/src/app/data/emp-data.ts`).
Every read endpoint, write mutation, and request/response shape is documented in
inline `BACKEND-INTEGRATION` comments throughout the codebase:

- `data/emp-data.ts` — GET endpoints + response shapes for patient,
  medications (active / paused / planned), eML, Karteikarte, past plans.
- `screens/emp/emp-screen.ts` — POST/PATCH mutations: eML import, pausieren,
  beenden, source-row actions, ABDATA search.
- `screens/emp/components/emp-bearbeiten-modal.component.ts` — PUT/POST
  payload for save (incl. wöchentlich / intervall schedule shapes).

A reference `EmpBackendService` implementation with `HttpClient`, ISO↔DE
date mapping, DTO adapters, and full Observable-based methods lives at
`projects/prototype-elements/src/app/data/emp-backend.service.example.ts`.
Rename it to `emp-backend.service.ts` and inject it in `emp-screen.ts` to
activate the live wiring.

### Conventions

- **Date format (UI):** `TT.MM.JJJJ` — backend should ship ISO `YYYY-MM-DD`,
  the example service handles the conversion.
- **Dosage format:** `M-M-A-N` (morgens-mittags-abends-nachts) string,
  or freitext (`"Bei Bedarf"`, `"Zu den Mahlzeiten"`).
- **Patient scope:** all reads are nested under `/api/patients/{patientId}/...`.
- **Auth:** Bearer token in `Authorization` header.

## Design system

`@indamed/ui` is the canonical source of truth for tokens, primitives, and
patterns. Storybook docs: `http://49.12.234.180:8029/`.

This prototype consumes the published package and does **not** copy or fork
component source. To try design changes, edit the upstream library and
publish a new patch version.
