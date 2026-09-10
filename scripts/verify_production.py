import urllib.request
import json
import time

url = 'https://offline-os-gray.vercel.app/api/people'
print(f"Pinging live production deployment at {url} ...")

for attempt in range(6):
    try:
        with urllib.request.urlopen(url, timeout=10) as res:
            if res.status == 200:
                data = json.loads(res.read().decode('utf-8'))
                people = data.get('people', [])
                print(f"\n[LIVE PRODUCTION VERIFIED] /api/people returned {len(people)} real members!")
                for p in people[:5]:
                    print(f"  * {p.get('name')} | {p.get('company')} | {p.get('role_title')} | Fit Score: {p.get('fit_score')}")
                break
    except Exception as e:
        print(f"Attempt {attempt+1}: {e}")
        time.sleep(3)
else:
    print("Could not reach production endpoint.")

# Check live introductions
try:
    with urllib.request.urlopen('https://offline-os-gray.vercel.app/api/introductions', timeout=10) as res:
        if res.status == 200:
            data = json.loads(res.read().decode('utf-8'))
            intros = data.get('introductions', [])
            print(f"\n[LIVE INTRODUCTIONS VERIFIED] /api/introductions returned {len(intros)} high-synergy recommendations!")
            for intro in intros[:3]:
                pa = intro.get('person_a', {}).get('name', 'Unknown')
                pb = intro.get('person_b', {}).get('name', 'Unknown')
                print(f"  * {pa} <-> {pb} | Match Score: {intro.get('match_score')} | Synergy: {intro.get('shared_context')}")
except Exception as e:
    print(f"Live introductions error: {e}")
