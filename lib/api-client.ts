const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

/**
 * A 401 mid-session (cookie rejected/expired/account deactivated) used to leave the UI
 * silently stuck — buttons failing with a raw "Non authentifié" and no way out short of a
 * manual refresh. This forces a clean logout instead. `/auth/login` and `/auth/me` are
 * exempt since a 401 there is the expected, already-handled "not logged in yet" case.
 */
function notifyUnauthorized(path: string): void {
  if (typeof window === 'undefined') return;
  if (path.startsWith('/auth/login') || path.startsWith('/auth/me')) return;
  window.dispatchEvent(new Event('kelasi:unauthorized'));
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    // Skip the JSON content-type for FormData bodies — the browser sets its own
    // multipart boundary header, and overriding it breaks the upload parsing.
    const isFormData = typeof FormData !== 'undefined' && options.body instanceof FormData;
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: isFormData ? options.headers : { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new ApiError('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }

  if (res.status === 401) notifyUnauthorized(path);

  const body = (await res.json().catch(() => null)) as Envelope<T> | null;

  if (!res.ok || !body || !body.success) {
    throw new ApiError(body?.message || `Erreur inattendue (${res.status}).`);
  }

  return body.data;
}

export const apiGet = <T>(path: string): Promise<T> => request<T>(path);

export const apiPost = <T>(path: string, data?: unknown): Promise<T> =>
  request<T>(path, { method: 'POST', body: data !== undefined ? JSON.stringify(data) : undefined });

export const apiPatch = <T>(path: string, data?: unknown): Promise<T> =>
  request<T>(path, { method: 'PATCH', body: JSON.stringify(data) });

export const apiPut = <T>(path: string, data?: unknown): Promise<T> =>
  request<T>(path, { method: 'PUT', body: JSON.stringify(data) });

export const apiDelete = <T>(path: string): Promise<T> => request<T>(path, { method: 'DELETE' });

export const apiUpload = <T>(path: string, formData: FormData): Promise<T> =>
  request<T>(path, { method: 'POST', body: formData });

/** Builds a displayable URL for a relative path returned by an upload endpoint (e.g. "uploads/logos/x.png"). */
export const assetUrl = (relativePath: string): string => `${API_BASE}/${relativePath}`;

/** For binary downloads (PDF/CSV) that don't go through the {success,message,data} envelope. */
async function fetchBlob(path: string, options: RequestInit = {}): Promise<{ blob: Blob; filename: string | null }> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...options, credentials: 'include' });
  } catch {
    throw new ApiError('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }
  if (res.status === 401) notifyUnauthorized(path);
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new ApiError(body?.message || `Erreur inattendue (${res.status}).`);
  }
  const disposition = res.headers.get('Content-Disposition') || '';
  const match = disposition.match(/filename="?([^"]+)"?/);
  return { blob: await res.blob(), filename: match ? match[1] : null };
}

export async function downloadFile(path: string, fallbackFilename: string): Promise<void> {
  const { blob, filename } = await fetchBlob(path);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || fallbackFilename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
