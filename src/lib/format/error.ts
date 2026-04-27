export type ApiErrorShape = {
  error?: string;
  message?: string;
  issues?: unknown;
};

const HUMAN_COPY: Record<string, string> = {
  unauthorized: "Your session expired. Sign in again to continue.",
  forbidden: "You don't have permission to do this.",
  not_found: "We couldn't find that record.",
  validation_failed: "Check the highlighted fields and try again.",
  invalid_json: "Something broke while sending your input. Please retry.",
  invalid_form: "Couldn't read the form. Please retry.",
  file_required: "Choose a photo to attach.",
  file_too_large: "That photo is over 5MB. Try a smaller one.",
  unsupported_mime: "Only JPG, PNG, or WebP photos are supported.",
  max_images_reached: "This visit already has the maximum of 10 photos.",
  storage_failed: "We couldn't save the photo. Retry in a moment.",
  insert_failed: "We couldn't save that. Retry in a moment.",
  duplicate: "That already exists.",
};

export function mapApiError(
  body: unknown,
  status: number,
  fallback = "Something went wrong. Please retry.",
): string {
  if (status === 401) return HUMAN_COPY.unauthorized;
  if (status === 403) return HUMAN_COPY.forbidden;
  if (status === 404) return HUMAN_COPY.not_found;
  if (status >= 500) return "Our server hit a snag. Retry in a moment.";

  const b = body as ApiErrorShape | null | undefined;
  const code = typeof b?.error === "string" ? b.error : undefined;
  if (code && HUMAN_COPY[code]) return HUMAN_COPY[code];
  if (typeof b?.message === "string" && b.message.length < 160) return b.message;
  return fallback;
}

export async function readErrorFromResponse(
  res: Response,
  fallback?: string,
): Promise<string> {
  let body: unknown = null;
  try {
    body = await res.clone().json();
  } catch {
    // Ignore — we'll fall through to the status-based path.
  }
  return mapApiError(body, res.status, fallback);
}
