#!/usr/bin/env bash
# Live demo ของคำสั่งตัวอย่างใน Part 20 กับ model จริง + embeddings จริง (Gemini)
# ใช้: AI_PROVIDER=groq|deepseek bash scripts/capstone-demo.sh   (ต้องมี DB ที่ migrate แล้วและ key ใน ../../.env)
set -uo pipefail
cd "$(dirname "$0")/.."
export PORT="${PORT:-3079}"; BASE="http://localhost:$PORT"; J='content-type: application/json'
js() { node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>{try{const o=JSON.parse(s);console.log(eval('o'+process.argv[1]))}catch(e){console.log('(ตอบไม่ใช่ JSON) '+s.slice(0,200))}})" "$1"; }
pnpm exec tsx --env-file=../../.env src/main.ts >/tmp/capstone-demo.log 2>&1 &
PID=$!; trap 'kill $PID 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do curl -s "$BASE/auth/me" >/dev/null 2>&1 && break; sleep 0.5; done
TOKEN=$(curl -s -X POST "$BASE/auth/register" -H "$J" -d "{\"name\":\"Demo\",\"email\":\"demo-$RANDOM$RANDOM@example.local\",\"password\":\"demo-pass-123\"}" | js .token)
A="Authorization: Bearer $TOKEN"
CONV=$(curl -s -X POST "$BASE/conversations" -H "$A" -H "$J" -d '{}' | js .id)
say() { echo; echo "▶ $1"; curl -s -X POST "$BASE/conversations/$CONV/chat" -H "$A" -H "$J" -d "{\"message\":\"$1\"}" | js '.reply+"\n   tools="+JSON.stringify(o.toolCalls.map(t=>t.name))+(o.approval?"\n   ⏸ approval: "+JSON.stringify(o.approval.actions.map(a=>a.name+JSON.stringify(a.args))):"")+"  tokens="+(o.usage?o.usage.inputTokens+"/"+o.usage.outputTokens:"?")'; }
say 'เพิ่มงาน อ่านหนังสือ TypeScript กำหนดพรุ่งนี้'
say 'เพิ่มงาน เขียน Backend API ความสำคัญสูง กำหนดวันนี้'
say 'เพิ่มงาน ประชุมทีม กำหนดเมื่อวาน'
say 'วันนี้มีงานอะไรครบกำหนดบ้าง'
say 'แสดงงานที่ยังไม่เสร็จ'
say 'ค้นหางานที่เกี่ยวกับ Backend'
say 'ทำเครื่องหมายว่างานเขียน Backend API เสร็จแล้ว'
say 'ปรับงานอ่านหนังสือ TypeScript เป็นความสำคัญสูง'
echo; echo "▶ GET /summaries/weekly (structured output)"; curl -s "$BASE/summaries/weekly" -H "$A" | js '.summary.headline+"\n   risks="+JSON.stringify(o.summary.risks)+"\n   next="+JSON.stringify(o.summary.nextActions)'
echo; echo "▶ ลบงานประชุมทีม (ต้องรออนุมัติ)"
AID=$(curl -s -X POST "$BASE/conversations/$CONV/chat" -H "$A" -H "$J" -d '{"message":"ลบงานประชุมทีม"}' | js '.approval?o.approval.id:""')
if [ -n "$AID" ]; then echo; echo "▶ approve"; curl -s -X POST "$BASE/conversations/$CONV/approvals/$AID" -H "$A" -H "$J" -d '{"decision":"approve"}' | js .reply; fi
echo; echo "▶ knowledge base (Gemini embeddings จริง)"
curl -s -X POST "$BASE/documents" -H "$A" -H "$J" -d '{"title":"คู่มือ deploy","filename":"deploy.md","content":"# ขั้นตอน deploy\n\nก่อน deploy ต้องให้เพื่อนร่วมทีมอย่างน้อยหนึ่งคนทำ code review แล้วรัน migration บน staging ก่อนเสมอ หลัง deploy ต้องตรวจ health check ภายใน 10 นาที ถ้าล้มเหลวให้ rollback ทันทีด้วยคำสั่ง rollback.sh"}' | js '"upload: chunks="+o.chunks'
say 'ขั้นตอน deploy ของทีมเป็นอย่างไร ตอบพร้อมอ้างอิงแหล่งที่มา'
say 'ราคาหุ้น Tesla วันนี้เท่าไร ค้นจากเอกสารของฉัน'
