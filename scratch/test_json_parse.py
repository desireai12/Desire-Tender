import json, re

def safe_parse(raw):
    cleaned = re.sub(r'```(?:json)?', '', raw, flags=re.IGNORECASE).strip()
    m = re.search(r'(\{[\s\S]*\})', cleaned)
    if m: cleaned = m.group(1)
    try: return json.loads(cleaned)
    except: pass
    sanitized = re.sub(r'[\r\n\t]+', ' ', cleaned)
    try: return json.loads(sanitized)
    except Exception as e: print('Fail:', e); return None

s = """```json
{
  "is_rejected_non_tender": true,
  "executive_summary": "Line 1
Line 2"
}
```"""
print('Parsed:', safe_parse(s))
