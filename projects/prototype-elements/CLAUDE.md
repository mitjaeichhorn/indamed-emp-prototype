# prototype-elements — Claude Code Instructions

## Purpose

This Angular app is a **clickable prototype** of the INDAMED eMP screen.
Each dialog/screen lives under `src/app/screens/` and is reachable on
`http://localhost:4202/{route}`. The app consumes `@indamed/ui` as a
**published npm package** from the self-hosted Verdaccio registry
(`http://49.12.234.180:4873/`, anonymous reads — see root `.npmrc`).

## Stack

- Angular standalone components, `ChangeDetectionStrategy.OnPush`
- Routes registered in `src/app/routing/app.routes.ts`, lazy-loaded via `loadComponent`
- `@indamed/ui` installed via npm — to try design changes, bump the lib upstream
  and `npm install` here
- Phosphor icons (`ph-bold` weight) — see "Icons" below
- Tokens from `@indamed/ui/tokens.css`; **no hardcoded hex/px in components**

## How to add a new dialog/screen reachable on :4202

### 1. Folder layout

```
src/app/screens/{slug}/
  {slug}-screen.ts        ← @Component (selector: app-{slug}-screen)
  {slug}-screen.html      ← template
  {slug}-screen.scss      ← screen-scoped styles
  components/             ← (optional) sub-components for this screen
    {sub}.component.ts
    {sub}.component.html
    {sub}.component.scss
  data/                   ← (optional) static demo data, exported interfaces
```

Use the existing `screens/emp/` folder as the canonical reference. Mirror its conventions
(separate template/style files, sub-components for modals, signals for state).

### 2. Component decorator boilerplate

```ts
import { Component, ChangeDetectionStrategy, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogShellComponent, ButtonComponent /* … */ } from '@indamed/ui';

@Component({
  selector: 'app-{slug}-screen',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, DialogShellComponent, ButtonComponent /* … */],
  templateUrl: './{slug}-screen.html',
  styleUrl:    './{slug}-screen.scss',
})
export class {Slug}ScreenComponent { /* signals + handlers */ }
```

### 3. Register the route

Add to `src/app/routing/app.routes.ts`:

```ts
{
  path: '{slug}',
  loadComponent: () =>
    import('../screens/{slug}/{slug}-screen').then(m => m.{Slug}ScreenComponent),
},
```

The new screen is now live at `http://localhost:4202/{slug}`.

### 4. Use the design system, never raw values

| Need | Use | Don't use |
|---|---|---|
| Color | `var(--inm-color-…)` | `#xxxxxx` |
| Spacing | `var(--inm-space-…)` | `12px`, `1rem` |
| Radius | `var(--inm-radius-…)` | hard pixel values |
| Font | `var(--inm-font-family-default)` | font-name strings |
| Component | `<inm-button>`, `<inm-modal>`, `<inm-pattern-…>` | hand-rolled HTML |

If the token you need doesn't exist, **add it to `projects/indamed-ui/src/lib/tokens/tokens.css` first**, then use it. See `02-design-system/CLAUDE.md` for the token-naming convention.

### 5. Modal action rows

Modals expose a `[modal-actions]` slot above the body. Project buttons (and separators) into it:

```html
<inm-modal [open]="open()" title="…" (closed)="open.set(false)">

  <!-- Primary action first, then a separator, then secondary actions -->
  <inm-button modal-actions variant="akzent" size="m" iconLeft="pencil-simple"
    (click)="onEdit()">Bearbeiten</inm-button>
  <span modal-actions class="action-separator" aria-hidden="true"></span>
  <inm-button modal-actions variant="akzent" size="m" iconLeft="repeat">Wiederholen</inm-button>
  <!-- … -->

  <div class="modal-body-pad">…</div>

  <ng-container modal-footer>
    <inm-button variant="normal" size="l" (click)="open.set(false)">Schließen</inm-button>
  </ng-container>
</inm-modal>
```

The `.action-separator` style (1px vertical rule, `--inm-color-border-subtle`, stretches to row height) lives in the screen's `.scss`. Reuse the existing class — see [`emp-screen.scss`](src/app/screens/emp/emp-screen.scss).

## Icons — Phosphor (`ph-bold` weight)

`<inm-button [iconLeft]="…">` and `[iconRight]` render `<i class="ph-bold ph-{name}">`.
Both Phosphor stylesheets (`regular` and `bold`) are pre-loaded via `angular.json` →
`prototype-elements` build target → `styles[]`. **Don't remove either entry** — buttons
go invisible without `bold/style.css`.

Pick semantic names from [phosphoricons.com](https://phosphoricons.com). Common ones:

| Action | Icon |
|---|---|
| Bearbeiten | `pencil-simple` |
| Wiederholen | `repeat` |
| Austausch / wechseln | `swap` |
| Pausieren | `pause` |
| Beenden / stoppen | `stop-circle` |
| Speichern | `floppy-disk` |
| Hinzufügen | `plus` |
| Löschen / entfernen | `trash` |

Icon-only buttons: pass `[iconOnly]="true"` — the projected text stays for screen readers
but is visually hidden, and the button becomes square.

## Running and verifying

```bash
# from 02-design-system/
npm run serve:prototype-elements    # ng serve --port 4202
```

After changing `angular.json` (e.g. adding a stylesheet), **fully restart** the server —
`ng serve` does not hot-reload `angular.json`. Verify with:

```bash
curl -s http://localhost:4202/styles.css | grep -c "ph-bold"   # expect a non-zero count
```

## Language

All UI text is German. Route slugs and component selectors are English (kebab-case).

## Reference

The canonical implementation is `screens/emp/` — the eMP (elektronischer Medikationsplan)
prototype. When unsure about a pattern (state management, modal nesting, sub-component
splitting, data shape), read that folder first.
