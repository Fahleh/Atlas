# EVENT LOOPS

### AsyncQueue — Controlled async task execution

### Ensures tasks are executed one at a time (or up to `concurrency` limit),

### preserving FIFO order. Useful for rate-limiting API calls,

### sequential DOM mutations, or any scenario where uncontrolled Promise.all

### would overwhelm a resource.

## Execution model notes:

### - Each `.add()` call enqueues a task and returns a Promise that resolves

### when that specific task completes.

### - Internally, the queue uses microtasks (Promise chains) to schedule work,

### so tasks never block the call stack — they yield between each execution.

### - The `concurrency` option controls how many tasks run in parallel at any given event loop tick.
