export function createCounter(initialValue: number = 0) {
  let count: number = initialValue;

  function getCount(): number {
    return count;
  }

  function increment(): number {
    count++;
    return count;
  }

  function decrement(): number {
    count = Math.max(initialValue, count - 1);
    return count;
  }

  function reset(): number {
    count = initialValue;

    return count;
  }

  return { getCount, increment, decrement, reset };
}
