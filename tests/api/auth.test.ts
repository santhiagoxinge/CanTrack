import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";

// FR-01/02/03: sign up (walker or owner), log in, request a password reset.
// Supabase itself is mocked — this suite tests CanTrack's own API surface and
// validation, not Supabase's behavior. The mock is injected through the
// SUPABASE_CLIENT token the app must provide (see AGENTS.md: apps/api/src
// wires this up; tests/ only supplies the fake).
const mockSignUp = vi.fn();
const mockSignInWithPassword = vi.fn();
const mockResetPasswordForEmail = vi.fn();

const mockSupabaseClient = {
  auth: {
    signUp: mockSignUp,
    signInWithPassword: mockSignInWithPassword,
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
};

// The app module and the DI token it expects for the Supabase client. Written
// against the interface the API is required to expose (see docs/REQUIREMENTS.md
// FR-01..03); Space Bunny builds apps/api/src/app.module.ts to satisfy this.
async function importAppModule() {
  return import("../../apps/api/src/app.module.js");
}

async function importSupabaseToken() {
  return import("../../apps/api/src/supabase/supabase.constants.js");
}

describe("Auth endpoints (FR-01, FR-02, FR-03)", () => {
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

  it("POST /auth/signup with a walker role creates an account", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "user-1", email: "walker@example.com" } },
      error: null,
    });

    const res = await request(app.getHttpServer()).post("/auth/signup").send({
      email: "walker@example.com",
      password: "correct horse battery staple",
      role: "walker",
    });

    expect(res.status).toBe(201);
    expect(mockSignUp).toHaveBeenCalledWith(
      expect.objectContaining({ email: "walker@example.com" }),
    );
  });

  it("POST /auth/signup with an owner role creates an account", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: { id: "user-2", email: "owner@example.com" } },
      error: null,
    });

    const res = await request(app.getHttpServer()).post("/auth/signup").send({
      email: "owner@example.com",
      password: "correct horse battery staple",
      role: "owner",
    });

    expect(res.status).toBe(201);
  });

  it("POST /auth/signup rejects a role outside walker/owner", async () => {
    const res = await request(app.getHttpServer()).post("/auth/signup").send({
      email: "someone@example.com",
      password: "correct horse battery staple",
      role: "admin",
    });

    expect(res.status).toBe(400);
    expect(mockSignUp).not.toHaveBeenCalledWith(
      expect.objectContaining({ email: "someone@example.com" }),
    );
  });

  it("POST /auth/signup rejects a missing email", async () => {
    const res = await request(app.getHttpServer()).post("/auth/signup").send({
      password: "correct horse battery staple",
      role: "walker",
    });

    expect(res.status).toBe(400);
  });

  it("POST /auth/signup surfaces a Supabase error as 400", async () => {
    mockSignUp.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "User already registered" },
    });

    const res = await request(app.getHttpServer()).post("/auth/signup").send({
      email: "dup@example.com",
      password: "correct horse battery staple",
      role: "walker",
    });

    expect(res.status).toBe(400);
  });

  it("POST /auth/login with correct credentials returns a session", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: {
        session: { access_token: "token-abc" },
        user: { id: "user-1", email: "walker@example.com" },
      },
      error: null,
    });

    const res = await request(app.getHttpServer()).post("/auth/login").send({
      email: "walker@example.com",
      password: "correct horse battery staple",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("access_token", "token-abc");
  });

  it("POST /auth/login with wrong credentials returns 401", async () => {
    mockSignInWithPassword.mockResolvedValueOnce({
      data: { session: null, user: null },
      error: { message: "Invalid login credentials" },
    });

    const res = await request(app.getHttpServer()).post("/auth/login").send({
      email: "walker@example.com",
      password: "wrong password",
    });

    expect(res.status).toBe(401);
  });

  it("POST /auth/reset-password sends a reset email for a known address", async () => {
    mockResetPasswordForEmail.mockResolvedValueOnce({ data: {}, error: null });

    const res = await request(app.getHttpServer())
      .post("/auth/reset-password")
      .send({ email: "walker@example.com" });

    expect(res.status).toBe(200);
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      "walker@example.com",
      expect.anything(),
    );
  });

  it("POST /auth/reset-password rejects a missing email", async () => {
    const res = await request(app.getHttpServer())
      .post("/auth/reset-password")
      .send({});

    expect(res.status).toBe(400);
  });
});
