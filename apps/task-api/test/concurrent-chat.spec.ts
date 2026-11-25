import { BaseChatModel } from "@langchain/core/language_models/chat_models";
import { AIMessage, AIMessageChunk, type BaseMessage } from "@langchain/core/messages";
import type { ChatResult } from "@langchain/core/outputs";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { bearer, hasDb, makeApp, registerUser } from "./helpers.js";

/** A model whose reply is held back until `release()` — lets a test keep one request "in flight". */
class GatedModel extends BaseChatModel {
  release!: () => void;
  private gate = new Promise<void>((r) => (this.release = r));
  calls = 0;
  constructor() {
    super({});
  }
  _llmType() {
    return "gated";
  }
  bindTools() {
    return this;
  }
  async _generate(_m: BaseMessage[]): Promise<ChatResult> {
    this.calls++;
    await this.gate;
    return { generations: [{ text: "ok", message: new AIMessageChunk({ content: "ok" }) }] };
  }
}

describe.skipIf(!hasDb)("two tabs posting to one conversation", () => {
  let ctx: Awaited<ReturnType<typeof makeApp>>;
  let a: Awaited<ReturnType<typeof registerUser>>;
  let conv: string;

  beforeAll(async () => {
    ctx = await makeApp();
    a = await registerUser(ctx.http(), "conc");
    conv = (await request(ctx.http()).post("/conversations").set(bearer(a.token)).send({})).body.id;
  });
  afterAll(async () => {
    await ctx.prisma.user.deleteMany({ where: { id: a.id } });
    await ctx.app.close();
  });

  const post = (msg: string) => request(ctx.http()).post(`/conversations/${conv}/chat`).set(bearer(a.token)).send({ message: msg });

  test("a second message while the first is still being answered gets 409 (Thai message), and the lock is released afterwards", async () => {
    const model = new GatedModel();
    (ctx.agent as unknown as { model: unknown }).model = model;
    const first = post("แรก").then((r) => r);
    while (model.calls === 0) await new Promise((r) => setTimeout(r, 5)); // first request is now inside the model
    const second = await post("สอง");
    expect(second.status).toBe(409);
    expect(second.body.message).toMatch(/กำลังตอบ/);
    model.release();
    expect((await first).status).toBe(200);
    ctx.useScript(new AIMessage("พร้อมแล้ว"));
    expect((await post("สาม")).status).toBe(200); // lock freed after the first finished
  });

  test("a failed request also frees the lock", async () => {
    ctx.useScript(); // exhausted script → agent error
    expect((await post("พัง")).status).toBeGreaterThanOrEqual(500);
    ctx.useScript(new AIMessage("ยังใช้ได้"));
    expect((await post("ลองใหม่")).status).toBe(200);
  });
});
