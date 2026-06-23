"""
Muse Catch — 分级 LLM 路由层
- Agent 内置 LLM：隐私数据不出对话上下文（Onboarding DNA、个人画像分析）
- TokenRouter 云端：公开功能（灵感分析、选题、金句配图）— 用户自行配置 API Key

缺省模式：未配置 TR_API_KEY 时自动使用 Agent 自身的 LLM 能力（不绑特定模型）。
TokenRouter 注册：https://tokenrouter.com
"""
import os
import json
import re
import urllib.request
import urllib.error
import ssl
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")
# Also inherit Agent's own API keys (Hermes Agent env)
_load_agent = Path(os.path.expanduser("~/.hermes/.env"))
if _load_agent.exists():
    load_dotenv(_load_agent, override=False)  # don't override skill's .env

TZ = timezone(timedelta(hours=8))
TR_BASE = os.environ.get("TR_BASE_URL", "https://api.tokenrouter.com/v1")
TR_KEY = os.environ.get("TR_API_KEY", "")
OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:14b")

# 模型路由表
ROUTE = {
    "expand":      {"provider": "auto", "model_tr": "deepseek/deepseek-v4-pro", "model_local": None, "temp": 0.8, "max_tokens": 1200},
    "classify":    {"provider": "auto", "model_tr": "deepseek/deepseek-v4-pro", "model_local": None, "temp": 0.3, "max_tokens": 1500},
    "topics":      {"provider": "auto", "model_tr": "anthropic/claude-sonnet-4", "model_local": None, "temp": 0.8, "max_tokens": 1500},
    "deep_dive":   {"provider": "auto", "model_tr": "anthropic/claude-sonnet-4", "model_local": None, "temp": 0.7, "max_tokens": 2000},
    "quotes":      {"provider": "auto", "model_tr": "anthropic/claude-sonnet-4", "model_local": None, "temp": 0.9, "max_tokens": 800},
    "dna":         {"provider": "auto", "model_tr": "deepseek/deepseek-v4-pro", "model_local": None, "temp": 0.5, "max_tokens": 1200, "label": "Agent 内置 LLM"},
    "ingest":      {"provider": "auto", "model_tr": "deepseek/deepseek-v4-pro", "model_local": None, "temp": 0.3, "max_tokens": 400},
    "onboarding":  {"provider": "auto", "model_tr": "deepseek/deepseek-v4-pro", "model_local": None, "temp": 0.5, "max_tokens": 800, "label": "Agent 内置 LLM"},
}


# Agent 自身的 LLM 配置（从 Agent 环境继承，不绑特定模型）
def _read_agent_config():
    """读取 Agent 当前的模型配置，返回 (api_key, base_url, model)。"""
    key = None
    base = "https://api.deepseek.com"
    model = "deepseek-chat"
    try:
        # 1. 尝试从 Agent 的 config.yaml 获取当前模型
        import yaml
        cfg_path = Path(os.path.expanduser("~/.hermes/config.yaml"))
        if cfg_path.exists():
            cfg = yaml.safe_load(cfg_path.read_text())
            m = cfg.get("model", {})
            provider = m.get("provider", "").lower()
            model = m.get("default", model)
            base = m.get("base_url", base)
    except Exception:
        pass
    
    # 2. 查找 Agent 可用的 API Key（按通用命名规则尝试）
    key_env_vars = [
        "DEEPSEEK_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY",
        "MINIMAX_API_KEY", "GLM_API_KEY", "ZHIPUAI_API_KEY",
        "KIMI_API_KEY", "QIANWEN_API_KEY", "BAICHUAN_API_KEY"
    ]
    for var in key_env_vars:
        val = os.environ.get(var, "")
        if val:
            key = val
            break
    return key, base, model

_AGENT_KEY, _AGENT_BASE, _AGENT_MODEL = _read_agent_config()


def call_llm(prompt, task="ingest", system=None):
    """统一 LLM 调用入口。优先级：TR_API_KEY > Agent 自身 LLM > 规则兜底"""
    cfg = ROUTE.get(task, ROUTE["ingest"])
    temp = cfg["temp"]
    max_tokens = cfg["max_tokens"]
    
    # 1. TokenRouter cloud (if user configured key)
    if TR_KEY:
        model = cfg.get("model_tr", "deepseek/deepseek-v4-pro")
        result = _call_tr(model, prompt, temp, max_tokens, system)
        if result:
            return result
    
    # 2. Agent 自身的 LLM 能力（继承 Hermes Agent 的 API Key）
    if _AGENT_KEY:
        result = _call_agent_model(_AGENT_MODEL, prompt, temp, max_tokens, system)
        if result:
            return result
    
    # 3. Local Ollama fallback
    local_model = cfg.get("model_local") or OLLAMA_MODEL
    result = _call_ollama(local_model, prompt, temp, max_tokens, system)
    if result:
        return result
    
    print("[LLM Router] No LLM available. Set TR_API_KEY in .env or let your Agent handle analysis.")
    return None


def _call_agent_model(model, prompt, temp=0.5, max_tokens=1000, system=None):
    """调用 Agent 自身的 LLM（继承 Agent 的模型配置）"""
    if not _AGENT_KEY:
        return None
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    body = {
        "model": model,
        "messages": messages,
        "temperature": temp,
        "max_tokens": max_tokens
    }
    headers = {"Authorization": f"Bearer {_AGENT_KEY}"}
    
    endpoints = [
        f"{_AGENT_BASE}/v1/chat/completions",
        f"{_AGENT_BASE}/chat/completions",
    ]
    for ep in endpoints:
        resp = _http_post_json(ep, body, headers)
        if resp:
            content = resp.get("choices", [{}])[0].get("message", {}).get("content", "")
            if content:
                return content
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


def _call_tr(model, prompt, temp=0.5, max_tokens=1000, system=None):
    """调用 TokenRouter 云端 API"""
    if not TR_KEY:
        return None
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    body = {
        "model": model,
        "messages": messages,
        "temperature": temp,
        "max_tokens": max_tokens
    }
    headers = {"Authorization": f"Bearer {TR_KEY}"}
    resp = _http_post_json(f"{TR_BASE}/chat/completions", body, headers)
    if resp:
        return resp.get("choices", [{}])[0].get("message", {}).get("content", "")
    return None


def _call_ollama(model, prompt, temp=0.5, max_tokens=1000, system=None):
    """调用本地 Ollama"""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})
    
    body = {
        "model": model,
        "messages": messages,
        "stream": False,
        "options": {
            "temperature": temp,
            "num_predict": max_tokens
        }
    }
    resp = _http_post_json(f"{OLLAMA_BASE}/api/chat", body, timeout=60)
    if resp:
        return resp.get("message", {}).get("content", "")
    return None


def call_tr_image(prompt, size="1024x1024"):
    """调用 TokenRouter 图片生成"""
    if not TR_KEY:
        return None
    body = {
        "model": "openai/gpt-5.4-image-2",
        "prompt": prompt,
        "n": 1,
        "size": size,
        "response_format": "url"
    }
    headers = {"Authorization": f"Bearer {TR_KEY}"}
    resp = _http_post_json(f"{TR_BASE}/images/generations", body, headers, timeout=60)
    if resp:
        if "data" in resp and len(resp["data"]) > 0:
            return resp["data"][0].get("url", "")
        if "error" in resp:
            print(f"[LLM Router] Image error: {resp['error'].get('message','?')[:100]}")
    return None


def extract_json(content):
    """从 LLM 输出中提取第一个 JSON 对象"""
    if not content:
        return None
    # Try direct parse first
    try:
        return json.loads(content.strip())
    except:
        pass
    # Try regex extraction — find first { that pairs correctly
    start = content.find('{')
    if start == -1:
        return None
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
            if c == '{':
                depth += 1
            elif c == '}':
                depth -= 1
                if depth == 0:
                    substr = content[start:i+1]
                    try:
                        return json.loads(substr)
                    except:
                        return None
    return None
