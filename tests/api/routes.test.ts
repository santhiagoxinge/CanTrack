import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// FR-06/07: a walker creates a route as an ordered sequence of stops and can
// reorder or remove a stop before it starts (backed by SinglyLinkedList).
// FR-08: next scheduled pickup across the walker's active routes, backed by
// an AVL tree keyed by pickup time.
// FR-09: pickup path for a route's stops over a street graph, backed by
// WeightedGraph + Dijkstra.
// Supabase is mocked, same pattern as auth.test.ts / dogs.test.ts.

const WALKER_A = { id: "walker-a", email: "walker-a@example.com" };
const WALKER_B = { id: "walker-b", email: "walker-b@example.com" };

const mockGetUser = vi.fn();

type RouteRow = {
  id: string;
  walker_id: string;
  stops: { dog_id: string; pickup_time: string }[];
};

type DogRow = {
  id: string;
  name: string;
};

const routesStore = new Map<string, RouteRow>();
const dogsStore = new Map<string, DogRow>();
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
        in: (_col: string, ids: string[]) => {
          const rows = ids.map((id) => dogsStore.get(id)).filter(Boolean);
          return makeListResult({ data: rows, error: null });
        },
      }),
    };
  }
  if (table !== "routes") {
    throw new Error(`Unexpected table in test mock: ${table}`);
  }
  return {
    select: () => ({
      eq: (_col: string, walkerId: string) => {
        const rows = [...routesStore.values()].filter((r) => r.walker_id === walkerId);
        return {
          then: (resolve: (v: unknown) => void) => resolve({ data: rows, error: null }),
        };
      },
    }),
    insert: (row: Record<string, unknown>) => {
      const id = String(nextId++);
      const saved = { id, ...row } as RouteRow;
      routesStore.set(id, saved);
      return { select: () => makeSingleResult({ data: saved, error: null }) };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => ({
        eq: (_walkerCol: string, walkerId: string) => {
          const existing = routesStore.get(id);
          if (existing === undefined || existing.walker_id !== walkerId) {
            return { select: () => makeSingleResult({ data: null, error: null }) };
          }
          const updated = { ...existing, ...patch } as RouteRow;
          routesStore.set(id, updated);
          return { select: () => makeSingleResult({ data: updated, error: null }) };
        },
      }),
    }),
  };
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

describe("Routes endpoints (FR-06, FR-07, FR-08, FR-09)", () => {
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
    routesStore.clear();
    dogsStore.clear();
    nextId = 1;
    mockGetUser.mockReset();
  });

  it("rejects requests with no bearer token", async () => {
    const res = await request(app.getHttpServer()).get("/routes");
    expect(res.status).toBe(401);
  });

  it("creates a route as an ordered sequence of stops", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [
          { dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" },
          { dogId: "dog-2", pickupTime: "2026-10-01T08:15:00.000Z" },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.stops).toEqual([
      { dogId: "dog-1", dogName: null, pickupTime: "2026-10-01T08:00:00.000Z" },
      { dogId: "dog-2", dogName: null, pickupTime: "2026-10-01T08:15:00.000Z" },
    ]);
  });

  it("rejects a route with an empty stop list", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({ stops: [] });

    expect(res.status).toBe(400);
  });

  // Regression test (2026-09-24): GET /routes/:id (singular) was missing entirely — only
  // GET /routes (the list) existed. apps/web's WalkerRouteScreen calls fetchRoute(routeId),
  // which hits this endpoint, and it 404'd on every real route open even though the route
  // existed. Neither T9's test (mocks Supabase, never calls this route) nor T13's test
  // (mocks fetchRoute itself) exercised the real endpoint end to end.
  it("fetches a single route the walker owns", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" }],
      });

    const res = await request(app.getHttpServer())
      .get(`/routes/${created.body.id}`)
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      id: created.body.id,
      stops: [{ dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" }],
    });
  });

  // Regression test (2026-09-24): a route's stops only ever carried dogId, never the dog's
  // name, so apps/web's WalkerRouteScreen (which falls back to stop.dogId when dogName is
  // missing) always showed the raw UUID instead of a name. Surfaced when Nico actually
  // opened a route in the browser — no test exercised the real dog-name enrichment.
  it("enriches each stop with the referenced dog's name", async () => {
    dogsStore.set("dog-1", { id: "dog-1", name: "Firulais" });
    dogsStore.set("dog-2", { id: "dog-2", name: "Rex" });

    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [
          { dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" },
          { dogId: "dog-2", pickupTime: "2026-10-01T08:15:00.000Z" },
        ],
      });

    expect(created.body.stops).toEqual([
      { dogId: "dog-1", dogName: "Firulais", pickupTime: "2026-10-01T08:00:00.000Z" },
      { dogId: "dog-2", dogName: "Rex", pickupTime: "2026-10-01T08:15:00.000Z" },
    ]);

    const fetched = await request(app.getHttpServer())
      .get(`/routes/${created.body.id}`)
      .set("Authorization", "Bearer token-a");

    expect(fetched.body.stops).toEqual(created.body.stops);

    const listed = await request(app.getHttpServer())
      .get("/routes")
      .set("Authorization", "Bearer token-a");

    expect(listed.body[0].stops).toEqual(created.body.stops);
  });

  it("falls back to null dogName for a stop whose dog no longer exists", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "deleted-dog", pickupTime: "2026-10-01T08:00:00.000Z" }],
      });

    expect(created.body.stops).toEqual([
      { dogId: "deleted-dog", dogName: null, pickupTime: "2026-10-01T08:00:00.000Z" },
    ]);
  });

  it("returns 404 fetching a route owned by someone else", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" }],
      });

    authAs(WALKER_B);
    const res = await request(app.getHttpServer())
      .get(`/routes/${created.body.id}`)
      .set("Authorization", "Bearer token-b");

    expect(res.status).toBe(404);
  });

  it("returns 404 fetching a route id that doesn't exist", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .get("/routes/does-not-exist")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(404);
  });

  it("reorders a route's stops before it starts", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [
          { dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" },
          { dogId: "dog-2", pickupTime: "2026-10-01T08:15:00.000Z" },
        ],
      });

    const res = await request(app.getHttpServer())
      .patch(`/routes/${created.body.id}/stops/reorder`)
      .set("Authorization", "Bearer token-a")
      .send({ order: [1, 0] });

    expect(res.status).toBe(200);
    expect(res.body.stops.map((s: { dogId: string }) => s.dogId)).toEqual([
      "dog-2",
      "dog-1",
    ]);
  });

  it("removes a stop from a route before it starts", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [
          { dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" },
          { dogId: "dog-2", pickupTime: "2026-10-01T08:15:00.000Z" },
        ],
      });

    const res = await request(app.getHttpServer())
      .delete(`/routes/${created.body.id}/stops/0`)
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);
    expect(res.body.stops).toEqual([
      { dogId: "dog-2", pickupTime: "2026-10-01T08:15:00.000Z" },
    ]);
  });

  it("rejects reordering a route owned by someone else", async () => {
    authAs(WALKER_A);
    const created = await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "dog-1", pickupTime: "2026-10-01T08:00:00.000Z" }],
      });

    authAs(WALKER_B);
    const res = await request(app.getHttpServer())
      .patch(`/routes/${created.body.id}/stops/reorder`)
      .set("Authorization", "Bearer token-b")
      .send({ order: [0] });

    expect(res.status).toBe(404);
  });

  it("returns the earliest next pickup across the walker's routes", async () => {
    authAs(WALKER_A);
    await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "dog-1", pickupTime: "2026-10-01T09:00:00.000Z" }],
      });
    await request(app.getHttpServer())
      .post("/routes")
      .set("Authorization", "Bearer token-a")
      .send({
        stops: [{ dogId: "dog-2", pickupTime: "2026-10-01T08:00:00.000Z" }],
      });

    const res = await request(app.getHttpServer())
      .get("/routes/next-pickup")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      dogId: "dog-2",
      pickupTime: "2026-10-01T08:00:00.000Z",
    });
  });

  it("returns 404 for next-pickup when the walker has no routes", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .get("/routes/next-pickup")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(404);
  });

  it("computes the shortest pickup path over a provided street graph", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes/path")
      .set("Authorization", "Bearer token-a")
      .send({
        edges: [
          { from: "home", to: "dog-1", weight: 4 },
          { from: "dog-1", to: "dog-2", weight: 3 },
          { from: "home", to: "dog-2", weight: 9 },
        ],
        start: "home",
        end: "dog-2",
      });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ distance: 7, path: ["home", "dog-1", "dog-2"] });
  });

  it("returns 400 when the path request has no route between the nodes", async () => {
    authAs(WALKER_A);
    const res = await request(app.getHttpServer())
      .post("/routes/path")
      .set("Authorization", "Bearer token-a")
      .send({
        edges: [{ from: "home", to: "dog-1", weight: 4 }],
        start: "home",
        end: "island",
      });

    expect(res.status).toBe(400);
  });
});
