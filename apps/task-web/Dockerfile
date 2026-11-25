# Build จาก root ของ repo:  docker build -f apps/task-web/Dockerfile --build-arg NEXT_PUBLIC_API_URL=https://api.example.com -t task-web .
# NEXT_PUBLIC_* ถูกฝังในไฟล์ JS ตอน build และเปิดเผยในเบราว์เซอร์ — ห้ามใส่ความลับ
FROM node:26-slim AS build
RUN npm install -g pnpm@12.4.1
WORKDIR /repo
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/task-web/package.json apps/task-web/
RUN pnpm install --frozen-lockfile --filter task-web...
COPY apps/task-web apps/task-web
ARG NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
RUN pnpm --filter task-web build

FROM node:26-slim
ENV NODE_ENV=production
WORKDIR /repo
COPY --from=build --chown=node:node /repo /repo
USER node
EXPOSE 3001
WORKDIR /repo/apps/task-web
# pnpm ไม่อยู่ใน stage สุดท้าย — เรียก next ตรงๆ
CMD ["node", "node_modules/next/dist/bin/next", "start", "--port", "3001"]
