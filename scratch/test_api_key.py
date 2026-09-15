import os
from dotenv import load_dotenv
load_dotenv('apps/api/.env')
gemini_key = os.getenv('GEMINI_API_KEY')

print("Testing with langchain_google_genai...")
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(
        model="gemini-3.6-flash",
        google_api_key=gemini_key,
        temperature=0.1,
    )
    res = llm.invoke("Hello, respond in JSON: {\"status\": \"ok\"}")
    print("Langchain result:", res.content)
except Exception as e:
    print("Langchain failed:", e)

print("\nTesting with urllib to v1beta gemini-1.5-flash...")
import urllib.request, json
url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"
req = urllib.request.Request(
    url,
    data=json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode("utf-8"),
    headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key}
)
try:
    with urllib.request.urlopen(req) as response:
        print("urllib v1beta result:", response.read().decode("utf-8")[:100])
except Exception as e:
    print("urllib v1beta failed:", e)

print("\nTesting with urllib to v1beta gemini-3.6-flash...")
url36 = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={gemini_key}"
req36 = urllib.request.Request(
    url36,
    data=json.dumps({"contents": [{"parts": [{"text": "Hello"}]}]}).encode("utf-8"),
    headers={"Content-Type": "application/json", "x-goog-api-key": gemini_key}
)
try:
    with urllib.request.urlopen(req36) as response:
        print("urllib v1beta 3.6 result:", response.read().decode("utf-8")[:100])
except Exception as e:
    print("urllib v1beta 3.6 failed:", e)
