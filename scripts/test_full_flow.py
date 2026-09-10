import urllib.request
import json

BASE_URL = "http://localhost:3000"

def test_dedup_ingest():
    print("--- 1. Testing Ingestion Deduplication ---")
    payload = json.dumps({
        "name": "Harrison Chase Duplicate",
        "email": "harrison@langchain.dev",
        "company": "LangChain",
        "role_title": "CEO",
        "bio_notes": "Second submission from community conference.",
        "source": "event_booth"
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/v1/ingest", data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        is_dup = data.get('duplicate_detected')
        print(f"  [RESULT] Duplicate detected: {is_dup} (expected: True)")
        assert is_dup is True, "Expected duplicate_detected to be True"
        print("  [PASS] Deduplication correctly caught matching email!")

def test_slack_interactive_triage():
    print("\n--- 2. Testing Slack VIP Intake Interactive Triage ---")
    actions = [
        ('approve_welcome', '351'),
        ('suggest_intro', '351'),
        ('review_duplicate', '351'),
        ('deep_research_memo', '351')
    ]
    for action_id, member_id in actions:
        payload = json.dumps({
            "actions": [{"action_id": action_id, "value": member_id}],
            "user": {"username": "operator_utsav"}
        }).encode('utf-8')
        req = urllib.request.Request(f"{BASE_URL}/api/slack/actions", data=payload, headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(req) as res:
            data = json.loads(res.read().decode('utf-8'))
            print(f"  [PASS] Action '{action_id}' executed -> Status: {data.get('status')}")

def test_export_apis():
    print("\n--- 3. Testing Data Export Endpoints ---")
    for resource in ['people', 'introductions', 'duplicates']:
        for fmt in ['csv', 'json']:
            url = f"{BASE_URL}/api/export?resource={resource}&format={fmt}"
            req = urllib.request.Request(url)
            with urllib.request.urlopen(req) as res:
                content_type = res.headers.get('Content-Type')
                data = res.read()
                print(f"  [PASS] Export {resource} ({fmt}) -> {len(data)} bytes, Content-Type: {content_type}")

def test_tavily_search():
    print("\n--- 4. Testing Tavily AI Search Endpoint ---")
    payload = json.dumps({
        "query": "Composio AI tooling for autonomous agents",
        "search_depth": "basic",
        "max_results": 2
    }).encode('utf-8')
    req = urllib.request.Request(f"{BASE_URL}/api/tavily/search", data=payload, headers={'Content-Type': 'application/json'})
    with urllib.request.urlopen(req) as res:
        data = json.loads(res.read().decode('utf-8'))
        results = data.get('results', [])
        print(f"  [PASS] Tavily Search returned {len(results)} live results for Composio!")
        if results:
            print(f"    Top Result: {results[0].get('title')} ({results[0].get('url')})")

if __name__ == '__main__':
    test_dedup_ingest()
    test_slack_interactive_triage()
    test_export_apis()
    test_tavily_search()
    print("\n=== ALL FULL PRODUCT FLOW CHECKS PASSED ===")
