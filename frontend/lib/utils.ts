// 动作教学视频链接：B 站搜索（国内可访问，按动作中文名检索）
export function videoUrl(nameZh: string): string {
  return `https://search.bilibili.com/all?keyword=${encodeURIComponent(`${nameZh} 动作教学`)}`;
}
