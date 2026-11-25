import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { loadConfig } from "./config/config.js";

const config = loadConfig();
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
await app.listen(config.port);
console.log(`task-api พร้อมที่ http://localhost:${config.port}`);
