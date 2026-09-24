import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// FR-04: an owner can create, read, update, and delete their own dogs.
// Supabase is mocked (same pattern as tests/api/auth.test.ts): this suite
// tests CanTrack's own routing/ownership/validation, not Supabase itself.
// Every request carries a bearer token; SupabaseAuthGuard resolves it to a
// user via mockGetUser, and the dogs endpoints must scope every query to
// that user's own rows.

const OWNER_A = { id: "owner-a", email: "owner-a@example.com" };
const OWNER_B = { id: "owner-b", email: "owner-b@example.com" };

const mockGetUser = vi.fn();

// A minimal fake of the Supabase query-builder chain the dogs module needs:
// .from("dogs").select()/.insert()/.update()/.delete(), each further
// chainable with .eq(...) and terminating in a promise-like result.
function makeQueryResult(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {};
  const self = new Proxy(chain, {
    get(_target, prop) {
      if (prop === "then") {
        return (resolve: (v: unknown) => void) => resolve(result);
      }
      if (prop === "single") {
        return () => Promise.resolve(result);
      }
      return () => self;
    },
  });
  return self;
}

const dogsStore = new Map<string, Record<string, unknown>>();
let nextId = 1;

const mockFrom = vi.fn((table: string) => {
  if (table !== "dogs") {
    throw new Error(`Unexpected table in test mock: ${table}`);
  }
  return {
    select: () => ({
      eq: (_col: string, ownerId: string) => {
        const rows = [...dogsStore.values()].filter((d) => d.owner_id === ownerId);
        return makeQueryResult({ data: rows, error: null });
      },
    }),
    insert: (row: Record<string, unknown>) => {
      const id = String(nextId++);
      const saved = { id, ...row };
      dogsStore.set(id, saved);
      return {
        select: () => ({
          single: () => Promise.resolve({ data: saved, error: null }),
        }),
      };
    },
    update: (patch: Record<string, unknown>) => ({
      eq: (_col: string, id: string) => ({
        eq: (_ownerCol: string, ownerId: string) => {
          const existing = dogsStore.get(id);
          if (existing === undefined || existing.owner_id !== ownerId) {
            return {
              select: () => ({
                single: () => Promise.resolve({ data: null, error: null }),
              }),
            };
          }
          const updated = { ...existing, ...patch };
          dogsStore.set(id, updated);
          return {
            select: () => ({
              single: () => Promise.resolve({ data: updated, error: null }),
            }),
          };
        },
      }),
    }),
    delete: () => ({
      eq: (_col: string, id: string) => ({
        eq: (_ownerCol: string, ownerId: string) => {
          const existing = dogsStore.get(id);
          const owned = existing !== undefined && existing.owner_id === ownerId;
          if (owned) {
            dogsStore.delete(id);
          }
          return makeQueryResult({ data: owned ? [existing] : [], error: null });
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

describe("Dogs endpoints (FR-04)", () => {
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
    nextId = 1;
    mockGetUser.mockReset();
  });

  it("rejects requests with no bearer token", async () => {
    const res = await request(app.getHttpServer()).get("/dogs");
    expect(res.status).toBe(401);
  });

  it("creates a dog for the authenticated owner", async () => {
    authAs(OWNER_A);
    const res = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed", notes: "Loves the park" });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: "Firulais", breed: "Mixed" });
  });

  it("rejects creating a dog with no name", async () => {
    authAs(OWNER_A);
    const res = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ breed: "Mixed" });

    expect(res.status).toBe(400);
  });

  it("lists only the authenticated owner's dogs", async () => {
    authAs(OWNER_A);
    await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed" });

    authAs(OWNER_B);
    await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-b")
      .send({ name: "Rex", breed: "Labrador" });

    authAs(OWNER_A);
    const res = await request(app.getHttpServer())
      .get("/dogs")
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0]).toMatchObject({ name: "Firulais" });
  });

  it("updates a dog owned by the requester", async () => {
    authAs(OWNER_A);
    const created = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed" });

    const res = await request(app.getHttpServer())
      .patch(`/dogs/${created.body.id}`)
      .set("Authorization", "Bearer token-a")
      .send({ notes: "Now afraid of skateboards" });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ notes: "Now afraid of skateboards" });
  });

  it("rejects updating a dog owned by someone else", async () => {
    authAs(OWNER_A);
    const created = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed" });

    authAs(OWNER_B);
    const res = await request(app.getHttpServer())
      .patch(`/dogs/${created.body.id}`)
      .set("Authorization", "Bearer token-b")
      .send({ notes: "Trying to rename someone else's dog" });

    expect(res.status).toBe(404);
  });

  it("deletes a dog owned by the requester", async () => {
    authAs(OWNER_A);
    const created = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed" });

    const res = await request(app.getHttpServer())
      .delete(`/dogs/${created.body.id}`)
      .set("Authorization", "Bearer token-a");

    expect(res.status).toBe(200);

    const listAfter = await request(app.getHttpServer())
      .get("/dogs")
      .set("Authorization", "Bearer token-a");
    expect(listAfter.body).toHaveLength(0);
  });

  it("rejects deleting a dog owned by someone else", async () => {
    authAs(OWNER_A);
    const created = await request(app.getHttpServer())
      .post("/dogs")
      .set("Authorization", "Bearer token-a")
      .send({ name: "Firulais", breed: "Mixed" });

    authAs(OWNER_B);
    const res = await request(app.getHttpServer())
      .delete(`/dogs/${created.body.id}`)
      .set("Authorization", "Bearer token-b");

    expect(res.status).toBe(404);
  });
});
