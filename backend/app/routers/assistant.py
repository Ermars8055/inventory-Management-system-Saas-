import os
import re
import json
import logging
import urllib.request
import urllib.error
from typing import Optional, List, Dict, Any
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/assistant", tags=["assistant"])

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
DEFAULT_MODEL = "openai/gpt-oss-120b"
FAST_MODEL = "openai/gpt-oss-20b"

SYSTEM_PROMPT = """You are the StockPilot AI Assistant, an expert in-app copilot for StockPilot (an enterprise inventory, school management, warehouse, and procurement platform).
Your mission is to help newcomers and existing users understand every feature, workflow, and button in the app.

Key StockPilot Knowledge:
1. SCHOOL & EDUCATION:
   - Classes (/classes): Organize students by grade/section. Can "Clone Academic Year" or "Batch Create" grades 1-12.
   - Students / Recipients (/recipients): Complete student roster with Roll Numbers, enrolled classes, and parent contacts.
   - Class Material Templates (/settings/class-templates): Pre-bundled kits of uniforms, textbooks, and supplies.
   - Bulk Issue (/bulk-issue): 1-click issuance of an entire template/kit to all students in a class.
   - Fees & Receipts (/fees): Tracks student uniform/book charges, records payments (Cash, UPI), and prints receipts.
   - Class Promotion (/classes/:id): End-of-year migration of students from Grade 1 -> Grade 2, archiving previous records.

2. INVENTORY & WAREHOUSES:
   - Inventory (/inventory): Master catalog with SKUs, barcodes, categories, and Reorder Levels (safety stock).
   - Warehouses (/warehouses): Physical campus buildings or central depots.
   - Storage Locations (/locations): Specific aisle/shelf/bin inside a warehouse with maximum capacity and occupancy % tracking.
   - Stock Transfer (/locations): Moving items between shelves/warehouses with full audit logs.

3. PROCUREMENT & ASSETS:
   - Procurement (/procurement): Creating Purchase Orders (PO), status workflow (Draft -> Ordered -> Received), and receiving goods into bins.
   - Vendors (/vendors): Supplier directory with payment terms and lifetime order history.
   - Quotations (/quotations): Price estimates and bidding from suppliers.
   - Assets & Maintenance (/assets, /maintenance): Capital equipment with serial numbers, warranty, and repair tickets.

4. SETTINGS & CUSTOMIZATION:
   - Custom Fields (/settings/custom-fields): Adding custom fields (Text, Dropdown, Number) to Items or Students. Features smart auto-detection for "Academic Year" and "Class".

RESPONSE STYLE:
- Keep answers friendly, practical, and concise (2-4 short paragraphs maximum).
- Explain WHAT it is, WHY it matters, and the exact 1-2-3 STEPS to do it.
- Always be welcoming to newcomers.
- AT THE END of your answer, if navigating to a page will help the user, you MUST include 1 or 2 actionable tags in this exact format:
  [ACTION:{"label": "Button Label", "path": "/route"}]

Examples:
- [ACTION:{"label": "Go to Classes", "path": "/classes"}]
- [ACTION:{"label": "Open Inventory", "path": "/inventory"}]
- [ACTION:{"label": "View Student Roster", "path": "/recipients"}]
- [ACTION:{"label": "Open Bulk Issue", "path": "/bulk-issue"}]
- [ACTION:{"label": "Manage Warehouses", "path": "/warehouses"}]
"""

class ActionItem(BaseModel):
    label: str
    path: Optional[str] = None

class AssistantChatRequest(BaseModel):
    message: str
    current_path: Optional[str] = "/dashboard"
    api_key: Optional[str] = None
    model: Optional[str] = DEFAULT_MODEL
    history: Optional[List[Dict[str, str]]] = []

class AssistantChatResponse(BaseModel):
    reply: str
    actions: List[ActionItem] = []
    model: str
    provider: str = "groq"
    is_fallback: bool = False

def _extract_actions(text: str) -> tuple[str, List[ActionItem]]:
    """Extract [ACTION:{"label": "...", "path": "..."}] tags from response text."""
    actions: List[ActionItem] = []
    pattern = r'\[ACTION:\s*({.*?})\s*\]'

    matches = re.findall(pattern, text)
    for m in matches:
        try:
            data = json.loads(m)
            actions.append(ActionItem(label=data.get("label", "Open Page"), path=data.get("path")))
        except Exception:
            continue

    cleaned_text = re.sub(pattern, '', text).strip()
    return cleaned_text, actions

@router.post("/chat", response_model=AssistantChatResponse)
def assistant_chat(payload: AssistantChatRequest):
    """
    Conversational Copilot powered by Groq (LLaMA 3.3 70B / 8B free models).
    Uses the user-provided key or the server's GROQ_API_KEY.
    """
    # 1. Resolve API key
    key = (payload.api_key or os.getenv("GROQ_API_KEY") or "").strip()
    target_model = payload.model or DEFAULT_MODEL

    if not key:
        # Graceful guidance when no key is set yet
        guide_text = (
            "Groq AI is ready to connect! You can use the **100% free LLaMA 3.3 70B** model on Groq Cloud.\n\n"
            "**How to enable:**\n"
            "1. Get your free key at [console.groq.com/keys](https://console.groq.com/keys) (takes 10 seconds, zero credit card).\n"
            "2. Click the ⚙️ icon in this assistant and paste your `gsk_...` key, or add `GROQ_API_KEY` to your `.env`.\n\n"
            "Meanwhile, you can use our built-in local knowledge search and Screen Inspector anytime!"
        )
        return AssistantChatResponse(
            reply=guide_text,
            actions=[
                ActionItem(label="Get Free Groq Key", path="https://console.groq.com/keys"),
                ActionItem(label="Explore Current Screen", path=payload.current_path or "/dashboard"),
            ],
            model="local-fallback",
            provider="local",
            is_fallback=True,
        )

    # 2. Build Groq chat payload
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]

    # Include recent conversation history (up to 4 turns)
    if payload.history:
        for turn in payload.history[-4:]:
            role = turn.get("role", "user")
            content = turn.get("content", "")
            if content and role in ("user", "assistant"):
                messages.append({"role": role, "content": content})

    # Add current user prompt with screen context
    context_note = f"\n[Context: The user is currently on the screen: {payload.current_path}]"
    messages.append({
        "role": "user",
        "content": payload.message + context_note,
    })

    req_body = json.dumps({
        "model": target_model,
        "messages": messages,
        "temperature": 0.4,
        "max_tokens": 768,
    }).encode("utf-8")

    req = urllib.request.Request(GROQ_API_URL, data=req_body, method="POST")
    req.add_header("Authorization", f"Bearer {key}")
    req.add_header("Content-Type", "application/json")
    req.add_header("User-Agent", "Mozilla/5.0")

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            raw_reply = data["choices"][0]["message"]["content"]
            cleaned_reply, actions = _extract_actions(raw_reply)

            return AssistantChatResponse(
                reply=cleaned_reply,
                actions=actions,
                model=target_model,
                provider="groq",
                is_fallback=False,
            )
    except urllib.error.HTTPError as e:
        err_msg = e.read().decode("utf-8")
        logger.error(f"Groq API error ({e.code}): {err_msg}")
        return AssistantChatResponse(
            reply=f"Groq API returned an error ({e.code}). Please check your API key in Assistant Settings.\n\nDetails: {err_msg[:200]}",
            actions=[ActionItem(label="Get New Groq Key", path="https://console.groq.com/keys")],
            model=target_model,
            provider="groq",
            is_fallback=True,
        )
    except Exception as e:
        logger.error(f"Failed to communicate with Groq: {e}")
        return AssistantChatResponse(
            reply=f"Could not reach Groq API ({str(e)}). You can continue using the built-in local knowledge search.",
            actions=[],
            model="local-fallback",
            provider="local",
            is_fallback=True,
        )
