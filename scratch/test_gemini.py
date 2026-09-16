import urllib.request
import json
import base64

KEY_B64 = 'QVEuQWI4Uk42S01UdnoxZnQ3al9TRmpFaVB6dnJwQVhreC1PU3hOU2ZyczByd1E1SVZBUFE='
gemini_key = base64.b64decode(KEY_B64).decode('utf-8')
print("Decoded Key:", gemini_key[:10] + "...")

models = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-2.0-flash-exp']
for m in models:
    url = f"https://generativelanguage.googleapis.com/v1beta/models/{m}:generateContent?key={gemini_key}"
    req = urllib.request.Request(
        url,
        data=json.dumps({
            "contents": [{"parts": [{"text": "Reply JSON: {\"status\": \"ok\"}"}]}],
            "generationConfig": {"responseMimeType": "application/json"}
        }).encode('utf-8'),
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            res_text = response.read().decode('utf-8')
            print(f"Model {m} SUCCESS (200):", res_text[:150])
    except Exception as e:
        print(f"Model {m} ERROR:", e)
