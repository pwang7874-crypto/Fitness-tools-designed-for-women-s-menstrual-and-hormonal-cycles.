// 动作教学视频链接：B 站搜索（国内可访问，按动作中文名检索）
export function videoUrl(nameZh: string): string {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${nameZh} 动作教学`)}`;
}

export function errorMessage(reason: unknown, fallback: string): string {
  if (reason && typeof reason === "object" && "userMessage" in reason) {
    return String((reason as { userMessage: unknown }).userMessage);
  }
  return fallback;
}

export function formatDate(value: string): string {
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  return new Intl.DateTimeFormat("zh-CN", {
    month: "short",
    day: "numeric",
  }).format(date);
}
