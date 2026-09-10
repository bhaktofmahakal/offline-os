import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv('u:/offline-os/.env')
url = os.getenv('SUPABASE_URL')
key = os.getenv('SUPABASE_SERVICE_ROLE_KEY')
supabase = create_client(url, key)

p_count = supabase.table('people').select('id', count='exact').execute()
i_count = supabase.table('introductions').select('id', count='exact').execute()
dups = supabase.table('people').select('id, name, company, is_duplicate_of, duplicate_confidence').not_.is_('is_duplicate_of', 'null').execute()

print(f"People count in Supabase: {p_count.count}")
print(f"Introductions count in Supabase: {i_count.count}")
print(f"Duplicates flagged in DB: {len(dups.data)}")
for d in dups.data:
    print(f"  Duplicate: {d['name']} ({d['company']}) -> is_duplicate_of: {d['is_duplicate_of']} (confidence: {d['duplicate_confidence']})")

sample_people = supabase.table('people').select('id, name, company, role_title, fit_score, email').limit(10).execute()
print("\nSample 10 Real People in DB:")
for sp in sample_people.data:
    print(f"  ID {sp['id']}: {sp['name']} | {sp['company']} | {sp['role_title']} | Fit Score: {sp['fit_score']} | Email: {sp['email']}")

sample_intros = supabase.table('introductions').select('id, person_a_id, person_b_id, shared_context, match_score, status').limit(5).execute()
print("\nSample 5 Introductions in DB:")
for si in sample_intros.data:
    print(f"  Intro #{si['id']}: Person {si['person_a_id']} <-> Person {si['person_b_id']} | Synergy: {si['shared_context']} | Score: {si['match_score']} | Status: {si['status']}")
