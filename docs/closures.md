# CLOSURES

### 1. A closure is a combination of a function and its lexical environment.

### 2. The lexical scope enables the closure to access variables from it's outer scope even after it has finished executing.

### 3. Closures affect garbage collection by keeping variables in memory even though the function that created them is finished executing and no longer referenced.

### 4. The memory leak risk occurs when closures retain references to large data that is no longer needed, preventing it from being garbage collected.
