// 集中式 API 层：统一基础地址、错误转换；页面不散落 fetch
export type AppError = {
  code: string;
  message: string;
  userMessage: string;
  retryable: boolean;
};

export class ApiError extends Error {
  code: string;
  userMessage: string;
  retryable: boolean;
  constructor(code: string, userMessage: string, retryable = false) {
    super(userMessage);
    this.code = code;
    this.userMessage = userMessage;
    this.retryable = retryable;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, {
      headers: { "Content-Type": "application/json" },
      ...init,
    });
  } catch {
    throw new ApiError("network", "网络连接失败，请稍后重试", true);
  }
  if (!res.ok) {
    const detail = await res.text();
    throw new ApiError(
      `http_${res.status}`,
      res.status === 404 ? "资源不存在" : `请求失败（${res.status}）`,
      res.status >= 500,
    );
  }
  return (await res.json()) as T;
}

export const api = {
  onboarding: (body: Record<string, unknown>) =>
    request<{ profile_id: number }>("/api/v1/onboarding", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkin: (body: Record<string, unknown>) =>
    request<any>("/api/v1/checkin", { method: "POST", body: JSON.stringify(body) }),
  exercises: () => request<any[]>("/api/v1/exercises"),
  plan: (id: number) => request<any>(`/api/v1/plan/${id}`),
  feedback: (body: Record<string, unknown>) =>
    request<any>("/api/v1/feedback", { method: "POST", body: JSON.stringify(body) }),
  insights: (profileId: number) => request<any>(`/api/v1/insights/${profileId}`),
  export: (profileId: number) => request<any>(`/api/v1/export/${profileId}`),
  deleteProfile: (profileId: number) =>
    request<any>(`/api/v1/profile/${profileId}`, { method: "DELETE" }),
};
