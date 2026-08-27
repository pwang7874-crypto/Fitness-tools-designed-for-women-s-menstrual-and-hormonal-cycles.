# -*- coding: utf-8 -*-
"""教练 Agent 系统防护：提示词注入 / 违规内容 / 超长输入的确定性拦截。

原则：防护走确定性规则，不依赖模型自觉；命中即拒答，不给模型执行的机会。
"""
MAX_MESSAGE_LEN = 500

# 提示词注入特征（中英）
INJECTION_PATTERNS = [
    "忽略以上", "忽略之前", "忽略所有", "忽略上面的", "无视以上", "无视之前",
    "ignore previous", "ignore above", "ignore all", "disregard", "forget all",
    "系统提示", "系统提示词", "你的提示词", "你的指令", "你的角色设定",
    "system prompt", "system message", "your prompt", "your instructions", "your role",
    "角色扮演", "扮演", "你现在是", "假装你是", "pretend", "roleplay", "you are now",
    "越狱", "jailbreak", "dan 模式", "dan模式", "开发者模式", "developer mode",
    "没有限制", "无需遵守", "不需要遵守规则", "解除限制",
    "no restrictions", "ignore your rules", "bypass",
    "泄露", "告诉我你的", "输出你的", "打印你的", "reveal", "print your", "show me your",
    "前缀", "初始指令", "initial instructions",
]

# 违规 / 危险内容（确定性拒绝，不进入模型）
POLICY_PATTERNS = [
    "自杀", "自残", "自杀方法", "结束生命", "割腕", "伤害自己",
    "杀人", "杀人方法", "炸弹", "制作炸弹", "武器", "爆炸物",
    "毒品", "吸毒", "违禁品", "走私", "制毒",
    "诈骗", "骗钱", "洗钱", "非法", "违法", "犯罪",
    "黑客", "入侵", "破解密码", "窃取", "盗取",
    "色情", "性侵", "未成年色情", "赌博",
]


def check(message: str) -> str | None:
    """返回拒答文案；None 表示安全。"""
    m = (message or "").strip()
    if not m:
        return None
    if len(m) > MAX_MESSAGE_LEN:
        return "消息有点长，请简短一点，我一样能帮你调整计划。"

    low = m.lower()
    for p in INJECTION_PATTERNS:
        if p in low:
            return "我只会基于你的训练情况帮你，不回答这类问题。"
    for p in POLICY_PATTERNS:
        if p in low:
            return "这个话题我不能聊。我可以继续帮你调整今天的训练计划。"
    return None
