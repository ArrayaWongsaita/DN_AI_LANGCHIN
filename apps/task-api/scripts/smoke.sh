#!/usr/bin/env bash
# Live smoke test (ใช้ model จริง): register → login → chat สร้างงาน → streaming → ขอลบ → approve
# ใช้: AI_PROVIDER=deepseek bash scripts/smoke.sh   (ต้องมี DB ที่ migrate แล้ว และ key ของ provider ใน ../../.env)
set -euo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-3077}"; BASE="http://localhost:$PORT"
json() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{const o=JSON.parse(s);console.log(eval('o'+process.argv[1]))})" "$1"; }

pnpm exec tsx --env-file=../../.env src/main.ts >/tmp/task-api-smoke.log 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 30); do curl -s "$BASE/auth/me" >/dev/null 2>&1 && break; sleep 0.5; done

EMAIL="smoke-$RANDOM$RANDOM@example.local"
echo "1) register";  TOKEN=$(curl -s -X POST "$BASE/auth/register" -H 'content-type: application/json' -d "{\"name\":\"Smoke\",\"email\":\"$EMAIL\",\"password\":\"smoke-pass-123\"}" | json .token)
echo "   token ได้ (${#TOKEN} ตัวอักษร)"
echo "2) login";     curl -s -X POST "$BASE/auth/login" -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\",\"password\":\"smoke-pass-123\"}" | json .user.email
AUTH="Authorization: Bearer $TOKEN"
CONV=$(curl -s -X POST "$BASE/conversations" -H "$AUTH" -H 'content-type: application/json' -d '{"title":"smoke"}' | json .id)
echo "3) chat: สร้างงาน"; curl -s -X POST "$BASE/conversations/$CONV/chat" -H "$AUTH" -H 'content-type: application/json' -d '{"message":"เพิ่มงาน ซื้อกาแฟ ความสำคัญสูง"}' | json '.reply+" | tools="+JSON.stringify(o.toolCalls.map(t=>t.name))'
echo "4) stream:"; curl -sN -X POST "$BASE/conversations/$CONV/chat/stream" -H "$AUTH" -H 'content-type: application/json' -d '{"message":"ตอนนี้มีงานอะไรบ้าง"}' | grep -E '^event:' | uniq -c
echo "5) ขอลบ → ต้องรออนุมัติ"
RES=$(curl -s -X POST "$BASE/conversations/$CONV/chat" -H "$AUTH" -H 'content-type: application/json' -d '{"message":"ลบงาน ซื้อกาแฟ ออกให้หน่อย"}')
AID=$(echo "$RES" | json .approval.id)
echo "   approval actions: $(echo "$RES" | json '.approval.actions.map(a=>a.name+JSON.stringify(a.args)).join(",")')"
echo "6) approve"; curl -s -X POST "$BASE/conversations/$CONV/approvals/$AID" -H "$AUTH" -H 'content-type: application/json' -d '{"decision":"approve"}' | json '.reply'
echo "7) approve ซ้ำ (ต้องได้ผลเดิม)"; curl -s -X POST "$BASE/conversations/$CONV/approvals/$AID" -H "$AUTH" -H 'content-type: application/json' -d '{"decision":"approve"}' | json '.reply'
echo "8) ไม่มี token → $(curl -s -o /dev/null -w '%{http_code}' "$BASE/conversations")"
