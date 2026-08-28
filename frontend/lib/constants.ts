export const MOODS = [
  { value: "very_bad", label: "很糟", icon: "mood-rain" },
  { value: "low", label: "有点低", icon: "mood-cloud" },
  { value: "ok", label: "平静", icon: "mood-horizon" },
  { value: "good", label: "不错", icon: "mood-sun" },
  { value: "great", label: "很好", icon: "mood-spark" },
];

export const MOOD_ICON: Record<string, string> = {
  very_bad: "mood-rain", low: "mood-cloud", ok: "mood-horizon", good: "mood-sun", great: "mood-spark",
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
  { value: "unknown", label: "不确定（仅估算日期）" },
];

// 身体状态：用可点选的标签量化，而不是输入抽象数字
export const ENERGY_OPTIONS = [
  { value: "1", label: "很累", icon: "energy-empty" },
  { value: "2", label: "有点累", icon: "energy-low" },
  { value: "3", label: "一般", icon: "energy-steady" },
  { value: "4", label: "不错", icon: "energy-high" },
  { value: "5", label: "精力充沛", icon: "energy-spark" },
];

export const SLEEP_OPTIONS = [
  { value: "5", label: "没睡好 · <6h", icon: "sleep-low" },
  { value: "7", label: "一般 · 6–8h", icon: "sleep-calm" },
  { value: "8.5", label: "睡得好 · >8h", icon: "sleep-rested" },
];

export const SORENESS_OPTIONS = [
  { value: "0", label: "不酸", icon: "body-clear" },
  { value: "1", label: "轻微", icon: "body-mild" },
  { value: "3", label: "明显", icon: "body-medium" },
  { value: "5", label: "很酸", icon: "body-high" },
];

export const STRESS_OPTIONS = [
  { value: "1", label: "很轻松" },
  { value: "2", label: "较轻" },
  { value: "3", label: "一般" },
  { value: "4", label: "偏高" },
  { value: "5", label: "很高" },
];

export const SYMPTOMS = [
  { value: "cramps", label: "腹部不适" },
  { value: "headache", label: "头痛" },
  { value: "bloating", label: "腹胀" },
  { value: "breast_tenderness", label: "乳房胀痛" },
  { value: "nausea", label: "恶心" },
  { value: "fatigue", label: "明显疲劳" },
];

export const BLEEDING_OPTIONS = [
  { value: "none", label: "无" },
  { value: "spotting", label: "点滴" },
  { value: "light", label: "少量" },
  { value: "medium", label: "中等" },
  { value: "heavy", label: "较多" },
];

export const MUSCLE_ZH: Record<string, string> = {
  quads: "股四头肌", glutes: "臀大肌", hamstrings: "腘绳肌", calves: "小腿",
  chest: "胸大肌", triceps: "肱三头肌", shoulders: "肩部", lats: "背阔肌",
  trapezius: "斜方肌", biceps: "肱二头肌", brachialis: "肱肌", abs: "腹肌",
  obliques: "腹外斜肌", soleus: "比目鱼肌", serratus: "前锯肌",
};
