import asyncio
from backend.database import supabase

async def test_count():
    print(dir(supabase.table("users")))
    res = supabase.table("users").select("id").limit(1).execute()
    print("Has count?", hasattr(res, 'count'))

asyncio.run(test_count())
