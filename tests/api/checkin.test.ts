import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// FR-05: enroll a dog with reference photo embeddings (the actual CLIP
// embedding happens client-side in T12 — this API just stores/compares
// vectors it's given).
// FR-10: at a stop, match a photo embedding against the dogs on that route by
// cosine similarity; above a threshold auto-confirm, below it the walker
// picks manually.
// FR-11: undo the most recent check-in, backed by a Stack.
// Supabase is mocked, same pattern as the rest of tests/api/.

const WALKER_A = { id: "walker-a", email: "walker-a@example.com" };

const mockGetUser = vi.fn();

type DogRow = { id: string; owner_id: string; name: string; embedding: number[] | null };
type RouteRow = { id: string; walker_id: string; stops: { dogId: string }[] };
type CheckinRow = { id: string; route_id: string; dog_id: string; created_at: string };

const dogsStore = new Map<string, DogRow>();
const routesStore = new Map<string, RouteRow>();
const checkinsStore = new Map<string, CheckinRow>();
let nextId = 1;

function makeSingleResult(result: { data: unknown; error: unknown }) {
  return { single: () => Promise.resolve(result) };
}
function makeListResult(result: { data: unknown; error: unknown }) {
  return { then: (resolve: (v: unknown) => void) => resolve(result) };
}

const mockFrom = vi.fn((table: string) => {
  if (table === "dogs") {
    return {
      select: () => ({
        eq: (_col: string, id: string) => {
          const row = dogsStore.get(id) ?? null;
          return makeSingleResult({ data: row, error: null });
        },
        in: (_col: string, ids: string[]) => {
          const rows = ids.map((id) => dogsStore.get(id)).filter(Boolean);
          return makeListResult({ data: rows, error: null });
        },
      }),
      update: (patch: Record<string, unknown>) => ({
        eq: (_col: string, id: string) => ({
          eq: (_ownerCol: string, ownerId: string) => {
            const existing = dogsStore.get(id);
            if (existing === undefined || existing.owner_id !== ownerId) {
              return { select: () => makeSingleResult({ data: null, error: null }) };
            }
            const updated = { ...existing, ...patch } as DogRow;
            dogsStore.set(id, updated);
            return { select: () => makeSingleResult({ data: updated, error: null }) };
          },
        }),
      }),
    };
  }
  if (table === "routes") {
    return {
      select: () => ({
        eq: (_col: string, id: string) => {
          const row = routesStore.get(id) ?? null;
          return makeSingleResult({ data: row, error: null });
        },
      }),
    };
  }
  if (table === "checkins") {
    return {
      select: () => ({
        eq: (_col: string, routeId: string) => ({
          order: () => ({
            limit: () => {
              const rows = [...checkinsStore.values()]
                .filter((c) => c.route_id === routeId)
                .sort((a, b) => b.created_at.localeCompare(a.created_at));
              return makeListResult({ data: rows.slice(0, 1), error: null });
            },
          }),
        }),
      }),
      insert: (row: Record<string, unknown>) => {
        const id = String(nextId++);
        const saved = { id, created_at: new Date().toISOString(), ...row } as CheckinRow;
        checkinsStore.set(id, saved);
        return { select: () => makeSingleResult({ data: saved, error: null }) };
      },
      delete: () => ({
        eq: (_col: string, id: string) => {
          const existed = checkinsStore.delete(id);
          return makeListResult({
            data: existed ? [{ id }] : [],
            error: null,
          });
        },
      }),
    };
  }
  throw new Error(`Unexpected table in test mock: ${table}`);
});

const mockSupabaseClient = {
  auth: { getUser: mockGetUser },
  from: mockFrom,
};

async function importAppModule() {
  return import("../../apps/api/src/app.module.js");
}
async function importSupabaseToken() {
  return import("../../apps/api/src/supabase/supabase.constants.js");
}
function authAs(user: { id: string; email: string }) {
  mockGetUser.mockResolvedValue({ data: { user }, error: null });
}

// Two clearly distinguishable unit vectors (orthogonal-ish) so cosine
// similarity has an unambiguous winner.
const EMBEDDING_DOG_1 = [1, 0, 0, 0];
const EMBEDDING_DOG_2 = [0, 1, 0, 0];

describe("Check-in endpoints (FR-05, FR-10, FR-11)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const { AppModule } = await importAppModule();
    const { SUPABASE_CLIENT } = await importSupabaseToken();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(SUPABASE_CLIENT)
      .useValue(mockSupabaseClient)
      .compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app?.close();
  });

  beforeEach(() => {
    dogsStore.clear();
    routesStore.clear();
    checkinsStore.clear();
    nextId = 1;
    mockGetUser.mockReset();

    dogsStore.set("dog-1", {
      id: "dog-1",
      owner_id: "owner-x",
      name: "Firulais",
      embedding: null,
    });
    dogsStore.set("dog-2", {
      id: "dog-2",
      owner_id: "owner-x",
      name: "Rex",
      embedding: null,
    });
    routesStore.set("route-1", {
      id: "route-1",
      walker_id: WALKER_A.id,
      stops: [{ dogId: "dog-1" }, { dogId: "dog-2" }],
    });
  });

  it("enrolls a dog's reference embedding", async () => {
    authAs({ id: "owner-x", email: "owner-x@example.com" });
    const res = await request(app.getHttpServer())
      .post("/dogs/dog-1/embedding")
      .set("Authorization", "Bearer token-x")
      .send({ embedding: EMBEDDING_DOG_1 });

    expect(res.status).toBe(200);
    expect(res.body.embedding).toEqual(EMBEDDING_DOG_1);
  });

  it("rejects enrolling an embedding for a dog owned by someone else", async () => {
    authAs({ id: "owner-y", email: "owner-y@example.com" });
    const res = await request(app.getHttpServer())
      .post("/dogs/dog-1/embedding")
      .set("Authorization", "Bearer token-y")
      .send({ embedding: EMBEDDING_DOG_1 });

    expect(res.status).toBe(404);
  });

  it("auto-confirms a check-in when similarity is above the threshold", async () => {
    dogsStore.get("dog-1")!.embedding = EMBEDDING_DOG_1;
    dogsStore.get("dog-2")!.embedding = EMBEDDING_DOG_2;

    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes/route-1/checkin")
      .set("Authorization", "Bearer token-a")
      .send({ embedding: EMBEDDING_DOG_1 });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ dogId: "dog-1", autoConfirmed: true });
  });

  it("asks for manual confirmation when no dog on the route is a confident match", async () => {
    dogsStore.get("dog-1")!.embedding = EMBEDDING_DOG_1;
    dogsStore.get("dog-2")!.embedding = EMBEDDING_DOG_2;

    authAs(WALKER_A);
    const ambiguousEmbedding = [0.6, 0.6, 0, 0];
    const res = await request(app.getHttpServer())
      .post("/routes/route-1/checkin")
      .set("Authorization", "Bearer token-a")
      .send({ embedding: ambiguousEmbedding });

    expect(res.status).toBe(200);
    expect(res.body.autoConfirmed).toBe(false);
    expect(res.body.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ dogId: "dog-1" }),
        expect.objectContaining({ dogId: "dog-2" }),
      ]),
    );
  });

  it("rejects checking in on a route owned by another walker", async () => {
    dogsStore.get("dog-1")!.embedding = EMBEDDING_DOG_1;
    routesStore.get("route-1")!.walker_id = "someone-else";

    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes/route-1/checkin")
      .set("Authorization", "Bearer token-a")
      .send({ embedding: EMBEDDING_DOG_1 });

    expect(res.status).toBe(404);
  });

  it("undoes the most recent check-in on a route", async () => {
    dogsStore.get("dog-1")!.embedding = EMBEDDING_DOG_1;
    dogsStore.get("dog-2")!.embedding = EMBEDDING_DOG_2;

    authAs(WALKER_A);
    await request(app.getHttpServer())
      .post("/routes/route-1/checkin")
      .set("Authorization", "Bearer token-a")
      .send({ embedding: EMBEDDING_DOG_1 });

    const res = await request(app.getHttpServer())
      .delete("/routes/route-1/checkin/undo")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);
    expect(checkinsStore.size).toBe(0);
  });

  it("returns 404 undoing when the route has no check-ins", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .delete("/routes/route-1/checkin/undo")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(404);
  });

  it("rejects a check-in request with a malformed embedding", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes/route-1/checkin")
      .set("Authorization", "Bearer token-a")
      .send({ embedding: "not-an-array" });

    expect(res.status).toBe(400);
  });
});
