"""
Muse Catch — 分级 LLM 路由层
- Agent 内置 LLM：隐私数据不出对话上下文（Onboarding DNA、个人画像分析）
- TokenRouter 云端：公开功能（灵感分析、选题、金句配图）

所有模型通过 TokenRouter 统一网关调用。DNA 分析使用与 Agent 相同的模型，
代表"Agent 自己的分析能力"——不是本地 Ollama。
"""
import os
import json
import subprocess
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / ".env")

TZ = timezone(timedelta(hours=8))
TR_BASE = os.environ.get("TR_BASE_URL", "https://api.tokenrouter.com/v1")
TR_KEY = os.environ.get("TR_API_KEY", "")
OLLAMA_BASE = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.environ.get("OLLAMA_MODEL", "qwen2.5:14b")

# 模型路由表
ROUTE = {
    "expand":      {"provider": "tr", "model": "deepseek/deepseek-v4-pro", "temp": 0.8, "max_tokens": 1200},
    "classify":    {"provider": "tr", "model": "deepseek/deepseek-v4-pro", "temp": 0.3, "max_tokens": 1500},
    "topics":      {"provider": "tr", "model": "anthropic/claude-sonnet-4", "temp": 0.8, "max_tokens": 1500},
    "deep_dive":   {"provider": "tr", "model": "anthropic/claude-sonnet-4", "temp": 0.7, "max_tokens": 2000},
    "quotes":      {"provider": "tr", "model": "anthropic/claude-sonnet-4", "temp": 0.9, "max_tokens": 800},
    "dna":         {"provider": "tr", "model": "deepseek/deepseek-v4-pro", "temp": 0.5, "max_tokens": 1200, "label": "Agent 内置 LLM"},
    "ingest":      {"provider": "tr", "model": "deepseek/deepseek-v4-pro", "temp": 0.3, "max_tokens": 400},
    "onboarding":  {"provider": "tr", "model": "deepseek/deepseek-v4-pro", "temp": 0.5, "max_tokens": 800, "label": "Agent 内置 LLM"},
}


def call_llm(prompt, task="ingest", system=None):
    """统一 LLM 调用入口 — 根据 task 自动选模型"""
    cfg = ROUTE.get(task, ROUTE["ingest"])
    provider = cfg["provider"]
    model = cfg["model"]
    temp = cfg["temp"]
    max_tokens = cfg["max_tokens"]
    
    if provider == "tr":
        return _call_tr(model, prompt, temp, max_tokens, system)
    elif provider == "ollama":
        return _call_ollama(model, prompt, temp, max_tokens, system)
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
    
    try:
        r = subprocess.run([
            "curl", "-s", "--max-time", "30",
            f"{TR_BASE}/chat/completions",
            "-H", f"Authorization: Bearer {TR_KEY}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(body, ensure_ascii=False)
        ], capture_output=True, text=True, timeout=35)
        
        if r.returncode == 0 and r.stdout.strip():
            resp = json.loads(r.stdout)
            return resp.get("choices", [{}])[0].get("message", {}).get("content", "")
    except Exception as e:
        print(f"[LLM Router] TR error: {e}")
    return None


def _call_ollama(model, prompt, temp=0.5, max_tokens=1000, system=None):
    """调用本地 Ollama（隐私数据不走云端）"""
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
    
    try:
        r = subprocess.run([
            "curl", "-s", "--max-time", "60",
            f"{OLLAMA_BASE}/api/chat",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(body, ensure_ascii=False)
        ], capture_output=True, text=True, timeout=65)
        
        if r.returncode == 0 and r.stdout.strip():
            resp = json.loads(r.stdout)
            return resp.get("message", {}).get("content", "")
    except Exception as e:
        print(f"[LLM Router] Ollama error: {e}")
    return None


def call_tr_image(prompt, size="1024x1024"):
    """调用 TokenRouter 图片生成（openai/gpt-5.4-image-2）"""
    if not TR_KEY:
        return None
    try:
        body = {
            "model": "openai/gpt-5.4-image-2",
            "prompt": prompt,
            "n": 1,
            "size": size,
            "response_format": "url"
        }
        r = subprocess.run([
            "curl", "-s", "--max-time", "60",
            f"{TR_BASE}/images/generations",
            "-H", f"Authorization: Bearer {TR_KEY}",
            "-H", "Content-Type: application/json",
            "-d", json.dumps(body, ensure_ascii=False)
        ], capture_output=True, text=True, timeout=65)
        
        if r.returncode == 0 and r.stdout.strip():
            resp = json.loads(r.stdout)
            if "data" in resp and len(resp["data"]) > 0:
                return resp["data"][0].get("url", "")
            if "error" in resp:
                print(f"[LLM Router] Image error: {resp['error'].get('message','?')[:100]}")
    except Exception as e:
        print(f"[LLM Router] Image error: {e}")
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
