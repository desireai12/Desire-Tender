import base64
import urllib.request
import json

key_b64 = 'QVEuQWI4Uk42S01UdnoxZnQ3al9TRmpFaVB6dnJwQVhreC1PU3hOU2ZyczByd1E1SVZBUFE='
key = base64.b64decode(key_b64).decode('utf-8')

prompt = """You are Desire Tender AI. Analyze this text and return JSON with document_status:
DOCUMENT TEXT (Filename: "random_water_tender.pdf"):
"Notice Inviting Tender (NIT) No. 04/2026-27 for Supply and Installation of 50 HP Submersible Water Pumps in Ajmer. Bidders must have average annual turnover of Rs 5.0 Crores in last 3 years and 5 years experience."

Return JSON with document_status, tender_title, verdict, eligibility_score, clauses_breakdown.
"""

url = f'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key={key}'
req = urllib.request.Request(
    url,
    data=json.dumps({
        'contents': [{'parts': [{'text': prompt}]}],
        'generationConfig': {'responseMimeType': 'application/json'}
    }).encode('utf-8'),
    headers={'Content-Type': 'application/json'}
)

try:
    with urllib.request.urlopen(req) as response:
        res = json.loads(response.read().decode('utf-8'))
        print('RESPONSE SUCCESS:')
        print(res['candidates'][0]['content']['parts'][0]['text'])
except Exception as e:
    print('FAILED:', e)
