import json
from supabase import create_client

sb = create_client(
    'https://bqdkcaacqsedmxeiroyw.supabase.co',
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxZGtjYWFjcXNlZG14ZWlyb3l3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MTE4Mzg1OSwiZXhwIjoyMTA2NzU5ODU5fQ.HeMfwfap_TuQEkAyM0UUszrLQ2q9IXCCmDVgie_fAW0'
)

# List existing users
users = sb.auth.admin.list_users()
print("=== Existing Users ===")
for u in users:
    print(f"  {u.email} | confirmed={u.email_confirmed_at is not None} | id={u.id}")

# If there's an unconfirmed user, confirm them
for u in users:
    if u.email_confirmed_at is None and u.email:
        print(f"\nConfirming user: {u.email}")
        sb.auth.admin.update_user_by_id(u.id, {"email_confirm": True})
        print(f"  Confirmed!")

# If no users exist, create a test user
if not users:
    print("\nNo users found. Creating test admin...")
    result = sb.auth.admin.create_user({
        "email": "admin@hrmstest.com",
        "password": "Test@12345",
        "email_confirm": True,
        "user_metadata": {"full_name": "HRMS Admin"}
    })
    print(f"  Created: {result.user.email} | id={result.user.id}")

print("\nDone!")
