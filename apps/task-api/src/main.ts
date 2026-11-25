import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module.js";
import { loadConfig } from "./config/config.js";
import { parseOrigins } from "./config/origins.js";

const config = loadConfig();
const app = await NestFactory.create(AppModule);
app.enableShutdownHooks();
// CORS: อนุญาตเฉพาะ origin ของเว็บเรา (ไม่ใช้ '*') — token อยู่ใน header ไม่ใช่ cookie จึงไม่ต้อง credentials
app.enableCors({ origin: parseOrigins(process.env.WEB_ORIGIN), methods: ["GET", "POST", "PATCH", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"], exposedHeaders: ["Retry-After"] });
await app.listen(config.port);
console.log(`task-api พร้อมที่ http://localhost:${config.port}`);
