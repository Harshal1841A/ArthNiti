"""ArthNiti — Load Smoke Test (Task 8).

Sends N concurrent scoring requests to the live backend and reports:
- Total time
- p50 / p95 / p99 latencies
- Pass/fail count
- Throughput (req/s)

Usage:
    python scripts/load_smoke_test.py [--n 50] [--concurrency 10] [--url http://localhost:8000]

Prerequisite: Backend must be running with demo data seeded.
    uvicorn backend.main:app --reload --port 8000
    curl -X POST http://localhost:8000/api/v1/demo/seed
"""

import argparse
import asyncio
import statistics
import time

import httpx

DEFAULT_URL = "http://localhost:8000"
DEMO_KEY = "Bearer DEMO_SECRET_KEY_123"
HEADERS = {"Authorization": DEMO_KEY}

# Applicant IDs for which normalized features exist (from demo seed)
DEMO_APPLICANT_IDS = ["APP-RAMESH", "APP-PRIYA", "APP-VIKRAM", "APP-ANITA", "APP-SURESH"]


async def score_one(client: httpx.AsyncClient, applicant_id: str, base_url: str) -> dict:
    """Fire a score request and return timing + result."""
    url = f"{base_url}/api/v1/score/{applicant_id}"
    t0 = time.perf_counter()
    try:
        resp = await client.post(url, headers=HEADERS, timeout=10.0)
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "applicant_id": applicant_id,
            "status": resp.status_code,
            "ok": 200 <= resp.status_code < 300,
            "elapsed_ms": elapsed_ms,
        }
    except Exception as e:
        elapsed_ms = (time.perf_counter() - t0) * 1000
        return {
            "applicant_id": applicant_id,
            "status": -1,
            "ok": False,
            "elapsed_ms": elapsed_ms,
            "error": str(e),
        }


async def run_load_test(base_url: str, n: int, concurrency: int):
    """Run N requests across DEMO_APPLICANT_IDS with `concurrency` at a time."""

    # First seed demo data
    print(f"Seeding demo data at {base_url} ...")
    async with httpx.AsyncClient() as seed_client:
        try:
            r = await seed_client.post(f"{base_url}/api/v1/demo/seed", timeout=30.0)
            if r.status_code not in (200, 403):
                print(f"  Warning: seed returned {r.status_code}: {r.text[:200]}")
            else:
                print(f"  Seed: {r.status_code}")
        except Exception as e:
            print(f"  Seed error (may already be seeded): {e}")

    # Build work list
    ids = [DEMO_APPLICANT_IDS[i % len(DEMO_APPLICANT_IDS)] for i in range(n)]

    semaphore = asyncio.Semaphore(concurrency)
    results = []
    t_start = time.perf_counter()

    async with httpx.AsyncClient() as client:
        async def bounded(app_id: str):
            async with semaphore:
                r = await score_one(client, app_id, base_url)
                results.append(r)

        await asyncio.gather(*[bounded(aid) for aid in ids])

    total_s = time.perf_counter() - t_start

    # Analyze
    latencies = [r["elapsed_ms"] for r in results]
    passed = [r for r in results if r["ok"]]
    failed = [r for r in results if not r["ok"]]

    latencies_sorted = sorted(latencies)
    p50 = statistics.median(latencies_sorted)
    p95 = latencies_sorted[int(len(latencies_sorted) * 0.95)]
    p99 = latencies_sorted[int(len(latencies_sorted) * 0.99)]

    print("\n" + "=" * 50)
    print("LOAD SMOKE TEST RESULTS")
    print("=" * 50)
    print(f"  Requests:     {n}")
    print(f"  Concurrency:  {concurrency}")
    print(f"  Total time:   {total_s:.2f}s")
    print(f"  Throughput:   {n / total_s:.1f} req/s")
    print(f"  Pass / Fail:  {len(passed)} / {len(failed)}")
    print(f"  Latency p50:  {p50:.1f}ms")
    print(f"  Latency p95:  {p95:.1f}ms")
    print(f"  Latency p99:  {p99:.1f}ms")

    if failed:
        print(f"\n  FAILURES ({len(failed)}):")
        for f in failed[:5]:
            print(f"    {f}")

    # Smoke test gate: 95% pass rate, p95 < 2000ms
    pass_rate = len(passed) / n
    if pass_rate < 0.95:
        print(f"\n  [FAIL] Pass rate {pass_rate:.0%} is below 95% gate.")
        return False
    if p95 > 2000:
        print(f"\n  [FAIL] p95 latency {p95:.0f}ms exceeds 2000ms gate.")
        return False

    print(f"\n  [PASS] All gates met (≥95% pass, p95 < 2000ms).")
    return True


def main():
    parser = argparse.ArgumentParser(description="ArthNiti load smoke test")
    parser.add_argument("--n", type=int, default=50, help="Total requests to send")
    parser.add_argument("--concurrency", type=int, default=10, help="Max concurrent requests")
    parser.add_argument("--url", type=str, default=DEFAULT_URL, help="Backend base URL")
    args = parser.parse_args()

    print(f"ArthNiti Load Smoke Test")
    print(f"  URL:         {args.url}")
    print(f"  N:           {args.n}")
    print(f"  Concurrency: {args.concurrency}")
    print()

    ok = asyncio.run(run_load_test(args.url, args.n, args.concurrency))
    exit(0 if ok else 1)


if __name__ == "__main__":
    main()
