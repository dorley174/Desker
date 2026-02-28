export type HttpErrorPayload = {
  message: string;
  code?: string;
  details?: unknown;
};

export class HttpError extends Error {
  status: number;
  payload?: HttpErrorPayload;

  constructor(status: number, payload?: HttpErrorPayload) {
    super(payload?.message ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
    this.payload = payload;
  }
}

export async function fetchJson<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  });

  if (!res.ok) {
    let payload: any = undefined;
    try {
      payload = await res.json();
    } catch {
      // ignore
    }
    throw new HttpError(res.status, payload);
  }

  return (await res.json()) as T;
}
