/**
 * Fetches JSON data from a given URL with built-in retry logic and normalized error handling.
 *
 * This utility wraps the native `fetch` API and:
 * - Retries failed requests (network errors or HTTP 5xx responses) up to a fixed limit
 * - Applies a simple backoff delay between retries
 * - Normalizes all failures into a consistent `FetchError` shape
 *
 * @template T - Expected shape of the successful JSON response
 *
 * @param {string} url - The api url to call.
 * @param {RequestInit} options - The options available to the native fetch API, such as method, headers etc.
 *
 * @returns {Promise<T | FetchError>} Resolves with:
 * - `T` when the request succeeds (`response.ok`)
 * - `FetchError` when all retries fail or a non-retryable error occurs
 *
 */

export type NetworkError = { status: null; message: string; type: "network" };
type ServerError = { status: number; message: string; type: "server" };

export type FetchError = NetworkError | ServerError;

export async function fetcher<T>(
  url: string,
  options?: RequestInit,
): Promise<T | FetchError> {
  const maxRetries = 3;
  let attempt = 1;
  let lastError: FetchError | null = null;

  async function handleRetry() {
    await new Promise((resolve) => setTimeout(resolve, 500 * attempt));

    attempt++;
  }

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      if (response.ok) return (await response.json()) as T;

      // Handle http errors
      if (response.status < 500 || attempt === maxRetries) {
        return {
          status: response.status,
          message: response.statusText || "A HTTP error occurred",
          type: "server",
        };
      } else {
        lastError = {
          status: response.status,
          message: response.statusText,
          type: "server",
        };

        // Retry with delay
        await handleRetry();
      }
    } catch (err: unknown) {
      // Only network errors reach here
      const errorMessage =
        err instanceof Error ? err.message : "Unable to reach the server.";

      if (attempt === maxRetries) {
        return {
          status: null,
          message: errorMessage,
          type: "network",
        };
      }

      // Retry with delay
      await handleRetry();
    }
  }

  return (
    lastError ?? {
      status: null,
      message: "An unexpected error occurred.",
      type: "network",
    }
  );
}
