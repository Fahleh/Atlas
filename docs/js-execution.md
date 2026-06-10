# JavaScript Execution Model

> **Atlas Internal Documentation**
> Week 1 — Foundational Concepts
> Last updated: April 2026

---

## Overview

This document covers the JavaScript execution model as it applies to the Atlas codebase. Understanding these concepts is essential for writing correct async code, avoiding memory leaks, and reasoning about how React and Next.js behave under the hood.

---

## Table of Contents

1. [The Execution Model](#1-the-execution-model)
2. [Microtasks vs Macrotasks](#2-microtasks-vs-macrotasks)
3. [Closures & Memory](#3-closures--memory)
4. [ES Modules & Code Structure](#4-es-modules--code-structure)
5. [Impact on React & Next.js](#5-impact-on-react--nextjs)
6. [Atlas Utilities Built This Week](#6-atlas-utilities-built-this-week)

---

## 1. The Execution Model

JavaScript is **single-threaded** — it can only do one thing at a time. To handle async work (network requests, timers, file reads) without blocking the thread, it uses an event-driven architecture built on three components:

### Call Stack
The call stack is where synchronous code executes. Functions are pushed onto the stack when called and popped off when they return. If the stack is busy, nothing else can run.

```
console.log("A"); // pushed, executed, popped
console.log("B"); // pushed, executed, popped
```

### Heap
The heap is unstructured memory where objects and closures are allocated. Unlike the stack, the heap has no concept of order — the garbage collector manages it.

### Event Loop
The event loop is the mechanism that coordinates the call stack, the microtask queue, and the macrotask queue. Its job is simple: when the call stack is empty, check the queues and push the next task onto the stack.

**Execution order per event loop iteration:**
1. Execute all synchronous code on the call stack until it is empty
2. Drain the entire microtask queue (including any microtasks added during draining)
3. Execute **one** macrotask from the macrotask queue
4. Repeat

---

## 2. Microtasks vs Macrotasks

### Macrotasks
Scheduled by the runtime and executed one per event loop iteration.

| Source | Example |
|---|---|
| `setTimeout` | `setTimeout(() => {}, 0)` |
| `setInterval` | `setInterval(() => {}, 1000)` |
| `setImmediate` | Node.js only |
| I/O callbacks | File reads, network responses |

### Microtasks
Scheduled within the current iteration and **fully drained** before any macrotask runs. New microtasks added during draining are also executed before the next macrotask.

| Source | Example |
|---|---|
| `Promise.then` | `Promise.resolve().then(() => {})` |
| `Promise.catch` | `.catch(() => {})` |
| `Promise.finally` | `.finally(() => {})` |
| `queueMicrotask` | `queueMicrotask(() => {})` |
| `await` | Resumes after `await` are microtasks |

### Execution Order Example

```typescript
console.log("A"); // sync

setTimeout(() => console.log("B"), 0); // macrotask

Promise.resolve()
  .then(() => {
    console.log("C"); // microtask
    setTimeout(() => console.log("D"), 0); // macrotask — queued behind B
  })
  .then(() => console.log("E")); // microtask — queued after C resolves

queueMicrotask(() => console.log("F")); // microtask

console.log("G"); // sync
```

**Output:** `A → G → C → F → E → B → D`

**Key insight:** `D`'s `setTimeout` is queued *behind* `B` because it is only created when the microtask containing it runs — after `B` is already in the macrotask queue. `E` runs before `F` because the chained `.then` is not queued until `C` resolves, by which point `F` is already in the microtask queue ahead of it.

### Why This Matters
Misunderstanding this order is a common source of subtle bugs in React event handlers, `useEffect` cleanup, and Next.js server actions where the execution order of async operations affects data consistency.

---

## 3. Closures & Memory

### What is a Closure?
A closure is the combination of a function and its **lexical environment** — the scope that existed at the time the function was created, not when it is called. This is what "lexical scope" means: scope is determined by where code is written, not where it runs.

```typescript
function createCounter(initialValue: number = 0) {
  let count = initialValue; // lives in the closure scope

  return {
    increment: () => ++count,
    decrement: () => Math.max(initialValue, count - 1),
    getCount: () => count,
    reset: () => { count = initialValue; }
  };
}

const counter = createCounter(0);
counter.increment(); // 1
counter.increment(); // 2
// `count` is private — inaccessible from outside
```

`createCounter` has finished executing, but `count` remains in memory because the returned object's methods still hold a reference to the closure scope.

### Closures & Garbage Collection

The garbage collector cannot reclaim memory that is still referenced. A closure keeps its entire surrounding scope alive for as long as the closure itself is alive — even if only some variables in that scope are used.

```typescript
function outer() {
  const massiveArray = new Array(1_000_000).fill("data");

  return function inner() {
    console.log("hello"); // never uses massiveArray
  };
}

const fn = outer();
// massiveArray cannot be collected — it lives in inner's closure scope
// even though inner never references it
```

> **Note:** V8 and other modern engines perform escape analysis and can sometimes optimize away unreferenced closure variables, but this behaviour should never be relied upon in production code.

### Memory Leak Pattern

```typescript
// Leak — large object retained indefinitely
function setupListener() {
  const cache = new Array(1_000_000).fill("data");
  document.addEventListener("click", () => {
    console.log("clicked"); // cache is captured but never used
  });
  // The event listener (and its closure scope containing cache)
  // lives as long as the document — never collected
}

// Fixed — release what you don't need
function setupListener() {
  document.addEventListener("click", () => {
    console.log("clicked");
  });
}
```

### Rule of Thumb
**The lifetime of a closure scope is tied to the lifetime of the function that closes over it.** Always ask: how long will this function live, and what is it unnecessarily keeping in memory?

---

## 4. ES Modules & Code Structure

### Why ES Modules
Before ES Modules, JavaScript had no native module system. CommonJS (`require/module.exports`) was invented by Node.js to fill the gap. ES Modules are the official standard, built into the language itself.

| Feature | CommonJS | ES Modules |
|---|---|---|
| Syntax | `require()` / `module.exports` | `import` / `export` |
| Resolution | Runtime | Parse time (static) |
| Binding | Value copy | Live binding |
| Tree shaking | Difficult | Supported |
| Async loading | No | Yes (dynamic import) |

### Static vs Dynamic Imports

**Static imports** are resolved at parse time. The bundler knows the entire dependency graph before execution begins, enabling tree shaking and compile-time optimisations.

```typescript
// Resolved at parse time — always included in the bundle
import { fetcher } from "@/lib";
```

**Dynamic imports** load a module lazily at runtime, returning a Promise. Use these when a module is not needed on initial load.

```typescript
// Loaded only when this code path is reached
const { AsyncQueue } = await import("@/lib/asyncQueue");
```

**Decision rule:** If the user might never need it in a given session, lazy load it. If it runs on every page load, static import it.

### Named vs Default Exports

Atlas uses **named exports exclusively**, except where frameworks require default exports (e.g. Next.js page components).

```typescript
// Named export — explicit, searchable, refactor-safe
export function fetcher() {}

// Default export — can be imported under any name, harder to trace
export default function fetcher() {}
```

### Barrel Files

A barrel file (`index.ts`) re-exports a module's public API from a single entry point, keeping imports clean and creating a clear boundary between public and internal interfaces.

```typescript
// lib/index.ts
export { AsyncQueue } from "./asyncQueue";
export { createCache } from "./createCache";
export { fetcher } from "./fetcher";
export { handleError } from "./errorHandler";
```

**Tradeoff:** Barrel files can inhibit tree shaking in some bundler configurations. Only barrel what is genuinely reusable across the app — keep implementation details unexported.

---

## 5. Impact on React & Next.js

### React Rendering & the Event Loop

React's reconciler is synchronous — when React re-renders a component tree, it runs on the call stack without interruption. This means:

- **Never block the call stack** in a render function. Expensive synchronous operations (large array sorts, heavy computations) will freeze the UI because the event loop cannot process user interactions while the stack is busy.
- **`useEffect` callbacks are macrotasks** — they run after the browser has painted, not immediately after render. This is why state updates inside `useEffect` cause a second render.
- **`setState` batching** — React batches multiple `setState` calls within the same synchronous block into a single re-render. Understanding that this happens at the microtask level explains why you cannot read updated state immediately after calling `setState`.

```typescript
// Common misconception
const [count, setCount] = useState(0);

setCount(1);
console.log(count); // still 0 — state update is batched, not immediate
```

### Async Data Fetching in React

Because `useEffect` runs after paint and its callback cannot be `async` directly, data fetching follows this pattern:

```typescript
useEffect(() => {
  let cancelled = false;

  async function load() {
    const data = await fetcher("/api/projects");
    if (!cancelled) setProjects(data);
  }

  load();

  // Cleanup prevents state updates on unmounted components
  return () => { cancelled = true; };
}, []);
```

The `cancelled` flag is necessary because the component may unmount while the Promise is still pending. Without it, calling `setProjects` on an unmounted component causes a memory leak and a React warning.

### Next.js Server vs Client Execution

Next.js App Router runs components in two distinct environments:

| Environment | Runs on | Has access to |
|---|---|---|
| Server Components | Node.js | File system, env vars, direct DB access |
| Client Components | Browser | DOM, browser APIs, React state/hooks |

**Key execution differences:**

- **Server Components** execute in Node.js where the event loop handles I/O differently — there is no `window`, no `document`, and no browser APIs. Code that assumes a browser environment will throw at runtime.
- **`async/await` in Server Components** is first-class — you can `await` directly in the component body because Next.js handles the Promise resolution before streaming the response.
- **Closures in Server Components** do not persist between requests — each request gets a fresh execution context. Do not use module-level mutable state in Server Components as it will be shared across concurrent requests.

```typescript
// Correct — async Server Component
export default async function ProjectsPage() {
  const projects = await fetcher("/api/projects"); // runs on server
  return <ProjectList projects={projects} />;
}

// Dangerous — module-level mutable state on the server
let cachedProjects = []; // shared across ALL concurrent requests
```

### Closures in React — useCallback & useMemo

React hooks that accept callbacks (like `useEffect`, `useCallback`, `useMemo`) create closures over the values in scope at the time of their last render. Stale closures are one of the most common React bugs:

```typescript
// Stale closure — count will always be 0 inside the effect
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count); // captures count = 0 at mount time
  }, 1000);
  return () => clearInterval(interval);
}, []); // missing count in dependency array

// Fresh closure — effect re-runs when count changes
useEffect(() => {
  const interval = setInterval(() => {
    console.log(count);
  }, 1000);
  return () => clearInterval(interval);
}, [count]);
```

---

## 6. Atlas Utilities Built This Week

| File | Purpose | Key Concept Applied |
|---|---|---|
| `lib/asyncQueue.ts` | Controlled concurrent async task execution | Event loop, microtask scheduling, Promise chaining |
| `lib/createCounter.ts` | Closure-based stateful counter with controlled interface | Closures, private state, immutable initial value |
| `lib/createCache.ts` | Generic typed key-value cache | Closures, generics, `Map` for O(1) lookup |
| `lib/createStore.ts` | Closure-based auth/session state store | Closures, state encapsulation, object reference safety |
| `lib/fetcher.ts` | Fetch utility with retries and normalized errors | Async/await, Promise error propagation, discriminated unions |
| `lib/errorHandler.ts` | Centralized error handling by type and status | Error normalization, switch exhaustiveness |
| `lib/index.ts` | Barrel file — public API for the lib module | ES Modules, named exports, tree shaking awareness |

---

*This document is a living reference. Update it as the codebase evolves.*
