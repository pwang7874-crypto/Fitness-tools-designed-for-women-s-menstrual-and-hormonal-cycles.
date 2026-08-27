// 动作教学视频链接：YouTube 搜索（稳定可点，按动作英文名检索）
export function videoUrl(nameEn: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(`${nameEn} exercise form how to`)}`;
}
