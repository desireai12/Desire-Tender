import os
from dotenv import load_dotenv

load_dotenv()

print("=" * 60)
print("1. TESTING DATABASE_URL")
print("=" * 60)
db_url = os.getenv("DATABASE_URL", "")
print(f"DATABASE_URL is set: {bool(db_url)}")
if db_url:
    import re
    masked = re.sub(r':([^:@]+)@', ':****@', db_url)
    print(f"Value (masked): {masked}")

try:
    import psycopg2
    conn = psycopg2.connect(db_url, connect_timeout=5)
    cur = conn.cursor()
    cur.execute("SELECT current_database(), current_user;")
    row = cur.fetchone()
    print(f"DB CONNECTION SUCCESSFUL - database: {row[0]}, user: {row[1]}")

    cur.execute("""
        SELECT table_name FROM information_schema.tables
        WHERE table_schema = 'public' ORDER BY table_name;
    """)
    tables = [r[0] for r in cur.fetchall()]
    print(f"Tables visible to this connection: {tables}")

    cur.execute("SELECT count(*) FROM public.users;")
    print(f"Row count in public.users: {cur.fetchone()[0]}")

    cur.close()
    conn.close()
except Exception as e:
    print(f"DB CONNECTION FAILED: {type(e).__name__}: {e}")

print()
print("=" * 60)
print("2. TESTING GEMINI_API_KEY")
print("=" * 60)
gemini_key = os.getenv("GEMINI_API_KEY", "")
print(f"GEMINI_API_KEY is set: {bool(gemini_key)}")
print(f"Key prefix looks like standard Google AI Studio format (AIzaSy...): {gemini_key.startswith('AIzaSy')}")

try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    llm = ChatGoogleGenerativeAI(
        model=os.getenv("GEMINI_MODEL", "gemini-3.6-flash"),
        google_api_key=gemini_key,
        temperature=0.1,
        timeout=15,
    )
    response = llm.invoke("Reply with exactly the word: OK")
    print(f"GEMINI CALL SUCCESSFUL - response: {response.content!r}")
except Exception as e:
    print(f"GEMINI CALL FAILED: {type(e).__name__}: {e}")

print()
print("=" * 60)
print("DONE - paste this entire output back for diagnosis")
print("=" * 60)
