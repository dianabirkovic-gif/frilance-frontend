import { ApiError } from "../api/client";
import type { Dictionary } from "./dictionary";

/**
 * Backend error codes this app knows how to say in the user's language. The
 * strings are the backend's `ApiError.code` values — a hand-kept contract, like
 * the DTO interfaces in `api/`, so renaming one there means renaming it here.
 */
const LOCALIZED_CODES: Record<string, keyof Dictionary["apiError"]> = {
  CLIENT_COMPLETED: "clientCompleted",
  NOTE_TOO_LONG: "noteTooLong",
  DUE_BEFORE_ISSUE: "dueBeforeIssue",
};

/**
 * What to show a user when a write fails, in the user's language wherever
 * possible.
 *
 * The order matters. A known `code` wins, because that is wording this app
 * controls. Failing that, the backend's `details` — field-level validation
 * messages, which its validator already localizes — beat `message`, which for
 * a validation failure is the useless literal "Validation failed" and for
 * everything else is English prose. `message` is the last resort rather than
 * the first, which is the bug this function exists to fix.
 */
export function apiErrorMessage(error: unknown, t: Dictionary): string {
  if (!(error instanceof ApiError)) {
    return t.postDrawer.genericError;
  }
  const localized = error.code ? LOCALIZED_CODES[error.code] : undefined;
  if (localized) {
    return t.apiError[localized];
  }
  if (error.details.length > 0) {
    return error.details.join("; ");
  }
  return error.message || t.postDrawer.genericError;
}
