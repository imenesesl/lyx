import { describe, it, expect, beforeEach } from "vitest";
import express from "express";
import request from "supertest";
import authRoutes from "../src/routes/auth.js";
import mfesRoutes from "../src/routes/mfes.js";

function createApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use("/api/mfes", mfesRoutes);
  return app;
}

async function registerAndGetToken(app: express.Express, email = "user@example.com") {
  const res = await request(app)
    .post("/api/auth/register")
    .send({ email, password: "Pass1234!", name: "Test" });
  return res.body.token as string;
}

describe("MFEs API", () => {
  let app: express.Express;
  let token: string;

  beforeEach(async () => {
    app = createApp();
    token = await registerAndGetToken(app);
  });

  it("POST /api/mfes - creates an MFE", async () => {
    const res = await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "test-mfe", description: "A test MFE" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("test-mfe");
  });

  it("GET /api/mfes - lists own MFEs only", async () => {
    await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "my-mfe" });

    const token2 = await registerAndGetToken(app, "other@example.com");
    await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token2}`)
      .send({ name: "other-mfe" });

    const res = await request(app)
      .get("/api/mfes")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe("my-mfe");
  });

  it("GET /api/mfes/:id - rejects access to another tenant's MFE", async () => {
    const token2 = await registerAndGetToken(app, "tenant2@example.com");
    const create = await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token2}`)
      .send({ name: "secret-mfe" });

    const res = await request(app)
      .get(`/api/mfes/${create.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("GET /api/mfes/:id/versions - rejects access to another tenant's MFE versions", async () => {
    const token2 = await registerAndGetToken(app, "t2@example.com");
    const create = await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token2}`)
      .send({ name: "locked-mfe" });

    const res = await request(app)
      .get(`/api/mfes/${create.body._id}/versions`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it("PUT /api/mfes/:id - archives and unarchives an MFE", async () => {
    const create = await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "archive-test" });

    const archive = await request(app)
      .put(`/api/mfes/${create.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ archived: true });

    expect(archive.status).toBe(200);
    expect(archive.body.archived).toBe(true);

    const unarchive = await request(app)
      .put(`/api/mfes/${create.body._id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ archived: false });

    expect(unarchive.status).toBe(200);
    expect(unarchive.body.archived).toBe(false);
  });

  it("DELETE /api/mfes/:id - deletes own MFE", async () => {
    const create = await request(app)
      .post("/api/mfes")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "deletable" });

    const res = await request(app)
      .delete(`/api/mfes/${create.body._id}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);
  });

  it("Rejects unauthenticated access", async () => {
    const res = await request(app).get("/api/mfes");
    expect(res.status).toBe(401);
  });
});
