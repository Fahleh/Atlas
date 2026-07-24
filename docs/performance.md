# Performance & Memory Decisions

> **Atlas Internal Documentation**
> Week 2 — Advanced JavaScript Patterns & Performance
> Last updated: July 2026

---

## Overview

This document records the performance and memory decisions made during the construction of Atlas's utility layer, plus later, more consequential React render-performance findings from Week 5.

**A note on currency, added during a July 2026 documentation pass:** several utilities described below (`lib/fetcher.ts`, `lib/createCache.ts`, `lib/asyncQueue.ts`) were built early, before Atlas's real data layer existed. That real data layer turned out to be the Supabase client + TanStack React Query, not these utilities — so as of this update, none of the three are called anywhere in the live application (confirmed via `grep`; each is referenced only by its own test suite and `lib/index.ts`'s barrel export). They're preserved here and in the codebase as reference implementations of real memory/async patterns, not as descriptions of Atlas's current runtime behavior. Each section below is marked accordingly. `lib/updateImmutable.ts` is **not** in this category — it's genuinely live, used throughout the real `projectActions.ts`/`taskActions.ts` mutation flows.

---

## Table of Contents

1. [Memory Management Principles](#1-memory-management-principles)
2. [Common Leak Patterns & Mitigations](#2-common-leak-patterns--mitigations)
3. [Cache Architecture (reference implementation, not live)](#3-cache-architecture-reference-implementation-not-live)
4. [Utility Allocation Decisions](#4-utility-allocation-decisions)
5. [Async Performance](#5-async-performance)
6. [Debugging Workflows](#6-debugging-workflows)
7. [React & Next.js Performance Implications](#7-react--nextjs-performance-implications)
8. [React Render Performance — Week 5 Profiling](#8-react-render-performance--week-5-profiling)

---

## 1. Memory Management Principles

JavaScript uses automatic garbage collection — the engine reclaims memory when objects are no longer reachable. However, automatic does not mean guaranteed. Memory leaks occur when references are held longer than necessary, preventing the garbage collector from doing its job.

**Atlas follows three core memory principles:**

**1. Explicit lifetime management.** Every object that could grow unboundedly — caches, queues, event listeners — has an explicit strategy for when and how it releases memory.

**2. Closure scope awareness.** Closures retain their entire surrounding scope, not just the variables they use. Every closure in Atlas is written with awareness of what it captures and for how long that reference will live.

**3. Immutability over mutation.** Immutable updates create new object references rather than modifying existing ones. This prevents shared state corruption and makes garbage collection predictable — old references are released as soon as they go out of scope.

These principles are timeless and still guide the live codebase (see `lib/updateImmutable.ts`, and every `useEffect` cleanup pattern in the real components), independent of which specific early utilities below remain in production use.

---

## 2. Common Leak Patterns & Mitigations

The patterns below are general JavaScript knowledge, still accurate. Where a mitigation originally pointed at a specific Atlas utility, that's now flagged if the utility isn't live — the *pattern* being taught remains correct either way.

### Detached DOM Nodes
Removing an element from the DOM while holding a JavaScript reference to it prevents collection.

```typescript
// Leak
const button = document.querySelector("#submit");
document.body.removeChild(button);
// button reference still alive — not collected

// Fix — release the reference
let button: Element | null = document.querySelector("#submit");
document.body.removeChild(button);
button = null;
```

**Atlas mitigation:** No direct DOM references are stored in module scope. Component-level refs are scoped to React components and released on unmount. This remains true and current across every component built through Week 6.

---

### Forgotten Event Listeners

Event listeners capture their closure scope. If not removed, both the listener and everything it closes over stays in memory for the lifetime of the target.

```typescript
// Leak — listener and its closure scope live forever
function setup() {
  const data = fetchLargeDataset();
  window.addEventListener("resize", () => {
    console.log(data.length); // data captured, never released
  });
}

// Fix — store reference and remove on cleanup
function setup() {
  const handler = () => console.log("resized");
  window.addEventListener("resize", handler);
  return () => window.removeEventListener("resize", handler); // cleanup
}
```

**Atlas mitigation:** All `useEffect` hooks that attach listeners return cleanup functions. This is a non-negotiable convention in Atlas — no exceptions. Still enforced, and now exercised across a much larger surface than Week 2 — every modal's focus trap, every slide-over's Escape handler, `AuthListenerProvider`'s `onAuthStateChange` subscription.

---

### Unbounded Caches

A cache with no eviction strategy grows indefinitely. In a long-running session, this silently consumes memory until the tab crashes or performance degrades.

```typescript
// Leak — grows forever
const cache = new Map();
function getData(key: string) {
  if (!cache.has(key)) cache.set(key, fetch(key));
  return cache.get(key);
}
```

**Atlas's actual mitigation for this, in the live app, is TanStack React Query** — not `lib/createCache.ts` (see below). React Query's own cache handles TTL-style staleness (`staleTime`, configured per-hook — see `useProjects`, `useTasks`, `useCurrentUserProfile`, `useMembersByProject`) and garbage-collects unused query data automatically. `lib/createCache.ts` remains in the codebase as a hand-built demonstration of the same underlying problem and a valid general-purpose solution to it — just not the mechanism actually protecting Atlas today.

---

## 3. Cache Architecture (reference implementation, not live)

Atlas's `lib/createCache.ts` is a typed, closure-based in-memory cache with three layers of memory protection. **It is not called anywhere in the live application** — confirmed via `grep`, referenced only by its own test suite and the `lib/index.ts` barrel. It's kept as a demonstration of a real caching strategy (TTL + LRU eviction + lazy expiration), and the reasoning below is preserved because the tradeoffs it documents are genuinely instructive, not because this code is running in production.

### TTL (Time To Live)
Every cache entry has a `createdAt` timestamp. On access, the entry's age is checked against the configured `ttl`. Stale entries are deleted and `undefined` is returned, triggering a fresh fetch.

```typescript
type CacheEntry<T> = {
  value: T;
  createdAt: number; // Date.now() — milliseconds for arithmetic efficiency
};
```

### Max Size with LRU Eviction
The cache is capped at `maxSize` entries. When a new entry would exceed the limit, the **Least Recently Used** entry is evicted first.

LRU is implemented using JavaScript's `Map` insertion order:
- On every `get`, the entry is deleted and reinserted — moving it to the end of the Map
- The oldest (least recently used) entry is always at the front (`map.keys().next().value`)
- On capacity breach, the front entry is evicted

### Lazy Expiration
Expiry is checked **on access**, not on a background timer. This avoids the overhead of a running interval and the complexity of timer cleanup. The tradeoff is that stale entries occupy memory until they are next accessed.

### Configuration

```typescript
// Default usage — 100 entries, 5 minute TTL
const projectCache = createCache<Project[]>(100, 5 * 60 * 1000);

// Short TTL for frequently changing data
const notificationCache = createCache<Notification[]>(50, 60 * 1000);
```

### Decision: TTL + Max Size over TTL alone
A pure TTL cache can grow large before entries expire if data is written faster than the TTL window. The max size cap provides a hard memory ceiling, making memory consumption predictable regardless of write frequency.

**What Atlas actually uses instead:** React Query's built-in cache, configured per-hook via `staleTime`. It solves the same class of problem this file was originally built to solve, with framework-level integration (automatic refetch-on-invalidate, request deduplication, garbage collection of unused queries) that a hand-rolled cache would have to reimplement.

---

## 4. Utility Allocation Decisions

### `lib/entityFactory.ts` (not live — see `docs/decisions.md`)
- Uses `crypto.randomUUID()` for ID generation — native, no dependency, no allocation overhead compared to third-party UUID libraries
- `new Date()` for `createdAt` — allocated once per entity, not retained
- Not used in any live data-fetching path; superseded by the Supabase-backed `projectActions.ts`/`taskActions.ts`. Its hardcoded `ownerId: "user-123"` is safe only because nothing in the live app calls it.

### `lib/updateImmutable.ts` (live — used throughout the real app)
- Uses object spread (`{ ...entity, ...changes }`) for immutable updates — creates a shallow copy
- **Shallow copy tradeoff:** Nested objects are shared by reference, not deeply cloned. For Atlas's flat entity shapes (`Project`, `Task`), this is safe.
- `updateProjectStatus`/`updateTaskStatus` are deliberately kept separate from the general `updateProject`/`updateTask` functions, so status changes never pass through the generic `Partial<...>` changes path — this is a real, current architectural rule (see CLAUDE.md's Immutable Updates section), not a historical note.

### `lib/createStore.ts` (not live — see `js-execution.md`, `docs/decisions.md`)
- Returns `{ ...state }` copies from `getState()` to prevent external mutation of the closure scope
- `login` and `logout` spread from `initialState` to ensure a clean baseline on every state transition
- Built as a closures study exercise; never wired to real Supabase auth. Real session/current-user identity uses `useCurrentUser()` (React Query) — see CLAUDE.md's Authentication section.

### `lib/asyncQueue.ts` (not live)
- Internal queue is a plain `Array` — O(1) `push`, O(n) `shift`
- `.finally()` is used for slot release — guaranteed to run on both resolve and reject, preventing concurrency slot leaks
- Not called anywhere in the live application (confirmed via `grep`). Kept as a demonstration of controlled-concurrency task execution — the pattern is real and would be genuinely useful for, e.g., rate-limiting a batch of API calls, but Atlas hasn't yet had a use case requiring it.

---

## 5. Async Performance

### Sequential vs Parallel Fetching
Sequential `await` chains block unnecessarily when operations are independent:

```typescript
// Sequential — total time = sum of all durations
const user = await fetchUser();
const projects = await fetchProjects(user.id);
const notifications = await fetchNotifications(user.id); // independent of projects
```

```typescript
// Parallel — total time = longest single duration
const user = await fetchUser();
const [projects, notifications] = await Promise.all([
  fetchProjects(user.id),
  fetchNotifications(user.id),
]);
```

**Atlas convention, still current:** fetch independent data in parallel with `Promise.all`. This is exercised for real in the live codebase — e.g. `removeMember`'s and `deleteProject`'s cache invalidations, and `useMembersByProject`'s batched query design (fetching all currently-loaded projects' members in one round trip rather than one query per project card).

### Retry Backoff (reference — `lib/fetcher.ts` is not live)
`lib/fetcher.ts` uses a simple linear backoff: `500 * attempt` ms between retries, avoiding hammering a struggling server while keeping retry latency predictable. This utility isn't called anywhere in the live app — Supabase's client handles its own request behavior — but the backoff reasoning remains valid general knowledge, and would apply if Atlas ever added a raw `fetch`-based integration outside Supabase.

---

## 6. Debugging Workflows

### The 4-Step Process
All bugs in Atlas must be approached with this process — no exceptions:

1. **Reproduce** — confirm the bug is consistent and triggerable on demand
2. **Isolate** — find the smallest code path that still exhibits the bug
3. **Hypothesize** — form one specific, testable guess about the cause
4. **Verify** — prove or disprove with a tool, not intuition

This process is still exactly how real bugs in Atlas have been diagnosed — e.g. the `project_members` RLS infinite-recursion bug and the due-date UTC display bug were both found this way, not by guessing.

### Tool Selection by Bug Type

| Bug Type | Primary Tool | Secondary Tool |
|---|---|---|
| Sync logic errors | VSCode debugger breakpoints | Unit tests |
| Async/timing bugs | VSCode debugger + Jest fake timers | Chrome Sources tab |
| Stale closures | VSCode debugger — Closure panel | React DevTools |
| Memory leaks | Chrome Memory tab — heap snapshots | WeakRef analysis |
| Re-render issues | React DevTools Profiler | Chrome Performance tab |

### Heap Snapshot Workflow (Three-Snapshot Technique)
Used for identifying memory leaks once the UI is built:

1. Take **Snapshot 1** — baseline before any interaction
2. Perform the action suspected of leaking (navigate, open modal, trigger fetch)
3. Force GC — click the trash icon in the Memory tab
4. Take **Snapshot 2** — compare size delta with Snapshot 1
5. Repeat the action
6. Take **Snapshot 3** — if memory grows consistently between snapshots, a leak exists

---

## 7. React & Next.js Performance Implications

### Immutability and React Re-renders
React uses **reference equality** (`===`) to detect state changes. Mutating an object in place preserves its reference — React sees no change and skips the re-render, causing stale UI.

```typescript
// Mutation — React skips re-render
state.title = "New Title";
setState(state); // same reference

// Immutable update — React detects change
setState({ ...state, title: "New Title" }); // new reference
```

All Atlas state updates use `lib/updateImmutable.ts` to guarantee new references on every change — still accurate and current.

### useEffect Cleanup
Every `useEffect` in Atlas that performs async work or attaches listeners returns a cleanup function:

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetcher("/api/projects"); // illustrative — the live app uses Supabase client + React Query, not this raw fetcher
    if (cancelled) return; // guard against stale updates
    if ("type" in data) { handleError(data); return; }
    setProjects(data);
  }

  load();
  return () => { cancelled = true; };
}, []);
```

The `cancelled` flag prevents `setState` calls on unmounted components — a common source of memory leaks and React warnings. **In practice, React Query's `useQuery` handles this internally** for every real data-fetching hook in Atlas (`useProjects`, `useTasks`, `useCurrentUser`, `useCurrentUserProfile`, `useMembersByProject`) — none of them need to hand-write this pattern themselves. The example above is retained because the underlying problem (stale updates on unmounted components) and its manual fix are still correct, general React knowledge.

### Next.js Server Components
Server Components execute per-request in Node.js. Module-level mutable state is shared across concurrent requests — a critical memory and correctness issue:

```typescript
// Dangerous — shared across all concurrent requests
let cachedData = [];

// Safe — scoped per request
export default async function Page() {
  const data = await fetcher("/api/projects"); // illustrative
  return <ProjectList projects={data} />;
}
```

This guidance is still directly relevant: `proxy.ts` and `lib/supabase/server.ts` are both careful to avoid module-level mutable state, for exactly this reason.

---

## 8. React Render Performance — Week 5 Profiling

### TaskList re-render analysis (June 2026)

Profiled using React DevTools Profiler during modal open/close cycle on the Projects page.

**Finding:** `TaskList` re-renders twice per `TaskModal` open/close cycle — once when the modal opens and once when it closes. Root cause: `openForEdit` is defined as an inline function in `ProjectSlideOver`'s component body. It receives a new reference on every render, causing `TaskList` (which receives it as `onTaskSelect`) to re-render even though its task data hasn't changed.

`openForCreate` also gets a new reference on every render but is not passed to any child component, so it causes no downstream re-renders.

**Measurements:**
- Commit 1 — 2.2ms (initial mount, expected)
- Commit 2 — 1.1ms (React Query returning data, expected)
- Commit 3 — 0.8ms (modal opened, `onTaskSelect` prop changed)
- Commit 4 — 0.8ms (modal closed, `onTaskSelect` prop changed)

**Decision: no optimization applied.**

`useCallback` on `openForEdit` would eliminate the two unnecessary re-renders, but each costs ~0.8ms — imperceptible to users and not worth the added complexity of a dependency array to maintain. The memoization overhead would likely exceed the savings at this render budget.

**Revisit if:** `TaskList` grows to render 50+ items, or profiling in a future session reveals a meaningful regression.

**Still current as of this update** — `ProjectSlideOver` has grown substantially since this finding (delete actions, add/remove member forms, `isOwner` gating), but `openForEdit`'s reference-identity behavior and its cost are unchanged, and no regression has been observed or profiled since.

---

*This document is a living reference. Update it as the codebase evolves — including flagging utilities that stop being live, the way the July 2026 pass above did for `fetcher.ts`, `createCache.ts`, and `asyncQueue.ts`.*