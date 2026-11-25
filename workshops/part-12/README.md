# Workshop 12 — Personal AI Assistant (CLI)

## โจทย์
ผู้ช่วยส่วนตัวแบบ CLI ที่ **จำต่อบทสนทนา**, **แยกผู้ใช้**, **จำ preference ของผู้ใช้**, และ **ต่อบทสนทนาได้หลังรีสตาร์ท** (เก็บใน PostgreSQL)

## Requirements
1. `--user <id>` (ถือว่าพิสูจน์ตัวตนแล้ว) และ `--conversation <id>` — thread id = `threadIdFor(user, conversation)`
2. `--thread <id เต็ม>` ต้องผ่าน `assertThreadOwner` ก่อนเสมอ (ผู้ใช้ B เปิดของ A ไม่ได้ และไม่เรียกโมเดล)
3. `--pref key=value` บันทึก preference (ซ้ำได้), `--show-prefs`, `--forget` ลบ preference ของผู้ใช้
4. preference ของผู้ใช้คนนั้นเท่านั้นถูกใส่ใน system prompt
5. ใช้ `PostgresSaver` + `PostgresStore`; Postgres ล่มต้องมีข้อความบอกวิธีแก้
6. ตรวจ `userId` (a-z 0-9 -) — `../x` ต้องถูกปฏิเสธ
7. แยก logic ออกเป็นฟังก์ชัน `chat()` เพื่อทดสอบด้วย scripted model

## วิธีรัน
```bash
docker compose up -d --wait
A=workshops/part-12/solution/personal-assistant.ts
pnpm exec tsx --env-file=.env $A --user alice --conversation c1 --pref "ภาษา=ตอบสั้นๆ ลงท้ายค่ะ" "ฉันชื่อมะลิ รหัสโครงการคือ ORCHID-42"
pnpm exec tsx --env-file=.env $A --user alice --conversation c1 "รหัสโครงการของฉันคืออะไร"   # โปรเซสใหม่
pnpm exec tsx --env-file=.env $A --user alice --conversation c2 "ฉันชื่ออะไร"                 # บทสนทนาอื่น
pnpm exec tsx --env-file=.env $A --user bob   --conversation c1 "รหัสโครงการของฉันคืออะไร"   # ผู้ใช้อื่น
pnpm exec tsx --env-file=.env $A --user bob   --thread "user:alice:conv:c1" "แอบดู"          # ต้อง forbidden
pnpm test tests/part12-memory.test.ts
```

## Expected Output (ตัวอย่างจากการรันจริงบน Groq — แต่ละคำสั่งเป็นโปรเซสแยก)
```
alice/c1 : บันทึก preference: ภาษา=ตอบสั้นๆ ลงท้ายค่ะ
           สวัสดีค่ะมะลิ รหัสโครงการ ORCHID-42 ได้รับบันทึกแล้วค่ะ.
alice/c1 (โปรเซสใหม่): รหัสโครงการของคุณคือ ORCHID-42 ค่ะ.
alice/c2 : ขออภัย ฉันไม่ทราบชื่อของคุณค่ะ
bob/c1   : ขออภัย ฉันไม่ทราบรหัสโครงการของคุณ กรุณาระบุรหัสโครงการเพื่อให้ฉันช่วยได้ครับ
bob --thread user:alice:conv:c1 : ❌ forbidden: thread นี้ไม่ใช่ของผู้ใช้
alice --show-prefs --forget : preferences: { 'ภาษา': 'ตอบสั้นๆ ลงท้ายค่ะ' } / ลบ preference ของผู้ใช้นี้แล้ว
alice --show-prefs          : preferences: {}
--user ../x                 : ❌ userId ไม่ถูกต้อง (ใช้ได้เฉพาะ a-z 0-9 -)
```

## Acceptance Criteria
- [ ] บทสนทนาเดียวกันจำข้อความก่อนหน้า แม้เป็นโปรเซสใหม่ (รีสตาร์ท)
- [ ] บทสนทนา/ผู้ใช้อื่นไม่เห็นข้อมูลนั้น (แม้ใช้ conversation id เดียวกัน)
- [ ] ผู้ใช้ B เปิด thread ของ A ไม่ได้ และโมเดลไม่ถูกเรียก
- [ ] `--forget` ลบเฉพาะ preference ของผู้ใช้นั้น
- [ ] `pnpm test tests/part12-memory.test.ts` ผ่าน (รวมเทสต์ของ `chat()`)
- [ ] อธิบายได้ว่าทำไม `userId` ต้องมาจาก auth ไม่ใช่จากข้อความแชต

เฉลย: [`solution/personal-assistant.ts`](solution/personal-assistant.ts)
