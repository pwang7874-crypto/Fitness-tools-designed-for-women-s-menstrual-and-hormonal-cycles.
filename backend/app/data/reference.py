# -*- coding: utf-8 -*-
"""参考枚举：肌肉 / 器械 / 动作分类。

分类法对齐 wger（开放健身数据库）的标准术语，中文名手工翻译。
这些是"事实型"标准解剖/器械术语，用于保证动作库字段引用的一致性与准确性。
"""

# 肌肉（slug -> 中文, 英文）
MUSCLES = {
    "biceps":        ("肱二头肌", "Biceps"),
    "shoulders":     ("三角肌/肩部", "Shoulders"),
    "serratus":      ("前锯肌", "Serratus anterior"),
    "chest":         ("胸大肌", "Chest"),
    "triceps":       ("肱三头肌", "Triceps"),
    "abs":           ("腹肌", "Abs"),
    "calves":        ("小腿三头肌", "Calves"),
    "glutes":        ("臀大肌", "Glutes"),
    "trapezius":     ("斜方肌", "Trapezius"),
    "quads":         ("股四头肌", "Quads"),
    "hamstrings":    ("腘绳肌", "Hamstrings"),
    "lats":          ("背阔肌", "Lats"),
    "brachialis":    ("肱肌", "Brachialis"),
    "obliques":      ("腹外斜肌", "Obliques"),
    "soleus":        ("比目鱼肌", "Soleus"),
}

# 器械（slug -> 中文, 英文）
EQUIPMENT = {
    "barbell":        ("杠铃", "Barbell"),
    "sz_bar":         ("SZ杠", "SZ-Bar"),
    "dumbbell":       ("哑铃", "Dumbbell"),
    "gym_mat":        ("瑜伽垫", "Gym mat"),
    "swiss_ball":     ("瑞士球", "Swiss Ball"),
    "pullup_bar":     ("引体杠", "Pull-up bar"),
    "bodyweight":     ("徒手", "Bodyweight"),
    "bench":          ("卧推凳", "Bench"),
    "incline_bench":  ("上斜凳", "Incline bench"),
    "kettlebell":     ("壶铃", "Kettlebell"),
    "resistance_band":("弹力带", "Resistance band"),
    "cable":          ("龙门架/绳索", "Cable machine"),
}

# 动作分类（slug -> 中文, 英文）
CATEGORIES = {
    "abs":      ("核心/腹", "Abs"),
    "arms":     ("手臂", "Arms"),
    "back":     ("背部", "Back"),
    "calves":   ("小腿", "Calves"),
    "cardio":   ("有氧", "Cardio"),
    "chest":    ("胸部", "Chest"),
    "legs":     ("腿部", "Legs"),
    "shoulders":("肩部", "Shoulders"),
}


def zh(slug: str, table: dict) -> str:
    return table[slug][0]


def en(slug: str, table: dict) -> str:
    return table[slug][1]
