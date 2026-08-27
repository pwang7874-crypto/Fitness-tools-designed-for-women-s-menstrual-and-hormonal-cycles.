export const MOODS = [
  { value: "very_bad", label: "很糟", emoji: "😞" },
  { value: "low", label: "有点低", emoji: "😕" },
  { value: "ok", label: "平静", emoji: "😐" },
  { value: "good", label: "不错", emoji: "🙂" },
  { value: "great", label: "很好", emoji: "😄" },
];

export const MOOD_EMOJI: Record<string, string> = {
  very_bad: "😞", low: "😕", ok: "😐", good: "🙂", great: "😄",
};

export const EQUIPMENT = [
  { value: "dumbbell", label: "哑铃" },
  { value: "barbell", label: "杠铃" },
  { value: "bench", label: "卧推凳" },
  { value: "cable", label: "龙门架" },
  { value: "kettlebell", label: "壶铃" },
  { value: "resistance_band", label: "弹力带" },
  { value: "pullup_bar", label: "引体杠" },
];

export const INJURED = [
  { value: "knee", label: "膝盖" },
  { value: "lower_back", label: "下背" },
  { value: "shoulder", label: "肩" },
  { value: "wrist", label: "手腕" },
];

export const RED_FLAGS = [
  { value: "chest_pain", label: "胸痛" },
  { value: "fainting", label: "晕厥/眩晕" },
  { value: "severe_pain", label: "剧烈疼痛" },
  { value: "abnormal_bleeding", label: "异常出血" },
  { value: "fever", label: "发热" },
];

export const GOALS = [
  { value: "health", label: "保持健康" },
  { value: "shape", label: "增肌塑形" },
  { value: "strength", label: "提升力量" },
];

export const EXPERIENCE = [
  { value: "beginner", label: "零基础/初级" },
  { value: "intermediate", label: "中级" },
  { value: "advanced", label: "高级" },
];

export const CYCLE_MODES = [
  { value: "natural", label: "自然周期" },
  { value: "hormonal", label: "激素避孕" },
  { value: "irregular", label: "周期不规律" },
  { value: "unknown", label: "不愿填写" },
];

export const MUSCLE_ZH: Record<string, string> = {
  quads: "股四头肌", glutes: "臀大肌", hamstrings: "腘绳肌", calves: "小腿",
  chest: "胸大肌", triceps: "肱三头肌", shoulders: "肩部", lats: "背阔肌",
  trapezius: "斜方肌", biceps: "肱二头肌", brachialis: "肱肌", abs: "腹肌",
  obliques: "腹外斜肌", soleus: "比目鱼肌", serratus: "前锯肌",
};
