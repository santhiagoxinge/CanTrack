"""Issue #23 — Technical debt batch.

Four items, each tested here so it fails red for the right reason:

1. Role from ``app_metadata`` (server-side truth), not ``user_metadata``
   (client-editable). A user whose ``app_metadata.role`` is ``"walker"`` must
   be treated as a walker even if ``user_metadata.role`` says ``"owner"``.

2. The monthly AI-quota query uses ``gte``/``lt`` on ``used_at`` at the
   database level instead of reading every row into Python.

3. When a checkout listing returns multiple photos, the storage layer uses a
   single ``create_signed_urls`` batch call instead of N individual
   ``create_signed_url`` calls; ``ai_usage`` rows older than 2 months are
   pruned on every quota check.

4. (Web-side, in ``tests/web/data-protection.test.tsx``.)
"""

from datetime import datetime, timezone

import pytest

from .conftest import bearer, make_user

PNG = bytes([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]) + b"\x00" * 40


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def photo(data: bytes = PNG, name: str = "p.png"):
    return ("image", (name, data, "image/png"))


def save_profile(client, token="token-w"):
    res = client.put(
        "/walker-profile",
        json={
            "displayName": "Nico Walks",
            "bio": "Five years walking packs.",
            "serviceArea": "Laureles",
            "pricePerWalk": 25000,
        },
        headers=bearer(token),
    )
    assert res.status_code == 200
    return res.json()


def create_dog(client, name="Rocky"):
    res = client.post("/dogs", json={"name": name, "breed": "Mixed"}, headers=bearer("token-a"))
    assert res.status_code == 201
    return res.json()


def accepted_request(client, dog_id, requested_time="2026-10-05T10:00:00+00:00"):
    res = client.post(
        "/requests",
        json={
            "walkerId": "walker-w",
            "dogId": dog_id,
            "requestedTime": requested_time,
            "pickupLat": 4.6,
            "pickupLng": -74.08,
        },
        headers=bearer("token-a"),
    )
    assert res.status_code == 201
    rid = res.json()["id"]
    res_accept = client.post(f"/requests/{rid}/accept", headers=bearer("token-w"))
    assert res_accept.status_code == 200
    return rid


# ---------------------------------------------------------------------------
# 1. Role from app_metadata
# ---------------------------------------------------------------------------

class TestRoleFromAppMetadata:
    """The API must read the role from ``app_metadata`` (set server-side at
    sign-up), not from ``user_metadata`` (editable by the user).

    If ``app_metadata.role`` is ``"walker"`` but the user tampered
    ``user_metadata.role`` to ``"owner"``, the endpoint must still treat them
    as a walker.
    """

    @pytest.fixture(autouse=True)
    def _tampered_user(self, fake):
        """Register a user whose app_metadata says walker but user_metadata
        says owner — simulating a malicious client-side edit."""
        fake.add_user(
            "token-tampered",
            make_user(
                user_id="tampered-w",
                email="tampered@example.com",
                role="walker",
                app_metadata={"role": "walker"},
                user_metadata={"role": "owner"},
            ),
        )

    def test_walker_endpoint_succeeds_with_app_metadata_walker(self, fake_client):
        """GET /clients requires walker role. The tampered user's
        app_metadata.role is walker, so this must return 200, not 400."""
        save_profile(fake_client, token="token-tampered")
        res = fake_client.get("/clients", headers=bearer("token-tampered"))
        assert res.status_code == 200
        assert res.json() == []

    def test_owner_endpoint_rejects_app_metadata_walker(self, fake_client):
        """POST /requests requires owner role. The tampered user has
        app_metadata.role='walker' but user_metadata.role='owner'.
        They must be rejected because app_metadata is the authority."""
        save_profile(fake_client)
        dog = fake_client.post(
            "/dogs",
            json={"name": "Buddy", "breed": "Mixed"},
            headers=bearer("token-tampered"),
        ).json()
        res = fake_client.post(
            "/requests",
            json={
                "walkerId": "walker-w",
                "dogId": dog["id"],
                "requestedTime": "2026-10-05T10:00:00+00:00",
                "pickupLat": 4.6,
                "pickupLng": -74.08,
            },
            headers=bearer("token-tampered"),
        )
        assert res.status_code == 400
        assert res.json() == {"detail": "Only owners can create a walk request."}


# ---------------------------------------------------------------------------
# 2. AI quota query uses gte/lt on used_at
# ---------------------------------------------------------------------------

class TestAiQuotaUsesRangeQuery:
    """The ``_ai_used_this_month`` helper must push the date range to the
    database with ``.gte("used_at", start).lt("used_at", end)`` instead of
    fetching every row and filtering in Python.  PostgREST caps responses at
    1 000 rows, so the in-memory approach breaks at scale.
    """

    def test_quota_query_includes_gte_and_lt_filters(self, fake_client, fake):
        """After checking the quota (GET /ai-quota), the fake's
        ``range_queries`` must contain a select on ``ai_usage`` with both
        ``gte`` and ``lt`` operators on ``used_at``."""
        save_profile(fake_client)
        fake.range_queries.clear()

        res = fake_client.get("/ai-quota", headers=bearer("token-w"))
        assert res.status_code == 200

        ai_usage_range_queries = [
            rq for rq in fake.range_queries
            if rq[0] == "ai_usage" and rq[1] == "select"
        ]
        assert len(ai_usage_range_queries) >= 1, (
            "Expected at least one ai_usage select with range filters, "
            f"got {fake.range_queries}"
        )

        range_filters = ai_usage_range_queries[0][3]
        ops = {rf[0] for rf in range_filters}
        assert "gte" in ops, f"Missing gte filter, got {range_filters}"
        assert "lt" in ops, f"Missing lt filter, got {range_filters}"

    def test_checkout_creation_uses_range_query_for_quota(
        self, fake_client, fake
    ):
        """POST /requests/{id}/checkout also counts the monthly quota.
        The query must use gte/lt range filters, not fetch all rows."""
        save_profile(fake_client)
        dog = create_dog(fake_client)
        rid = accepted_request(fake_client, dog["id"])
        fake.range_queries.clear()

        res = fake_client.post(
            f"/requests/{rid}/checkout",
            files=[photo()],
            headers=bearer("token-w"),
        )
        assert res.status_code == 201

        ai_usage_range_queries = [
            rq for rq in fake.range_queries
            if rq[0] == "ai_usage" and rq[1] == "select"
        ]
        assert len(ai_usage_range_queries) >= 1, (
            "Expected at least one ai_usage range query during checkout creation"
        )
        range_filters = ai_usage_range_queries[0][3]
        ops = {rf[0] for rf in range_filters}
        assert "gte" in ops and "lt" in ops


# ---------------------------------------------------------------------------
# 3. Batch signed URLs and ai_usage pruning
# ---------------------------------------------------------------------------

class TestBatchSignedUrls:
    """When a checkout has multiple photos, the API must sign them all in
    one ``create_signed_urls`` batch call, not N individual calls."""

    def _checkout_with_photos(self, fake_client, n_photos=3):
        save_profile(fake_client)
        dog = create_dog(fake_client)
        rid = accepted_request(fake_client, dog["id"])
        files = [
            ("image", (f"p{i}.png", PNG, "image/png"))
            for i in range(n_photos)
        ]
        res = fake_client.post(
            f"/requests/{rid}/checkout",
            files=files,
            headers=bearer("token-w"),
        )
        assert res.status_code == 201
        return res.json()

    def test_listing_uses_batch_sign_not_individual(self, fake_client, fake):
        """GET /checkouts with a sent checkout whose photos exist should
        use a single batch_sign call, not one sign call per photo."""
        checkout = self._checkout_with_photos(fake_client, n_photos=3)
        res = fake_client.post(
            f"/checkouts/{checkout['id']}/send", headers=bearer("token-w")
        )
        assert res.status_code == 200

        fake.storage.calls.clear()
        res = fake_client.get("/checkouts", headers=bearer("token-w"))
        assert res.status_code == 200

        batch_calls = [c for c in fake.storage.calls if c[1] == "batch_sign"]
        individual_sign_calls = [c for c in fake.storage.calls if c[1] == "sign"]

        assert len(batch_calls) >= 1, (
            f"Expected batch_sign calls, got only individual signs: {fake.storage.calls}"
        )
        assert len(individual_sign_calls) == 0, (
            f"Expected no individual sign calls when batch is available, got {individual_sign_calls}"
        )


class TestAiUsagePruning:
    """``ai_usage`` rows older than 2 months must be pruned to keep the
    table lean. The pruning runs as a side-effect of the quota check."""

    def test_old_usage_rows_are_deleted(self, fake_client, fake, fake_clock):
        """Seed an ai_usage row 3 months old, then trigger a quota check.
        The old row must be deleted."""
        save_profile(fake_client)
        # Seed an old ai_usage row (3 months ago)
        old_time = datetime(2026, 7, 1, 12, 0, 0, tzinfo=timezone.utc)
        fake.seed("ai_usage", walker_id="walker-w", used_at=old_time.isoformat())

        # Also seed a recent one that must NOT be pruned
        recent_time = datetime(2026, 10, 1, 12, 0, 0, tzinfo=timezone.utc)
        fake.seed("ai_usage", walker_id="walker-w", used_at=recent_time.isoformat())

        before = len(fake.tables.get("ai_usage", []))
        assert before == 2

        # Trigger quota check
        res = fake_client.get("/ai-quota", headers=bearer("token-w"))
        assert res.status_code == 200

        after = len(fake.tables.get("ai_usage", []))
        assert after == 1, (
            f"Expected the 3-month-old row to be pruned, but {after} rows remain"
        )
        # The surviving row must be the recent one
        remaining = fake.tables["ai_usage"][0]
        assert "2026-10" in remaining["used_at"]
