import urllib.request
import time
import json

print("Pinging http://localhost:3000/api/people ...")
for attempt in range(12):
    try:
        req = urllib.request.Request('http://localhost:3000/api/people')
        with urllib.request.urlopen(req, timeout=5) as res:
            if res.status == 200:
                data = json.loads(res.read().decode('utf-8'))
                people = data.get('people', [])
                print(f"[PASS] /api/people returned {len(people)} real members!")
                for p in people[:5]:
                    print(f"  - {p.get('name')} | {p.get('company')} | {p.get('role_title')} | Score: {p.get('fit_score')}")
                break
    except Exception as e:
        time.sleep(1.5)
else:
    print("[FAIL] Dev server did not respond within timeout")

# Test Introductions API
print("\nPinging http://localhost:3000/api/introductions ...")
try:
    with urllib.request.urlopen('http://localhost:3000/api/introductions', timeout=5) as res:
        if res.status == 200:
            data = json.loads(res.read().decode('utf-8'))
            intros = data.get('introductions', [])
            print(f"[PASS] /api/introductions returned {len(intros)} high-synergy recommendations!")
            for intro in intros[:3]:
                pa = intro.get('person_a', {}).get('name', 'Member A')
                pb = intro.get('person_b', {}).get('name', 'Member B')
                print(f"  - {pa} <-> {pb} | Match Score: {intro.get('match_score')} | Context: {intro.get('shared_context')}")
except Exception as e:
    print(f"[FAIL] /api/introductions error: {e}")

# Test Ingest Endpoint with a sample real founder
print("\nTesting POST /api/v1/ingest ...")
try:
    test_payload = json.dumps({
        "name": "Harrison Chase",
        "email": "harrison@langchain.dev",
        "company": "LangChain",
        "role_title": "Co-Founder & CEO",
        "bio_notes": "Building LangChain, LangSmith and LangGraph for enterprise AI agents.",
        "website": "https://langchain.com",
        "linkedin": "https://linkedin.com/in/harrison-chase-961287118",
        "source": "api_test_intake"
    }).encode('utf-8')
    
    req = urllib.request.Request(
        'http://localhost:3000/api/v1/ingest',
        data=test_payload,
        headers={'Content-Type': 'application/json'}
    )
    with urllib.request.urlopen(req, timeout=5) as res:
        data = json.loads(res.read().decode('utf-8'))
        print("[PASS] Ingestion pipeline response:", data.get('message'))
        print(f"  Ingested: {data.get('record', {}).get('name')} | Fit Score: {data.get('record', {}).get('fit_score')} | Role: {data.get('record', {}).get('role_type')}")
except Exception as e:
    print(f"[FAIL] Ingest error: {e}")
