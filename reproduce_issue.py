import asyncio
import httpx
import urllib.parse

# The URL from the log, with encoded spaces
raw_query_url = "https://ucamqctnymoxmxzodizj.supabase.co/storage/v1/object/public/generated_models/Mini%20Drone%20Reconnaissance/model.sdf"
# This is what valid header would look like for a spaced file:
# .../Mini%20Drone%20Reconnaissance/model.sdf

async def test_proxy_behavior(url):
    print(f"Testing URL: {url}")
    async with httpx.AsyncClient() as client:
        try:
            # mimic proxy implementation
            resp = await client.get(url, follow_redirects=True, timeout=30.0)
            print(f"Status: {resp.status_code}")
            print(f"Headers: {resp.headers}")
            if resp.status_code >= 400:
                print(f"Error content: {resp.text[:200]}")
        except Exception as e:
            print(f"Exception: {e}")

async def main():
    print("--- Test 1: URL with %20 ---")
    await test_proxy_behavior(raw_query_url)

    print("\n--- Test 2: URL decoded (with spaces) ---")
    decoded_url = urllib.parse.unquote(raw_query_url) # "Mini Drone Reconnaissance"
    await test_proxy_behavior(decoded_url)
    
    print("\n--- Test 3: URL encoded again (double encoded) ---")
    # mimicking if something double encodes it
    double_encoded = urllib.parse.quote(raw_query_url, safe=":/")
    await test_proxy_behavior(double_encoded)

if __name__ == "__main__":
    asyncio.run(main())
