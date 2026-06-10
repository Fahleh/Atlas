import { FetchError } from "./fetcher";

export function handleError(error: FetchError) {
  switch (error.status) {
    case null:
      // TODO: Show toast telling user to check their connection.
      console.error("Network error: ", error.message);

      break;

    case 401:
      // TODO: Show toast telling user they are not authorized and redirect to login page.
      console.info("Unauthorized: ", error.message);

      break;

    case 403:
      // TODO: Show warning toast telling user they don't have permission.
      console.warn("Unauthorized: ", error.message);

      break;

    case 404:
      // TODO: Show info toast telling user Resource is missing.
      console.info("Resource missing: ", error.message);

      break;

    default:
      if (error.status && error.status >= 500) {
        // TODO: Report to monitoring service e.g. Sentry
        console.error("Server error — report to engineering: ", error.message);
      } else {
        console.error("Unexpected error: ", error.message);
      }
      break;
  }
}
