# -*- coding: utf-8 -*-
"""DeepSeek 调用封装（OpenAI 兼容接口，httpx 直连）。

设计原则：
- 模型失败/超时/无 Key 均不得让主链路崩溃：由调用方降级到确定性文案。
- 有限次重试 + 超时 + 统一异常，日志不记录密钥与敏感原文。
"""
import httpx

from ..core.config import settings


class LLMError(Exception):
    pass


def _messages(prompt: str) -> list[dict]:
    return [
        {"role": "system", "content": "你是 CycleFit AI 的教练助手，用温柔、不评判、给许可感的中文语气回应用户。"},
        {"role": "user", "content": prompt},
    ]


def chat(prompt: str, max_tokens: int = 300, temperature: float = 0.7) -> str:
    """调用 DeepSeek chat，返回文本；失败抛 LLMError。"""
    if not settings.DEEPSEEK_API_KEY:
        raise LLMError("missing_api_key")

    url = f"{settings.DEEPSEEK_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.MODEL_ID,
        "messages": _messages(prompt),
        "temperature": temperature,
        "max_tokens": max_tokens,
        "stream": False,
    }
    headers = {"Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}"}

    last_err: Exception | None = None
    for attempt in range(3):  # 有限重试
        try:
            with httpx.Client(timeout=20.0) as client:
                resp = client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                content = data["choices"][0]["message"]["content"]
                return content.strip()
            # 4xx（鉴权/参数错误）不重试；5xx/429 可重试
            if resp.status_code in (401, 403, 400, 404):
                raise LLMError(f"llm_http_{resp.status_code}")
            last_err = LLMError(f"llm_http_{resp.status_code}")
        except (httpx.TimeoutException, httpx.TransportError) as e:
            last_err = e
    raise LLMError(f"llm_unavailable: {last_err}")
