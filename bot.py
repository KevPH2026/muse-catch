#!/usr/bin/env python3
"""Muse Telegram Bot — forward any message to capture inspiration.

Multi-user: each Telegram chat must be linked to a Muse account first.
The user generates a pairing code in Muse → Settings → Telegram 绑定,
then sends `/start <code>` here. Ingest calls carry X-Bot-Token (shared
secret, same value as MUSE_BOT_TOKEN on the API server) + telegram_chat_id,
which the server resolves to the linked account.
"""
import requests
import os
import sys
import time
import re
import json

TOKEN = os.environ.get("MUSE_BOT_TOKEN", "")
API_BASE = os.environ.get("MUSE_API_URL", "http://localhost:5200").rstrip("/")
INGEST_URL = f"{API_BASE}/api/ingest"
LINK_URL = f"{API_BASE}/api/bot/link"
LAST_UPDATE_FILE = os.path.join(os.path.dirname(__file__), ".bot_offset")

WELCOME = (
    "🌀 我是 Muse 灵感捕手！\n\n"
    "把任何消息转发给我，我会自动提炼入库你的 Muse 灵感库。\n\n"
    "首次使用需要绑定账号：\n"
    "1️⃣ 打开 {base}/app → 注册/登录\n"
    "2️⃣ Settings → 📨 Telegram 绑定 → 获取配对码\n"
    "3️⃣ 回来这里发送：/start 配对码"
)

def tg(method, **payload):
    try:
        return requests.post(f"https://api.telegram.org/bot{TOKEN}/{method}", json=payload, timeout=10)
    except Exception:
        return None

def reply(chat_id, text):
    tg("sendMessage", chat_id=chat_id, text=text)

def load_offset():
    try:
        with open(LAST_UPDATE_FILE) as f:
            return int(f.read().strip())
    except Exception:
        return 0

def save_offset(offset):
    with open(LAST_UPDATE_FILE, "w") as f:
        f.write(str(offset))

def handle_start(msg, text):
    """`/start <code>` links this Telegram chat to a Muse account."""
    chat_id = msg["chat"]["id"]
    m = re.match(r"^/start\s+(\d{6})\s*$", text)
    if not m:
        reply(chat_id, WELCOME.format(base=API_BASE))
        return
    code = m.group(1)
    try:
        r = requests.post(LINK_URL, json={"code": code, "chat_id": str(chat_id)},
                          headers={"X-Bot-Token": TOKEN}, timeout=10)
        d = r.json() if r.ok else {}
        if d.get("ok"):
            reply(chat_id, f"✅ 绑定成功！欢迎，{d.get('user', '创作者')} 🎉\n\n现在转发任何消息给我，灵感秒入库。")
        else:
            reply(chat_id, f"❌ {d.get('error', '配对失败')}，请重新获取配对码再试。")
    except Exception as e:
        reply(chat_id, f"❌ 连接 Muse 服务失败: {e}")

def handle_message(msg):
    """Extract content from any Telegram message and send to Muse API."""
    text = (msg.get("text") or msg.get("caption") or "").strip()
    chat_id = msg["chat"]["id"]

    if text.startswith("/start"):
        handle_start(msg, text)
        return
    if text.startswith("/"):
        reply(chat_id, WELCOME.format(base=API_BASE))
        return

    if not text:
        reply(chat_id, "📭 没有文字内容可以捕获。试试发送或转发带文字的链接/文章？")
        return

    payload = {
        "source": "telegram",
        "content": text,
        "url": "",
        "title": "",
        "note": f"Telegram: {msg['chat'].get('first_name', '')} {msg['chat'].get('last_name', '')}".strip(),
        "tags": ["telegram"],
        "telegram_chat_id": str(chat_id)
    }

    # Extract URL if present (forwarded messages often have entities)
    entities = msg.get("entities", []) or msg.get("caption_entities", [])
    for e in entities:
        if e.get("type") == "url":
            url = text[e["offset"]:e["offset"]+e["length"]]
            payload["url"] = url
            break

    try:
        resp = requests.post(INGEST_URL, json=payload,
                             headers={"X-Bot-Token": TOKEN}, timeout=15)
        if resp.status_code == 401:
            reply(chat_id, "🔗 还没绑定账号。\n\n打开 " + API_BASE + "/app → Settings → Telegram 绑定 → 获取配对码，然后发送 /start 配对码")
        elif resp.ok:
            data = resp.json()
            reply(chat_id, f"🌀 已捕获！\n\n📌 {data.get('title', '无标题')}\n🔑 {data.get('keywords', '')}")
        else:
            reply(chat_id, f"❌ 捕获失败: {resp.text[:200]}")
    except Exception as e:
        reply(chat_id, f"❌ API 连接失败: {e}")

def poll():
    """Long-polling loop."""
    offset = load_offset()
    print(f"🤖 Muse Bot 启动 (offset={offset})")
    print(f"   API: {API_BASE}")

    while True:
        try:
            r = requests.get(
                f"https://api.telegram.org/bot{TOKEN}/getUpdates",
                params={"offset": offset, "timeout": 30},
                timeout=35
            )
            r.raise_for_status()

            for upd in r.json().get("result", []):
                offset = upd["update_id"] + 1
                if "message" in upd:
                    handle_message(upd["message"])

            save_offset(offset)
        except requests.exceptions.ReadTimeout:
            continue  # Normal timeout on long poll
        except Exception as e:
            print(f"⚠️ Error: {e}")
            time.sleep(5)

if __name__ == "__main__":
    if not TOKEN:
        print("❌ 请设置 MUSE_BOT_TOKEN 环境变量")
        print("   1. Telegram 找 @BotFather → /newbot → 拿到 TOKEN")
        print("   2. 同一个值也要配到 API 服务的 MUSE_BOT_TOKEN（共享密钥）")
        print("   3. export MUSE_BOT_TOKEN='你的TOKEN'")
        print("   4. 重新运行")
        sys.exit(1)
    poll()
