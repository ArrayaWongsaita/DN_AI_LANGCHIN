import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Put, UseGuards } from "@nestjs/common";
import type { BaseStore } from "@langchain/langgraph-checkpoint";
import { z } from "zod";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { parseBody } from "../common/zod.js";
import { STORE, deletePreference, getPreferences, savePreference } from "./preferences.js";

const Key = z.string().regex(/^[a-z][a-zA-Z0-9_-]{0,39}$/, "key ใช้ได้เฉพาะ a-z A-Z 0-9 _ - (ขึ้นต้นด้วยตัวพิมพ์เล็ก ไม่เกิน 40 ตัว)");
const Value = z.object({ value: z.string().trim().min(1, "value ต้องไม่ว่าง").max(200, "value ยาวเกิน 200 ตัวอักษร") });

/** ความชอบของผู้ใช้ (long-term memory) เก็บใน LangGraph store แยก namespace ต่อ userId — ใช้ได้ทุกบทสนทนา */
@Controller("preferences")
@UseGuards(JwtGuard)
export class PreferencesController {
  constructor(@Inject(STORE) private readonly store: BaseStore) {}

  @Get()
  list(@CurrentUser() user: PublicUser) {
    return getPreferences(this.store, user.id);
  }

  @Put(":key")
  async put(@CurrentUser() user: PublicUser, @Param("key") key: string, @Body() body: unknown) {
    const k = parseBody(Key, key);
    const { value } = parseBody(Value, body);
    await savePreference(this.store, user.id, k, value);
    return { key: k, value };
  }

  @Delete(":key")
  @HttpCode(204)
  async remove(@CurrentUser() user: PublicUser, @Param("key") key: string) {
    await deletePreference(this.store, user.id, parseBody(Key, key));
  }
}
