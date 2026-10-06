import os
import json
import time
import urllib.request
import psycopg2

db_url = 'postgresql://postgres.udwjptggvaavoemuvjbm:desireenergy%401234@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres'

# Target URLs to try
urls_to_try = [
    "https://desire-tender-git-main-desireai12.vercel.app/api/v1/tender/analyze",
    "https://desire-tender-hh35bdzxb-desireai.vercel.app/api/v1/tender/analyze",
    "https://desire-tender-847zvcqoi-desireai.vercel.app/api/v1/tender/analyze"
]

pdf_path = "scratch/PHED_Rajasthan_Solar_Pumping_Tender.pdf"
with open(pdf_path, "rb") as f:
    pdf_bytes = f.read()

boundary = '---------------------------974767299852498929531610575'
body = bytearray()
body.extend(f'--{boundary}\r\n'.encode('utf-8'))
body.extend(f'Content-Disposition: form-data; name="document"; filename="Fresh_Live_Test_Document_2026.pdf"\r\n'.encode('utf-8'))
body.extend(f'Content-Type: application/pdf\r\n\r\n'.encode('utf-8'))
body.extend(pdf_bytes)
body.extend(f'\r\n--{boundary}\r\n'.encode('utf-8'))
body.extend(f'Content-Disposition: form-data; name="title"\r\n\r\n'.encode('utf-8'))
body.extend(f'Fresh Live Test Document 2026\r\n'.encode('utf-8'))
body.extend(f'--{boundary}--\r\n'.encode('utf-8'))

working_url = None
response_data = None
elapsed_time = 0

for url in urls_to_try:
    print(f"Testing upload endpoint: {url}...")
    req = urllib.request.Request(url, data=bytes(body), headers={
        'Content-Type': f'multipart/form-data; boundary={boundary}',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
    }, method='POST')
    
    t0 = time.perf_counter()
    try:
        with urllib.request.urlopen(req, timeout=45) as resp:
            content = resp.read().decode('utf-8', errors='replace')
            elapsed_time = time.perf_counter() - t0
            response_data = json.loads(content)
            working_url = url
            print(f"SUCCESS! Endpoint {url} responded in {elapsed_time:.2f}s (HTTP {resp.status})")
            break
    except Exception as e:
        print(f"Endpoint {url} failed: {e}")

if not working_url or not response_data:
    print("FATAL: None of the target deployment URLs could be reached directly.")
    exit(1)

print("\n--- STEP 1 & 2 COMPLETE ---")
print(f"Target URL: {working_url}")
print(f"Response Time: {elapsed_time:.2f} seconds")
print(f"Report Verdict: {response_data.get('report', {}).get('verdict') or response_data.get('verdict')}")
print(f"Extracted Text Length: {response_data.get('debug', {}).get('extracted_text_length')}")

# Get newest tender_id from DB
conn = psycopg2.connect(db_url)
cur = conn.cursor()

cur.execute("SELECT tender_id FROM public.tender_chunks ORDER BY created_at DESC LIMIT 1;")
row = cur.fetchone()
test_tid = row[0] if row else None

print(f"\nTarget Tender ID in DB: {test_tid}")

print("\n--- STEP 3: WAITING 4 MINUTES FOR BACKGROUND INDEXING (waitUntil) ---")
for minute in range(1, 5):
    time.sleep(60)
    cur.execute("SELECT count(*) FROM public.tender_chunks WHERE tender_id = %s;", (test_tid,))
    cnt = cur.fetchone()[0]
    print(f"Minute {minute}: Current row count in tender_chunks = {cnt}")

print("\n--- STEP 4 & 5: FINAL DB ROW COUNT QUERY ---")
cur.execute("SELECT count(*) FROM public.tender_chunks WHERE tender_id = %s;", (test_tid,))
final_count = cur.fetchone()[0]
print(f"FINAL REAL ROW COUNT FOR {test_tid}: {final_count}")

cur.close()
conn.close()
