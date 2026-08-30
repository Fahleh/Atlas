# Atlas Frontend Standards

This document defines React, forms, UI state, destructive actions, CSS,
responsive behavior, accessibility, overlays, avatars, and frontend-specific
forbidden patterns.

---

## React Components

- Server Components by default.
- Add `"use client"` only for hooks, browser APIs, or event handlers.
- Use `type ComponentNameProps` for props.
- Never use inline prop types.
- Each `useEffect` handles one concern.
- Never use an async function directly as the effect callback.
- Effects that attach listeners or start async work must clean up.
- Guard async state updates with a `cancelled` flag.

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetcher("/api/resource");
    if (cancelled) return;

    if ("type" in data) {
      handleError(data);
      return;
    }

    setData(data);
  }

  load();

  return () => {
    cancelled = true;
  };
}, []);
```

### `useSearchParams`

Any Client Component calling `useSearchParams()` must be wrapped in
`<Suspense>`.

Extract the search-dependent part into a small child and wrap only that child.
Do not suspend an entire page unnecessarily.

Run `npm run build` after routing, Suspense, or rendering-mode changes and
confirm the route's `○` or `ƒ` output matches intent.

### Cached entities in shared state

Do not store whole React Query entities in Context or lifted state. Store the
ID and derive the current entity from live query data. Full reasoning lives in
`docs/architecture.md`.

### Reset state during render, not in an effect

When plain `useState` must reset because an identity prop changed, compare and
adjust during render:

```typescript
const currentId = entity?.id ?? null;
const [resetId, setResetId] = useState(currentId);

if (currentId !== resetId) {
  setResetId(currentId);
  setConfirmingId(null);
}
```

Normalize both sides to the same type. Comparing `undefined` with stored `null`
causes an infinite render loop.

Do not use:

```typescript
useEffect(() => {
  setConfirmingId(null);
}, [entity?.id]);
```

### Reset `useActionState` through remounting

`useActionState` has no setter. A persistent parent will preserve its state.

Extract the action-backed section into a child and key it by the identity that
should reset it:

```tsx
<AddMemberForm key={project.id} project={project} />
```

A real remount is the reset mechanism.

### Repeated success effects

A `useEffect` watching `state.success` will miss `true -> true` across two
successful submissions.

Run effects that must occur after every successful dispatch imperatively inside
the action's success branch.

---

## React 19 Forms and Actions

Atlas uses React 19 action APIs. Do not use the pre-19
`useState` + `onSubmit` + `preventDefault()` pattern for mutation forms.

### Submission

```typescript
const [state, formAction, isPending] = useActionState(
  actionFunction,
  initialState
);
```

The action signature is:

```typescript
(previousState, formData) => newState
```

Allow TypeScript to infer generics when the action function is already typed.
Confirm with `tsc` or the build before adding explicit generics.

```tsx
<form action={formAction}>
```

### Inputs

Native fields are uncontrolled by default:

- `name`;
- `defaultValue`;
- `FormData` inside the action.

Use controlled state only for custom widgets that do not map directly to native
form controls. Carry their value through a hidden input.

React 19 resets uncontrolled fields after every action submission, on success
and failure.

To preserve a failed value:

1. return it in action state;
2. set it as `defaultValue` on the next render.

Do not rely on `formRef.current?.reset()`.

### Pending state

Use `useFormStatus()` in a child rendered inside the `<form>`.

Do not call it in the component that renders the form element.
Do not prop-drill `isPending` when `useFormStatus` can read it.

### Multiple actions in one form

A submit button may override the form action:

```tsx
<button formAction={deleteAction}>Confirm delete</button>
```

The override action runs outside `useActionState`'s managed state. Capture any
required error in local state inside the wrapper component.

### Identifying which action is pending

`useFormStatus().pending` is form-wide.

Do not add a hidden `_action` marker. Hidden sibling inputs are included in
`FormData` regardless of which button submitted and can become stale.

Compare action references:

```typescript
const { action } = useFormStatus();
const isPrimaryAction = action === formAction;
```

Expose the primary action through context when siblings need it.

`useActionState` returns a stable action reference. Local wrapper actions are
fresh closures, making identity comparison deterministic.

### Validation

Use HTML attributes for immediate feedback and repeat all validation inside the
action.

Apply the global `FormData` rules in root `CLAUDE.md`.

### Mutations

Client-rendered entity actions:

1. call React Query `mutateAsync`;
2. return structured action state such as `{ error: string | null }`;
3. invalidate relevant query keys on success;
4. close the modal on success.

### Optimistic UI

Use `useOptimistic` only where the eventual server state is predictable, such
as marking a task complete.

### Redirect primitives

Server Actions:

```typescript
redirect("/safe-path");
```

- import from `next/navigation`;
- call outside `try/catch`;
- call after all error-return branches.

Route Handlers:

```typescript
return NextResponse.redirect(url);
```

Do not mix these primitives.

### Ref lint false positive

Passing a ref into an action factory during render may trigger
`eslint-plugin-react-hooks@7.x`'s `react-hooks/refs` false positive even when
`.current` is read only later inside the returned callback.

Use a scoped disable directly above the line containing the formatted ref and
cite upstream issues `facebook/react#34954` and `#35813`.

After Prettier runs, verify that `eslint-disable-next-line` still sits
immediately above the flagged line.

Before implementing a new form or mutation flow, verify the current React 19
Actions guidance against installed versions and official docs.

---

## Destructive Actions

Severity decides the confirmation pattern.

### Low-blast-radius form delete

Example: deleting one task with no cascading effects.

Use inline two-step confirmation:

1. neutral `Delete task`;
2. danger `Confirm delete?`;
3. second click submits through button-level `formAction`.

### Low-blast-radius non-form removal

Example: removing a project member.

- Store the currently confirming item ID.
- Show explicit Cancel and Confirm controls.
- Starting another confirmation naturally replaces the previous ID.
- Focus the safe Cancel action explicitly after the control swap.
- Do not rely on browser focus fallback.

### High-blast-radius delete

Example: deleting a project that cascades to tasks.

Use a separate confirmation modal with explicit consequence copy:

> This also deletes its N tasks. This cannot be undone.

Reuse `EntityModal` with:

- Header;
- Body warning;
- Footer;
- `CancelButton`;
- danger `SubmitButton`.

### Modal reset keys

Every repeatable `EntityModal`/`useActionState` modal needs a changing `key`
each time it opens.

Namespace sibling modal keys:

```tsx
key={`task-${modalResetKey}`}
key={`delete-${deleteModalResetKey}`}
```

Do not use independent bare counters that may collide.

### Verify cascade behavior

Read actual foreign keys before writing delete code. Current relationships live
in `docs/database.md`.

---

## Active Link Detection

Use `usePathname()`.

- Root link: `pathname === "/"`.
- Other links: `pathname.startsWith(href)`.
- Never evaluate `pathname.startsWith("/")`.
- Extract the check as a pure named function outside the component.

---

## Dark Mode

- Theme is applied through `[data-theme="dark"]` on `<html>`.
- Initial choice:
  1. `localStorage`;
  2. `prefers-color-scheme`;
  3. light.
- Do not use component-level
  `@media (prefers-color-scheme: dark)`.
- Define every color token for both themes in `styles/tokens.css`.

---

## Avatar Components

### `Avatar`

`components/Avatar.tsx` is global and feature-agnostic.

Props:

```typescript
type AvatarProps = {
  name: string;
  avatarUrl?: string | null;
  size?: "default" | "small" | "medium" | "large";
};
```

`size` selects a fixed CSS class (`Avatar.module.css`'s `.avatarDefault`
/`.avatarSmall`/`.avatarMedium`/`.avatarLarge`, 34/32/36/150px), not an
arbitrary pixel value; a `AVATAR_SIZE_PX` map derives the numeric
`width`/`height` `next/image` needs from the same variant. This is a
deliberate, CSP-driven constraint, not an accessibility or design
requirement — see the style-src-attr entry in `docs/decisions.md`.

- Persisted URL: render `next/image`.
- Missing URL: initials fallback using `getInitials` and
  `getMemberAvatarPaletteIndex` from `lib/utils.ts`, which selects one
  of six fixed classes (`Avatar.module.css`'s `.palette0`-`.palette5`).

### `AvatarOverflow`

Sibling export for capped avatar strips.

Use the same `size` variant and `AVATAR_SIZE_CLASS`/`AVATAR_SIZE_PX`
maps as `Avatar`.

### Accessibility mode

Choose deliberately:

- Real content in member lists: meaningful image alt or initials.
- Decoration inside an already-labelled group: wrap in `aria-hidden` spans.

Do not leave the avatar in an ambiguous accessibility state.

### Local upload preview

Use plain `<img>` for `blob:` previews. Persisted HTTPS URLs use `next/image`.
Storage details live in `docs/database.md`.

---

## PasswordInput

`components/PasswordInput.tsx` is global and feature-agnostic, same tier as
`Avatar` and `StatusBox`. Login, signup, and update-password each render it;
three real call sites is what moved this out of per-form inputs, matching
the `.pageContainer` duplication rule above.

Props:

```typescript
type PasswordInputProps = {
  id: string;
  name: string;
  required?: boolean;
  autoComplete?: string;
  defaultValue?: string;
};
```

The native `<input>` stays uncontrolled, same as any other text field:
`name`, `defaultValue`, read through `FormData` in the action. Only the
show/hide flag is local `useState`. Each rendered instance gets its own
state slot, so two `PasswordInput`s on the same form (password and confirm
password) toggle independently, nothing extra needed.

### Focus and selection across the type swap

Chrome drops focus and resets the caret to position 0 when the attribute changes,
and does it a second time on the next animation frame, after a plain effect
has already tried to restore it. The fix runs the restore inside
`requestAnimationFrame` so it lands after that second reset.

The toggle button also calls `preventDefault()` on `mousedown`, not
`click`. A button normally takes focus on mousedown, before the click
handler runs, which would make the input's focus state look wrong by the
time we read it. Blocking that keeps focus wherever it already was through
the click, so the handler reads the input's real focus state, not the button's.

Behavior once that's in place: if the input was focused, its cursor
position or active selection is captured before the toggle and reapplied
after. If it was not focused, the toggle only swaps visibility and does
not touch focus.

jsdom does not reproduce any of this. A bare `<input>` with no React
involved, tested directly, keeps its selection and focus across a
`type` change in jsdom, so there is nothing there for the restore
logic to fix in the first place. This behavior is verified only by
real browser testing, not by `tests/unit/PasswordInput.test.tsx`.

### Accessibility

Icon-only toggle button, `aria-label` swaps with state, same pattern as
Sidebar's theme toggle (`Sidebar.tsx`, `"Switch to dark mode"` /
`"Switch to light mode"`):

```tsx
aria-label={showPassword ? "Hide password" : "Show password"}
```

Icons are `Eye`/`EyeOff` from `lucide-react`.

---

## CSS Strategy

### Page-level layout

The dashboard shell clears Sidebar/Header chrome but provides no content
padding.

Every dashboard page owns its page container, currently:

```css
.pageContainer {
  display: flex;
  flex-direction: column;
  gap: var(--space-6);
  padding: var(--space-8);
}
```

This duplication exists in two pages. Extract only when a third page needs the
identical rule.

Settings-style pages may add `align-items: center`. List and grid pages remain
full-width and left-aligned.

### Hybrid Tailwind/CSS Modules rule

Use Tailwind for:

- flex/grid structure;
- spacing;
- responsive breakpoints.

Use CSS Modules for:

- component positioning;
- colors through tokens;
- animations;
- transitions;
- complex state styles.

Never use Tailwind color classes or arbitrary color values.

Exception: `ProjectStats.module.css`'s four-cell stats bar keeps its
grid/flex breakpoint switch in CSS Modules rather than Tailwind. The
row divider needs `:nth-child(-n+2)` combined with `:last-child`
targeting four fixed cells, expressible in Tailwind only through
arbitrary-variant syntax that turns messier than the CSS Module
version for this exact shape. Checked directly against the real
properties involved before deciding, not a default.

### Tokens

Use `styles/tokens.css` for all visual values:

- colors;
- typography;
- spacing;
- radii;
- shadows;
- layout dimensions.

When no suitable token exists, flag it and propose one. Do not hardcode first.

There is no `--color-danger-hover`. Reconsider accent styling before proposing a
new danger hover token.

`--font-mono` is reserved but currently unused. Do not remove or invent usage
without a real need.

### Token reference

```css
/* Colors */
var(--color-background)
var(--color-surface)
var(--color-surface-raised)
var(--color-border)
var(--color-border-strong)
var(--color-text-primary)
var(--color-text-secondary)
var(--color-text-muted)
var(--color-text-on-accent)
var(--color-accent)
var(--color-accent-hover)
var(--color-accent-subtle)
var(--color-danger)
var(--color-success)
var(--color-warning)

/* Typography */
var(--font-sans)
var(--font-mono)
var(--font-size-xs) through var(--font-size-5xl)
var(--font-weight-normal) through var(--font-weight-bold)
var(--line-height-tight)
var(--line-height-normal)
var(--line-height-relaxed)

/* Spacing */
var(--space-1) through var(--space-20)

/* Radius */
var(--radius-sm)
var(--radius-md)
var(--radius-lg)
var(--radius-pill)

/* Shadows */
var(--shadow-sm)
var(--shadow-md)
var(--shadow-lg)

/* Layout */
var(--sidebar-width)
var(--header-height)
```

### Dynamic colors

Set dynamic colors through custom properties:

```tsx
<span
  style={
    {
      "--avatar-bg": color.bg,
      "--avatar-text": color.text,
    } as React.CSSProperties
  }
  className={styles.avatar}
/>
```

Do not use:

```tsx
<span style={{ backgroundColor: color.bg }} />
```

Non-token hex colors are allowed only for non-semantic UI accent palettes, such
as avatar colors, with a short explanation.

### CSS Modules

- One module per component.
- Feature-shared styles in `[feature]Shared.module.css`.
- camelCase class names.
- Positioning in CSS Modules.
- Animations/transitions in CSS Modules.
- Every interactive element gets hover, focus-visible, and active states.
- Standard focus:
  `outline: 2px solid var(--color-accent); outline-offset: 2px`.
- Compose a small shared interaction class when base styles differ.
- Keep each class's base declarations together.
- Use `text-align: center` for one line of centered text rather than flex.
- Use an em dash (`—`) for compact missing-value display.

### Modal footer layout

For an optional destructive action on the left and primary actions on the
right:

```css
.footer {
  display: flex;
  justify-content: space-between;
}

.footerActions {
  display: flex;
  gap: var(--space-3);
  margin-left: auto;
}
```

### Overlay transitions

Keep overlays mounted and control visibility with CSS:

```css
.backdrop {
  opacity: 0;
  pointer-events: none;
  transition: opacity 200ms ease-in-out;
}

.backdropVisible {
  opacity: 1;
  pointer-events: auto;
}
```

Put transitions on base classes.

### Slide-over width

```css
.panel {
  width: 100%;
  max-width: 540px;
}
```

Never use a fixed width alone.

### Cascade order

- Base rules before media-query overrides.
- Same breakpoint, multiple selectors: merge into one block, don't
  repeat the query.
- Different breakpoints, each overriding a single selector: keep the
  block next to that selector, don't force it to the bottom.
- Never repeat the same breakpoint condition across multiple blocks
  in one file.

### Responsive breakpoints

- Mobile-first.
- Use `min-width`.
- Primary desktop breakpoint: `1024px`.
- JS checks must align: `window.innerWidth < 1024`.
- Never use `max-width` media queries.

---

## Accessibility

Accessibility is required. Full audits and known gaps may also live in
`docs/a11y.md`.

### Core rules

- Semantic HTML first.
- Do not add ARIA to compensate for the wrong element.
- Non-button interactive elements need:
  - `role="button"`;
  - `tabIndex={0}`;
  - Enter handler;
  - Space handler with `preventDefault()`.
- Icon-only buttons need descriptive `aria-label`.
- Landmarks need `aria-label`.
- Never suppress focus outlines.
- `<dt>`/`<dd>` require a `<dl>` ancestor.
- Loading skeleton groups get one `role="status"` and
  `aria-live="polite"` on the container.
- Individual `Skeleton` items carry only `aria-busy`.
- Loaded content should not retain the loading live region.
- Control replacement requires explicit focus management.

### Keyboard interaction

- All click interactions must be keyboard operable.
- Escape closes the topmost open overlay.
- Parent overlay Escape handlers must guard every nested overlay:
  `isOpen && !isModalOpen && !isDeleteModalOpen`.
- Add a new guard when a new nested overlay is introduced.

### Tables

Use semantic table elements:

- `<table>`;
- `<thead>`;
- `<tbody>`;
- `<tr>`;
- `<th scope="col">`;
- `<td>`.

Do not simulate tables with divs.

Icon-only columns need visually hidden header text.
Cell-level controls stop propagation when the row itself is clickable.

### Dropdown menus

Trigger:

```tsx
aria-haspopup="menu"
aria-expanded={isOpen}
```

Container:

```tsx
role="menu"
aria-label="..."
```

Items:

```tsx
role="menuitem"
```

Use separate effects for:

- Escape;
- outside mousedown.

Use a `data-[menu-cell]` marker for outside-click detection.

Do not build a menu when all actions are already one click away through an
existing working detail view. Remove inert or redundant affordances.

### Custom listbox/status field

For custom status controls:

- trigger: `aria-haspopup="listbox"`, `aria-expanded`;
- options container: `role="listbox"`;
- option: `role="option"`, `aria-selected`;
- hidden input carries the selected value into `FormData`;
- local state owns selection and visibility.

Use `components/StatusBox.tsx` for task/project status.

`StatusBox` is deliberately status-specific:

```typescript
T extends string
Record<T, { label: string; dotColor: string }>
T[]
```

`dotColor` is required. Do not generalize for hypothetical non-status needs.

### Overlay and modal semantics

Sidebar:

- mobile open: `role="dialog"`, `aria-modal="true"`, labelled;
- persistent desktop: no dialog role or aria-modal.

Backdrop:

- functional close control;
- `role="button"`;
- descriptive label;
- `tabIndex={isOpen ? 0 : -1}`;
- never `aria-hidden="true"`.

### `EntityModal`

The generic modal shell is `components/EntityModal.tsx`.

It owns:

- `useActionState`;
- focus trap;
- body scroll lock;
- overlay accessibility.

It is generic over:

```typescript
TFormState extends { error: string | null }
```

Compound exports include:

- Header;
- Title;
- CloseButton;
- Body;
- Field;
- Footer;
- FooterActions;
- CancelButton;
- SubmitButton.

It uses `useId()` per instance for `aria-labelledby`. Do not use a static ID
because multiple modal instances may be siblings.

Build new create/edit/confirm modals on `EntityModal`, directly or through a
thin typed wrapper.

### Focus management

- Move focus inside an overlay when it opens.
- Trap focus in mobile overlays.
- Sidebar traps only on mobile.
- Slide-overs trap at every viewport.
- Query focusable elements with:

```text
button, a[href], input, select, textarea,
[tabindex]:not([tabindex="-1"])
```

- Clean up focus-trap listeners.

### Body scroll lock

For mobile sidebar:

```typescript
document.body.style.overflow = "hidden";
```

- guard with `window.innerWidth < 1024`;
- restore in cleanup;
- add `touch-action: none` to the backdrop.

Nested modals inside a slide-over pass `disableScrollLock` because the parent
already owns the lock.

---

## Frontend Forbidden Patterns

```tsx
useEffect(async () => {}, []);

{isOpen && <div className={styles.backdrop} />}

<aside role="dialog">Persistent desktop content</aside>

<div aria-hidden="true" onClick={onClose} />

<Image src={URL.createObjectURL(file)} alt="" />

<span style={{ backgroundColor: color.bg }} />

const [selectedProject, setSelectedProject] =
  useState<Project | null>(null);

<input type="hidden" name="_action" value="delete" />
```

```css
background: #fafafa;
color: #ea8c00;

width: 480px;

@media (max-width: 1023px) {}

@media (min-width: 1024px) { .a { } }
@media (min-width: 1024px) { .b { } }
```

Also forbidden:

- async effects;
- uncleaned listeners/async work;
- one effect for unrelated concerns;
- whole-page Suspense when a small child is sufficient;
- `useEffect` for prop-identity state resets;
- stale boolean-success effects;
- browser-default focus after control replacement;
- hidden pending-action markers;
- duplicated status listbox implementations;
- div-based tables;
- redundant dropdown infrastructure;
- viewport breakpoints that differ from CSS;
- hardcoded or Tailwind-based colors.
