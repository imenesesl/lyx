import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import authRoutes from "../src/routes/auth.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  return app;
}

describe("Auth API", () => {
  let app: express.Express;

  beforeEach(() => {
    app = createApp();
  });

  it("POST /api/auth/register - creates a new account", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com", password: "Pass1234!", name: "Test" });

    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.account.email).toBe("test@example.com");
  });

  it("POST /api/auth/register - rejects missing fields", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "test@example.com" });

    expect(res.status).toBe(400);
  });

  it("POST /api/auth/register - rejects duplicate email", async () => {
    const data = { email: "dup@example.com", password: "Pass1234!", name: "Dup" };
    await request(app).post("/api/auth/register").send(data);

    const res = await request(app).post("/api/auth/register").send(data);
    expect(res.status).toBe(409);
  });

  it("POST /api/auth/login - returns token for valid credentials", async () => {
    const data = { email: "login@example.com", password: "Pass1234!", name: "Login" };
    await request(app).post("/api/auth/register").send(data);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "login@example.com", password: "Pass1234!" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("POST /api/auth/login - rejects wrong password", async () => {
    const data = { email: "wrong@example.com", password: "Pass1234!", name: "Wrong" };
    await request(app).post("/api/auth/register").send(data);

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "wrong@example.com", password: "BadPassword" });

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login - rejects non-existent email", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@example.com", password: "Pass1234!" });

    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me - rejects unauthenticated requests", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });

  it("GET /api/auth/me - returns account for authenticated user", async () => {
    const reg = await request(app)
      .post("/api/auth/register")
      .send({ email: "me@example.com", password: "Pass1234!", name: "Me" });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${reg.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.email).toBe("me@example.com");
  });
});
