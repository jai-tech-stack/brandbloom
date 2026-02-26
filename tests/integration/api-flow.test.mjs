import test from "node:test";
import assert from "node:assert/strict";

const BASE_URL = process.env.BASE_URL || "http://localhost:3000";
const AUTH_COOKIE = process.env.AUTH_COOKIE || "";

function headers(json = false, auth = false) {
  const h = {};
  if (json) h["Content-Type"] = "application/json";
  if (auth && AUTH_COOKIE) h.Cookie = AUTH_COOKIE;
  return h;
}

async function get(path, auth = false) {
  return fetch(`${BASE_URL}${path}`, { headers: headers(false, auth) });
}

async function post(path, body, auth = false) {
  return fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: headers(true, auth),
    body: JSON.stringify(body),
  });
}

test("public features endpoint is available", async () => {
  const res = await get("/api/features");
  assert.equal(res.status, 200);
  const data = await res.json();
  assert.equal(typeof data.realImagesAvailable, "boolean");
});

test("protected endpoints reject unauthenticated requests", async () => {
  const extractRes = await post("/api/extract-brand", { url: "https://example.com" });
  assert.equal(extractRes.status, 401);

  const generateRes = await post("/api/generate-assets", { url: "https://example.com", limit: 1 });
  assert.equal(generateRes.status, 401);

  const brandsRes = await get("/api/brands");
  assert.equal(brandsRes.status, 401);

  const assetsRes = await get("/api/assets");
  assert.equal(assetsRes.status, 401);
});

test("authenticated extract+generate flow smoke (optional)", async (t) => {
  if (!AUTH_COOKIE) {
    t.skip("Set AUTH_COOKIE to run authenticated smoke flow.");
    return;
  }

  const extractRes = await post("/api/extract-brand", { url: "https://example.com" }, true);
  assert.ok([200, 422, 502].includes(extractRes.status));

  const body = {
    url: "https://example.com",
    brand: {
      name: "Example",
      colors: ["#111111", "#eeeeee"],
      description: "Example brand",
    },
    limit: 1,
    promptOverride: "Minimal social post",
    aspectRatio: "1:1",
  };
  const generateRes = await post("/api/generate-assets", body, true);
  assert.ok([200, 402, 503].includes(generateRes.status));
});
