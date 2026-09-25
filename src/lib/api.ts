const BASE_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000';

function getToken(): string {
  return localStorage.getItem('token') ?? '';
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getToken();
  let res: Response;

  try {
    res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options?.headers,
      },
      ...options,
    });
  } catch {
    throw new Error('Network error — check your connection and try again');
  }

  if (res.status === 401) {
    localStorage.removeItem('token');
    const current = window.location.pathname;
    if (current !== '/login') {
      window.location.href = `/login?expired=true&redirect=${encodeURIComponent(current)}`;
    }
    throw new Error('Session expired');
  }

  if (res.status === 403) {
    const text = await res.text().catch(() => '');
    let message = 'Access denied';
    try {
      const json = JSON.parse(text);
      message = json.detail ?? message;
    } catch { /* ignore */ }
    // If it's an org mismatch, redirect to access denied page
    if (message.includes('does not belong to this organization')) {
      localStorage.removeItem('token');
      window.location.href = '/access-denied';
      throw new Error(message);
    }
    throw new Error(message);
  }

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let message = `API error ${res.status}`;
    try {
      const json = JSON.parse(text);
      if (Array.isArray(json.detail)) {
        // Pydantic validation errors — extract field + message
        message = json.detail
          .map((e: { loc?: string[]; msg?: string }) => {
            const field = e.loc ? e.loc.filter(x => x !== 'body').join('.') : '';
            return field ? `${field}: ${e.msg}` : (e.msg ?? 'Validation error');
          })
          .join('; ');
      } else {
        message = json.detail ?? message;
      }
    } catch {
      message = text || message;
    }
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  get:    <T>(path: string)                => apiFetch<T>(path),
  post:   <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'POST',   body: JSON.stringify(body) }),
  put:    <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PUT',    body: JSON.stringify(body) }),
  patch:  <T>(path: string, body: unknown) => apiFetch<T>(path, { method: 'PATCH',  body: JSON.stringify(body) }),
  delete: <T>(path: string)               => apiFetch<T>(path, { method: 'DELETE' }),
};
