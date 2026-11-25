import { AIMessage } from "@langchain/core/messages";
import request from "supertest";
import { afterAll, describe, expect, test } from "vitest";
import { bearer, hasDb, makeApp, registerUser } from "./helpers.js";

describe.skipIf(!hasDb)("conversation history survives a restart (Postgres checkpointer)", () => {
  const apps: Awaited<ReturnType<typeof makeApp>>[] = [];
  let userId: string | undefined;
  afterAll(async () => {
    const [last] = apps.slice(-1);
    if (last && userId) await last.prisma.user.deleteMany({ where: { id: userId } });
    for (const a of apps) await a.app.close().catch(() => undefined);
  });

  test("a second app instance reads the messages written by the first, and delete removes them", async () => {
    const first = await makeApp({ postgresCheckpointer: true });
    apps.push(first);
    const user = await registerUser(first.http(), "persist");
    userId = user.id;
    const conv = (await request(first.http()).post("/conversations").set(bearer(user.token)).send({})).body.id as string;
    first.useScript(new AIMessage("จำไว้แล้ว"));
    expect((await request(first.http()).post(`/conversations/${conv}/chat`).set(bearer(user.token)).send({ message: "ฉันชื่อสมชาย" })).status).toBe(200);
    await first.app.close(); // "restart"

    const second = await makeApp({ postgresCheckpointer: true });
    apps.push(second);
    const msgs = await request(second.http()).get(`/conversations/${conv}/messages`).set(bearer(user.token));
    expect(msgs.status).toBe(200);
    expect(JSON.stringify(msgs.body)).toContain("ฉันชื่อสมชาย");
    expect(JSON.stringify(msgs.body)).toContain("จำไว้แล้ว");

    expect((await request(second.http()).delete(`/conversations/${conv}`).set(bearer(user.token))).status).toBeLessThan(300);
    const after = await request(second.http()).get(`/conversations/${conv}/messages`).set(bearer(user.token));
    expect(JSON.stringify(after.body)).not.toContain("ฉันชื่อสมชาย");
  });
});
