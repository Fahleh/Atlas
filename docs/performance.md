# Performance & Memory Decisions

> **Atlas Internal Documentation**
> Week 2 — Advanced JavaScript Patterns & Performance
> Last updated: May 2026

---

## Overview

This document records the performance and memory decisions made during the construction of Atlas's utility layer. It covers allocation strategies, memory leak prevention, caching architecture, and debugging workflows. It will be updated in Week 7 with Lighthouse scores and production performance metrics.

---

## Table of Contents

1. [Memory Management Principles](#1-memory-management-principles)
2. [Common Leak Patterns & Mitigations](#2-common-leak-patterns--mitigations)
3. [Cache Architecture](#3-cache-architecture)
4. [Utility Allocation Decisions](#4-utility-allocation-decisions)
5. [Async Performance](#5-async-performance)
6. [Debugging Workflows](#6-debugging-workflows)
7. [React & Next.js Performance Implications](#7-react--nextjs-performance-implications)

---

## 1. Memory Management Principles

JavaScript uses automatic garbage collection — the engine reclaims memory when objects are no longer reachable. However, automatic does not mean guaranteed. Memory leaks occur when references are held longer than necessary, preventing the garbage collector from doing its job.

**Atlas follows three core memory principles:**

**1. Explicit lifetime management.** Every object that could grow unboundedly — caches, queues, event listeners — has an explicit strategy for when and how it releases memory.

**2. Closure scope awareness.** Closures retain their entire surrounding scope, not just the variables they use. Every closure in Atlas is written with awareness of what it captures and for how long that reference will live.

**3. Immutability over mutation.** Immutable updates create new object references rather than modifying existing ones. This prevents shared state corruption and makes garbage collection predictable — old references are released as soon as they go out of scope.

---

## 2. Common Leak Patterns & Mitigations

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

**Atlas mitigation:** No direct DOM references are stored in module scope. Component-level refs are scoped to React components and released on unmount.

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

**Atlas mitigation:** All `useEffect` hooks that attach listeners return cleanup functions. This is a non-negotiable convention in Atlas — no exceptions.

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

**Atlas mitigation:** See [Cache Architecture](#3-cache-architecture).

---

## 3. Cache Architecture

Atlas uses `lib/createCache.ts` — a typed, closure-based in-memory cache with three layers of memory protection:

### TTL (Time To Live)
Every cache entry has a `createdAt` timestamp. On access, the entry's age is checked against the configured `ttl`. Stale entries are deleted and `undefined` is returned, triggering a fresh fetch from Supabase.

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
Expiry is checked **on access**, not on a background timer. This avoids the overhead of a running interval and the complexity of timer cleanup. The tradeoff is that stale entries occupy memory until they are next accessed — acceptable for Atlas's data access patterns.

### Configuration

```typescript
// Default usage — 100 entries, 5 minute TTL
const projectCache = createCache<Project[]>(100, 5 * 60 * 1000);

// Short TTL for frequently changing data
const notificationCache = createCache<Notification[]>(50, 60 * 1000);
```

### Decision: TTL + Max Size over TTL alone
A pure TTL cache can grow large before entries expire if data is written faster than the TTL window. The max size cap provides a hard memory ceiling, making memory consumption predictable regardless of write frequency. This directly reduces hosting costs at scale.

---

## 4. Utility Allocation Decisions

### `lib/entityFactory.ts`
- Uses `crypto.randomUUID()` for ID generation — native, no dependency, cryptographically unique, no allocation overhead compared to third-party UUID libraries
- `new Date()` for `createdAt` — allocated once per entity, not retained

### `lib/updateImmutable.ts`
- Uses object spread (`{ ...entity, ...changes }`) for immutable updates — creates a shallow copy
- **Shallow copy tradeoff:** Nested objects are shared by reference, not deeply cloned. For Atlas's flat entity shapes (`Project`, `Task`), this is safe. If deeply nested entities are introduced, this decision must be revisited and documented here.

### `lib/createStore.ts`
- Returns `{ ...state }` copies from `getState()` to prevent external mutation of the closure scope
- `login` and `logout` spread from `initialState` to ensure a clean baseline on every state transition

### `lib/asyncQueue.ts`
- Internal queue is a plain `Array` — O(1) `push`, O(n) `shift`. Acceptable for Atlas's queue depths
- If queue depth regularly exceeds ~1000 items, consider a linked list implementation for O(1) dequeue
- `.finally()` is used for slot release — guaranteed to run on both resolve and reject, preventing concurrency slot leaks

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

**Atlas convention:** Always fetch independent data in parallel with `Promise.all`. Use `Promise.allSettled` when partial data is acceptable (e.g. dashboard where notifications failing shouldn't block project display).

### Retry Backoff
`lib/fetcher.ts` uses a simple linear backoff: `500 * attempt` ms between retries. This avoids hammering a struggling server while keeping retry latency predictable. For production, exponential backoff with jitter would be more robust — flagged for Week 7 review.

---

## 6. Debugging Workflows

### The 4-Step Process
All bugs in Atlas must be approached with this process — no exceptions:

1. **Reproduce** — confirm the bug is consistent and triggerable on demand
2. **Isolate** — find the smallest code path that still exhibits the bug
3. **Hypothesize** — form one specific, testable guess about the cause
4. **Verify** — prove or disprove with a tool, not intuition

### Tool Selection by Bug Type

| Bug Type | Primary Tool | Secondary Tool |
|---|---|---|
| Sync logic errors | VSCode debugger breakpoints | Unit tests |
| Async/timing bugs | VSCode debugger + Jest fake timers | Chrome Sources tab |
| Stale closures | VSCode debugger — Closure panel | React DevTools |
| Memory leaks | Chrome Memory tab — heap snapshots | WeakRef analysis |
| Re-render issues | React DevTools Profiler | Chrome Performance tab |

### Heap Snapshot Workflow (Three-Snapshot Technique)
Used for identifying memory leaks once the UI is built (Week 3+):

1. Take **Snapshot 1** — baseline before any interaction
2. Perform the action suspected of leaking (navigate, open modal, trigger fetch)
3. Force GC — click the trash icon in the Memory tab
4. Take **Snapshot 2** — compare size delta with Snapshot 1
5. Repeat the action
6. Take **Snapshot 3** — if memory grows consistently between snapshots, a leak exists

Scheduled debugging sessions: **end of Week 3**, **end of Week 5**, **end of Week 7**.

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

All Atlas state updates use `lib/updateImmutable.ts` to guarantee new references on every change.

### useEffect Cleanup
Every `useEffect` in Atlas that performs async work or attaches listeners returns a cleanup function:

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetcher("/api/projects");
    if (cancelled) return; // guard against stale updates
    if ("type" in data) { handleError(data); return; }
    setProjects(data);
  }

  load();
  return () => { cancelled = true; };
}, []);
```

The `cancelled` flag prevents `setState` calls on unmounted components — a common source of memory leaks and React warnings.

### Next.js Server Components
Server Components execute per-request in Node.js. Module-level mutable state is shared across concurrent requests — a critical memory and correctness issue:

```typescript
// Dangerous — shared across all concurrent requests
let cachedData = [];

// Safe — scoped per request
export default async function Page() {
  const data = await fetcher("/api/projects");
  return <ProjectList projects={data} />;
}
```

Atlas uses request-scoped data fetching in all Server Components. The `createCache` utility is used only in Client Components and API routes where per-session scoping is guaranteed.

---

*This document will be updated in Week 7 with Lighthouse audit scores, bundle size analysis, and production performance benchmarks.*