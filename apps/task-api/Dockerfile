# Build จาก root ของ repo:  docker build -f apps/task-api/Dockerfile -t task-api .
# ไม่มี secret ใน image — ส่ง env ตอนรัน (TASK_API_DATABASE_URL, JWT_SECRET, API keys, WEB_ORIGIN)
FROM node:26-slim AS build
RUN npm install -g pnpm@12.4.1
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/task-api/package.json apps/task-api/prisma.config.ts apps/task-api/
COPY apps/task-api/prisma apps/task-api/prisma
RUN pnpm install --frozen-lockfile --filter task-api...
COPY apps/task-api apps/task-api
# generate ไม่ต้องต่อ DB (URL ปลอมเฉพาะคำสั่งนี้ ไม่ถูกเก็บใน image) และไม่ใช้ --env-file เพราะ image ไม่มี .env
RUN TASK_API_DATABASE_URL=postgres://x:x@localhost:5432/x pnpm --filter task-api exec prisma generate

FROM node:26-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /repo
COPY --from=build --chown=node:node /repo /repo
USER node
EXPOSE 3000
WORKDIR /repo/apps/task-api
# ก่อนเริ่ม: รัน `pnpm prisma migrate deploy` (job แยก) — ฐานข้อมูลต้องมี extension vector
CMD ["node", "--import", "tsx", "src/main.ts"]
