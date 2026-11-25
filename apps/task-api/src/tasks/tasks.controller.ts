import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import type { PublicUser } from "../auth/auth.service.js";
import { CurrentUser } from "../auth/current-user.decorator.js";
import { JwtGuard } from "../auth/jwt.guard.js";
import { parseBody } from "../common/zod.js";
import { TaskQuery } from "./task.schemas.js";
import { TasksService } from "./tasks.service.js";

@Controller("tasks")
@UseGuards(JwtGuard)
export class TasksController {
  constructor(@Inject(TasksService) private readonly tasks: TasksService) {}

  @Get()
  list(@CurrentUser() user: PublicUser, @Query() query: unknown) {
    const q = parseBody(TaskQuery, query);
    return this.tasks.list(user.id, { ...q, overdue: q.overdue === "true", today: q.today === "true" });
  }

  /** ต้องประกาศก่อน `:id` ไม่งั้น "summary" จะถูกตีเป็น id */
  @Get("summary")
  summary(@CurrentUser() user: PublicUser) {
    return this.tasks.summary(user.id);
  }

  @Post()
  create(@CurrentUser() user: PublicUser, @Body() body: unknown) {
    return this.tasks.create(user.id, body);
  }

  @Get(":id")
  get(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.tasks.get(user.id, id);
  }

  @Patch(":id")
  update(@CurrentUser() user: PublicUser, @Param("id") id: string, @Body() body: unknown) {
    return this.tasks.update(user.id, id, body);
  }

  @Delete(":id")
  @HttpCode(204)
  remove(@CurrentUser() user: PublicUser, @Param("id") id: string) {
    return this.tasks.remove(user.id, id);
  }
}
