const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export class ApiError extends Error {}

interface Envelope<T> {
  success: boolean;
  message: string;
  data: T;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      credentials: 'include',
      headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    });
  } catch {
    throw new ApiError('Impossible de contacter le serveur. Vérifiez votre connexion.');
  }

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
