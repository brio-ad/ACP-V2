import assert from "node:assert/strict";
import { after, test } from "node:test";
import { emailRecallApi } from "../src/emailRecallApi.ts";

const originalFetch = globalThis.fetch;
after(() => {
  globalThis.fetch = originalFetch;
});

function mockJson(value, status = 200) {
  globalThis.fetch = async (url, init) => {
    mockJson.last = { url: String(url), init };
    return new Response(JSON.stringify(value), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

test("directory and sent filters reach the API with their page tokens", async () => {
  mockJson({ items: [], nextPageToken: "next" });
  await emailRecallApi.users({
    query: "alex",
    status: "active",
    orgUnit: "/Sales",
    pageToken: "one",
  });
  assert.equal(mockJson.last.url.split("?")[0], "/api/email-recall/users");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(mockJson.last.url.split("?")[1])), {
    limit: "100",
    pageToken: "one",
    query: "alex",
    status: "active",
    orgUnit: "/Sales",
  });

  await emailRecallApi.sent("u/1", {
    query: "invoice",
    after: "2026-01-01",
    before: "2026-01-31",
    recipientType: "external",
    pageToken: "two",
  });
  assert.equal(mockJson.last.url.split("?")[0], "/api/email-recall/users/u%2F1/sent");
  assert.deepEqual(Object.fromEntries(new URLSearchParams(mockJson.last.url.split("?")[1])), {
    limit: "10",
    pageToken: "two",
    query: "invoice",
    after: "2026-01-01",
    before: "2026-01-31",
    recipientType: "external",
  });
});

test("recall submits one reason and requires an operation response", async () => {
  mockJson({ id: "op1", status: "processing" });
  const operation = await emailRecallApi.recall("u1", "m1", "Sent in error");
  assert.equal(mockJson.last.url, "/api/email-recall/users/u1/sent/m1/recalls");
  assert.equal(mockJson.last.init.method, "POST");
  assert.equal(mockJson.last.init.body, '{"reason":"Sent in error"}');
  assert.deepEqual(operation.results, []);

  mockJson({ id: "op2", status: "completed" });
  await assert.rejects(emailRecallApi.recall("u1", "m1", "Sent in error"), /invalid response/);
});

test("missing backend and permission failures remain errors", async () => {
  globalThis.fetch = async () =>
    new Response("<html>Vite fallback</html>", { headers: { "Content-Type": "text/html" } });
  await assert.rejects(emailRecallApi.users(), /service is unavailable/);
  mockJson({ error: "Mailbox access denied" }, 403);
  await assert.rejects(emailRecallApi.sent("u1"), /Mailbox access denied/);
  globalThis.fetch = async () => {
    throw new TypeError("network failed");
  };
  await assert.rejects(emailRecallApi.history(), /service is unavailable/);
});

test("invalid page and final recipient outcomes are rejected", async () => {
  mockJson({ items: "not a page" });
  await assert.rejects(emailRecallApi.history(), /invalid response/);
  mockJson({
    id: "op3",
    status: "completed",
    results: [{ email: "a@example.com", status: "successful", detail: "Moved to Trash" }],
  });
  const record = await emailRecallApi.record("op3");
  assert.equal(record.results[0].status, "successful");
});
