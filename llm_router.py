"""
Muse Catch — 分级 LLM 路由层（多用户云端版）

调用优先级（server 按用户解析后传入）：
  0. 用户自定义模型（Settings 配置，BYOK，不限量）
  1. 用户自己的 TokenRouter Key（BYOK，不限量）
  2. 平台 TokenRouter Key（env TR_API_KEY，仅当 allow_platform=True — 由 server 的每用户每日配额控制）
  3. 平台默认模型（env DEEPSEEK_API_KEY 等，同样受 allow_platform 控制）
  4. 本地 Ollama（env OLLAMA_BASE_URL，免费）
  5. 全部失败 → None，调用方走规则兜底
"""
import os
import json
import re
import urllib.request
import urllib.error
import ssl
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent / ".env")

# Hybrid-reasoning providers (MiniMax M-series etc.) emit a <think>…</think>
# segment before the actual answer. Strip it at the source so every consumer
# (JSON extraction, regex array scans, chat replies) only sees the answer.
_THINK_RE = re.compile(r"<think>.*?(?:</think>|$)", re.DOTALL)

def _strip_think(text):
    if not text or "<think>" not in text:
        return text
    return _THINK_RE.sub("", text).strip()

TR_BASE = os.environ.get("TR_BASE_URL", "https://api.tokenrouter.com/v1")
# Platform-paid key. Unlike the single-user era there is NO runtime mutation:
# per-user keys are resolved in server.py and passed per-call, so one user's
# key can never serve another's requests.
PLATFORM_TR_KEY = os.environ.get("TR_API_KEY", "")
OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:14b")

# Platform default model (any OpenAI-compatible API, configured via env only —
# no ~/.hermes filesystem reads in the container).
_DEFAULT_KEY_VARS = [
    "DEEPSEEK_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
    "MINIMAX_API_KEY", "GLM_API_KEY", "ZHIPUAI_API_KEY",
    "KIMI_API_KEY", "QIANWEN_API_KEY", "BAICHUAN_API_KEY",
]
PLATFORM_LLM_KEY = next((os.environ.get(v, "") for v in _DEFAULT_KEY_VARS if os.environ.get(v, "")), "")
PLATFORM_LLM_BASE = os.environ.get("MUSE_LLM_BASE_URL", "https://api.deepseek.com")
PLATFORM_LLM_MODEL = os.environ.get("MUSE_LLM_MODEL", "deepseek-chat")

# 模型路由表（max_tokens 含混合推理模型的 <think> 段，需为正文留余量）
ROUTE = {
    "chat":        {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.7, "max_tokens": 4000},
    "expand":      {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.8, "max_tokens": 4000},
    "classify":    {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.3, "max_tokens": 3000},
    "topics":      {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.8, "max_tokens": 5000},
    "deep_dive":   {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.7, "max_tokens": 5000},
    "quotes":      {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.9, "max_tokens": 3000},
    "dna":         {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.5, "max_tokens": 4500},
    "ingest":      {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.3, "max_tokens": 2500},
    "onboarding":  {"model_tr": "deepseek/deepseek-v4-pro", "temp": 0.5, "max_tokens": 3000},
}


def platform_llm_available():
    """True if the deployment has ANY platform-paid LLM resource configured.
    Server uses this to avoid charging user quota when nothing can serve it."""
    return bool(PLATFORM_TR_KEY or PLATFORM_LLM_KEY)


def call_llm(prompt=None, task="ingest", system=None, temp=None, max_tokens=None,
             user_config=None, tr_key=None, allow_platform=False, messages=None):
    """统一 LLM 调用入口（多用户版）。

    messages: 完整的 [{role, content}] 列表（聊天历史场景），提供时优先于 prompt/system。
    user_config: 用户自定义模型 {model, endpoint, key}（BYOK）。
    tr_key: 用户自己的 TokenRouter Key（BYOK）。
    allow_platform: server 侧每用户每日配额校验通过后才为 True，控制平台付费资源。
    """
    cfg = ROUTE.get(task, ROUTE["ingest"])
    _temp = temp if temp is not None else cfg["temp"]
    _max_tokens = max_tokens if max_tokens is not None else cfg["max_tokens"]
    if messages is None:
        msgs = []
        if system:
            msgs.append({"role": "system", "content": system})
        msgs.append({"role": "user", "content": prompt or ""})
    else:
        msgs = list(messages)

    # 0. 用户自定义模型（BYOK，最高优先级，不限量）
    if user_config and user_config.get("model") and user_config.get("endpoint") and user_config.get("key"):
        result = _call_openai_compat(
            user_config["endpoint"], user_config["key"],
            user_config["model"], msgs, _temp, _max_tokens
        )
        if result:
            return result

    # 1. 用户自己的 TokenRouter Key（BYOK，不限量）
    if tr_key:
        result = _call_tr(tr_key, cfg.get("model_tr", "deepseek/deepseek-v4-pro"), msgs, _temp, _max_tokens)
        if result:
            return result

    # 2. 平台付费资源 — 仅当 server 配额校验通过
    if allow_platform:
        if PLATFORM_TR_KEY:
            result = _call_tr(PLATFORM_TR_KEY, cfg.get("model_tr", "deepseek/deepseek-v4-pro"), msgs, _temp, _max_tokens)
            if result:
                return result
        if PLATFORM_LLM_KEY:
            result = _call_openai_compat(PLATFORM_LLM_BASE, PLATFORM_LLM_KEY, PLATFORM_LLM_MODEL, msgs, _temp, _max_tokens)
            if result:
                return result

    # 3. 本地 Ollama（免费回退，仅显式配置 OLLAMA_BASE_URL 时启用）
    if OLLAMA_BASE:
        result = _call_ollama(OLLAMA_MODEL, msgs, _temp, _max_tokens)
        if result:
            return result

    print("[LLM Router] No LLM available for this call (BYOK absent / platform quota spent).")
    return None


def _call_openai_compat(endpoint, key, model, msgs, temp=0.5, max_tokens=1000):
    """Call any OpenAI-compatible API (DeepSeek, SiliconFlow, custom)"""
    body = {"model": model, "messages": msgs, "temperature": temp, "max_tokens": max_tokens}
    headers = {"Authorization": f"Bearer {key}"}

    base = endpoint.rstrip("/")
    for url in (f"{base}/v1/chat/completions", f"{base}/chat/completions"):
        # hybrid-reasoning models spend 30s+ in the think phase on heavy
        # prompts (topics/dive); the 30s default times those out
        resp = _http_post_json(url, body, headers, timeout=90)
        if resp:
            content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content:
                return _strip_think(content)
    print(f"[LLM Router] custom model failed: {model} @ {endpoint}")
    return None


def _http_post_json(url, body, headers=None, timeout=30):
    """HTTP POST with JSON body. Returns parsed JSON or None."""
    if headers is None:
        headers = {}
    headers["Content-Type"] = "application/json"
    data = json.dumps(body, ensure_ascii=False).encode("utf-8")
    ctx = ssl.create_default_context()
    try:
        req = urllib.request.Request(url, data=data, headers=headers, method="POST")
        with urllib.request.urlopen(req, timeout=timeout, context=ctx) as resp:
            return json.loads(resp.read().decode("utf-8"))
    except urllib.error.HTTPError as e:
        err_body = e.read().decode("utf-8", errors="replace")[:300]
        print(f"[LLM Router] HTTP {e.code}: {err_body}")
        return None
    except Exception as e:
        print(f"[LLM Router] HTTP error: {e}")
        return None


def _call_tr(key, model, msgs, temp=0.5, max_tokens=1000):
    """调用 TokenRouter 云端 API（key 由调用方传入：用户自有或平台）"""
    if not key:
        return None
    body = {"model": model, "messages": msgs, "temperature": temp, "max_tokens": max_tokens}
    headers = {"Authorization": f"Bearer {key}"}
    resp = _http_post_json(f"{TR_BASE}/chat/completions", body, headers, timeout=90)
    if resp:
        return _strip_think(resp.get("choices", [{}])[0].get("message", {}).get("content", ""))
    return None


def _call_ollama(model, msgs, temp=0.5, max_tokens=1000):
    """调用本地 Ollama"""
    body = {
        "model": model,
        "messages": msgs,
        "stream": False,
        "options": {"temperature": temp, "num_predict": max_tokens}
    }
    resp = _http_post_json(f"{OLLAMA_BASE}/api/chat", body, timeout=60)
    if resp:
        return resp.get("message", {}).get("content", "")
    return None


def call_tr_image(prompt, size="1024x1024", tr_key=None, allow_platform=False):
    """调用 TokenRouter 图片生成。用户自有 Key 优先；平台 Key 需配额放行。"""
    key = tr_key or (PLATFORM_TR_KEY if allow_platform else "")
    if not key:
        return None
    body = {
        "model": "openai/gpt-5.4-image-2",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "url"
    }
    headers = {"Authorization": f"Bearer {key}"}
    resp = _http_post_json(f"{TR_BASE}/images/generations", body, headers, timeout=60)
    if resp:
        if "data" in resp and len(resp["data"]) > 0:
            return resp["data"][0].get("url", "")
        if "error" in resp:
            print(f"[LLM Router] Image error: {resp['error'].get('message','?')[:100]}")
    return None


def extract_json(content):
    """从 LLM 输出中提取第一个 JSON 对象或数组"""
    if not content:
        return None
    # Strip markdown code fences
    content = content.strip()
    for fence in ['```json', '```']:
        if content.startswith(fence):
            content = content[len(fence):].strip()
        if content.endswith('```'):
            content = content[:-3].strip()
    # Try direct parse first
    try:
        return json.loads(content)
    except Exception:
        pass
    # Try regex extraction — find first { or [ that pairs correctly
    for opener, closer in [('{', '}'), ('[', ']')]:
        start = content.find(opener)
        if start == -1:
            continue
        depth = 0
        in_str = False
        escape = False
        for i in range(start, len(content)):
            c = content[i]
            if escape:
                escape = False
                continue
            if c == '\\':
                escape = True
                continue
            if c == '"':
                in_str = not in_str
                continue
            if not in_str:
                if c == opener:
                    depth += 1
                elif c == closer:
                    depth -= 1
                    if depth == 0:
                        substr = content[start:i+1]
                        try:
                            return json.loads(substr)
                        except Exception:
                            return None
    return None
