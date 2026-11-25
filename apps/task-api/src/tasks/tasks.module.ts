import { Module } from "@nestjs/common";
import { TasksRepository } from "./tasks.repository.js";
import { TasksService } from "./tasks.service.js";

@Module({ providers: [TasksRepository, TasksService], exports: [TasksService] })
export class TasksModule {}
