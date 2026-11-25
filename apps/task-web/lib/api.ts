/** HTTP client บางๆ: ใส่ Bearer token, แปลง error เป็น ApiError (ข้อความไทยจาก server), 401 → onUnauthorized */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type ApiOptions = {
  baseUrl: string;
  getToken: () => string | null;
  onUnauthorized?: () => void;
  fetchImpl?: typeof fetch;
};

export async function toApiError(res: Response): Promise<ApiError> {
  let message = `คำขอล้มเหลว (${res.status})`;
  try {
    const body = (await res.json()) as { message?: unknown };
    if (typeof body.message === "string") message = body.message;
    else if (Array.isArray(body.message)) message = body.message.join("; ");
  } catch {
    // body ไม่ใช่ JSON: ใช้ข้อความมาตรฐาน
  }
  return new ApiError(res.status, message);
}

export class ApiClient {
  constructor(private readonly opts: ApiOptions) {}

  private async request<T>(method: string, path: string, body?: unknown, o: { auth?: boolean } = {}): Promise<T> {
    const auth = o.auth ?? true;
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    const token = this.opts.getToken();
    if (auth && token) headers.Authorization = `Bearer ${token}`;
    let res: Response;
    try {
      res = await (this.opts.fetchImpl ?? fetch)(`${this.opts.baseUrl}${path}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    } catch {
      throw new ApiError(0, "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กรุณาตรวจสอบว่า API ทำงานอยู่");
    }
    if (!res.ok) {
      const err = await toApiError(res);
      if (res.status === 401 && auth) this.opts.onUnauthorized?.(); // login ผิดรหัสไม่ใช่ session หมดอายุ จึงไม่ redirect
      throw err;
    }
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  get<T = unknown>(path: string) {
    return this.request<T>("GET", path);
  }
  post<T = unknown>(path: string, body: unknown, o?: { auth?: boolean }) {
    return this.request<T>("POST", path, body, o);
  }
  patch<T = unknown>(path: string, body: unknown) {
    return this.request<T>("PATCH", path, body);
  }
  put<T = unknown>(path: string, body: unknown) {
    return this.request<T>("PUT", path, body);
  }
  del<T = unknown>(path: string) {
    return this.request<T>("DELETE", path);
  }
}
