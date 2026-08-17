# Atlas Testing and Debugging

This document defines Atlas's current coverage policy, test-writing standards,
build checks, browser verification requirements, and debugging process.

---

## Coverage Policy

- Every `lib/` utility gets a unit test in `tests/unit/`.
- Mirror source names:
  `lib/fetcher.ts` → `tests/unit/fetcher.test.ts`.
- Add component tests where behavior is non-trivial.
- Integration tests live in `tests/integration/`.
- Playwright E2E tests live in `tests/e2e/`.
- React Query hook tests are a deliberate coverage gap. Do not add them
  unprompted without discussion.

Current automated coverage covers the early reference-only `lib/` utilities
plus layer 1 (pure utilities and error-interpretation logic: `lib/utils.ts`,
`lib/supabase/errors.ts`, `projectUtils.ts`). Everything beyond that,
Server Actions, hooks, most components, may have no automated coverage by
deliberate deferral.

`jest.config.ts` has `collectCoverage`/`collectCoverageFrom` configured
(`npm test -- --coverage` reports real numbers) but no `coverageThreshold`.
Nothing is enforced yet.

Check `tests/unit/` before claiming what is covered.

Do not call a change "tested" merely because pre-existing suites passed. Use
accurate language such as:

- type-checked;
- build-verified;
- regression suite passed;
- manually verified.

Only run `npm test` when a change plausibly touches code that existing tests
cover.

---

## Build Verification

Jest does not verify Next.js rendering behavior.

Run `npm run build` after changes involving:

- routing;
- `useSearchParams`;
- Suspense boundaries;
- static/dynamic rendering;
- Next.js page/layout behavior.

Confirm the route output:

- `○` static;
- `ƒ` dynamic.

Do not assume a passing Jest suite proves these concerns safe.

---

## Manual Browser Verification

Some behavior requires a real browser and live environment:

- `FormData` construction;
- `useFormStatus()` across sibling buttons;
- React 19 form-reset timing;
- session/cookie refresh through `proxy.ts`;
- focus transitions;
- focus trapping;
- live Supabase RLS;
- Storage upload/upsert behavior.

When a change touches one of these:

1. describe exact manual steps;
2. perform them when tools/environment allow;
3. report only what was actually observed.

A theoretically correct fix may be wrong at runtime. Direct browser verification
has already caught an incorrect remount assumption in this project.

---

## Test Writing Standards

Use Arrange, Act, Assert in every test.

- One logical guarantee per `it`.
- Test names complete: “it should …”.
- Use `beforeEach` for shared setup.
- Do not repeat Arrange code.
- Put shared fixtures/constants above `describe`.

Prefer a focused assertion set that proves one behavior. Do not combine unrelated
guarantees in one test.

---

## Async Testing

- Mock `fetch` globally with `jest.fn()`.
- Use fake timers for delays, retries, and timeouts.
- Restore real timers in `afterEach`.
- Advance async timers with `jest.runAllTimersAsync()`.
- Chain `.mockResolvedValueOnce()` for sequential responses.
- Use `mockRejectedValueOnce(new Error(...))`.
- Throw `Error` objects, never bare strings.

---

## Component Testing

Use Testing Library:

- `render`;
- `renderHook`;
- `act`;
- `screen`.

Add this directive to component test files:

```typescript
/** @jest-environment jsdom */
```

Mock browser APIs as needed:

- `window.matchMedia`;
- `window.localStorage`.

`jest.config.ts` maps `*.module.css` imports to `tests/mocks/cssModuleMock.js`
(a Proxy returning the property name for any class lookup), so components
importing CSS Modules render under Jest without a real CSS pipeline.

Test dynamic colors through CSS custom properties rather than direct inline
color declarations.

---

## Immutability Testing

Always prove the input was not mutated:

```typescript
expect(result).not.toBe(original);
expect(result).toEqual(expected);
expect(original).toEqual(originalSnapshot);
```

Assert both reference inequality and value equality.

---

## Debugging Process

Every bug follows four steps:

1. **Reproduce** — make it trigger consistently.
2. **Isolate** — reduce to the smallest failing path.
3. **Hypothesize** — state one specific, testable cause.
4. **Verify** — prove or disprove with a tool.

No intuition-only fixes.

### Tool selection

- Synchronous logic: debugger breakpoints + unit tests.
- Async/timing: debugger + Jest fake timers.
- Stale closures: debugger Closure panel.
- Memory leaks: Chrome Memory heap snapshots.
- Re-render issues: React DevTools Profiler.
- `console.log`: last resort and never committed.

---

## Reporting Standard

Never say a command passed unless its output was observed.

Never claim browser behavior from source reading alone.

Separate:

- confirmed evidence;
- reasonable inference;
- unverified hypothesis.

If a tool fails or returns no usable result, report that failure directly.
