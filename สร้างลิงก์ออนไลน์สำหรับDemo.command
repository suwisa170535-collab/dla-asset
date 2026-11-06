#!/bin/bash
# ================================================================================
# ระบบสร้างลิงก์ออนไลน์ด่วนสำหรับส่ง Demo ให้เทศบาล/อบต.
# พัฒนาสำหรับ macOS (Apple Silicon / Intel)
# ================================================================================

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR" || exit 1

clear
echo "================================================================================"
echo "   🏛️  ระบบบริหารจัดการพัสดุและครุภัณฑ์เทศบาล/อบต. - ระบบส่ง Demo ออนไลน์"
echo "================================================================================"
echo ""

# 1. ตรวจสอบว่าระบบหลักทำงานอยู่บนพอร์ต 3000 หรือไม่
if ! lsof -ti :3000 > /dev/null 2>&1; then
  echo "🚀 กำลังเริ่มต้นระบบเซิร์ฟเวอร์บนเครื่องของคุณ (Port 3000)..."
  node server/index.js > /dev/null 2>&1 &
  sleep 2
else
  echo "✅ ระบบเซิร์ฟเวอร์หลักกำลังทำงานอยู่บนพอร์ต 3000 พร้อมให้บริการ"
fi

mkdir -p "$DIR/bin"
CLOUDFLARED="$DIR/bin/cloudflared"

# 2. ตรวจสอบและดาวน์โหลด cloudflared (ถ้ายังไม่มี)
if [ ! -x "$CLOUDFLARED" ]; then
  echo "📥 กำลังเตรียมระบบเชื่อมต่อ Cloudflare สำหรับ macOS (ทำเพียงครั้งแรก)..."
  ARCH=$(uname -m)
  if [ "$ARCH" = "arm64" ]; then
    TGZ_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-arm64.tgz"
  else
    TGZ_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-darwin-amd64.tgz"
  fi
  curl -s -L "$TGZ_URL" -o "$DIR/bin/cf.tgz"
  tar -xzf "$DIR/bin/cf.tgz" -C "$DIR/bin"
  rm -f "$DIR/bin/cf.tgz"
  chmod +x "$CLOUDFLARED"
fi

# กรณีไม่มี cloudflared ให้สำรองด้วย pinggy ผ่าน SSH
if [ ! -x "$CLOUDFLARED" ]; then
  echo "⚠️ ไม่พบโมดูล Cloudflare กำลังเปิดระบบสำรองผ่าน Pinggy (SSH)..."
  echo "------------------------------------------------------------------------"
  ssh -o StrictHostKeyChecking=no -p 443 -R0:localhost:3000 a.pinggy.io
  exit 0
fi

echo "⏳ กำลังสร้างลิงก์ออนไลน์ความเร็วสูงผ่าน Cloudflare Network..."
echo "   (ผู้รับสามารถเปิดบนมือถือ หรือเครื่องคอมพิวเตอร์ได้ทันที โดยไม่ต้องติดตั้งอะไรเลย)"
echo ""

LOG_FILE=$(mktemp)

"$CLOUDFLARED" tunnel --url http://localhost:3000 > "$LOG_FILE" 2>&1 &
TUNNEL_PID=$!

cleanup() {
  kill "$TUNNEL_PID" 2>/dev/null
  rm -f "$LOG_FILE"
  exit 0
}
trap cleanup SIGINT SIGTERM EXIT

FOUND_URL=""
for i in {1..30}; do
  if [ -f "$LOG_FILE" ]; then
    FOUND_URL=$(grep -o 'https://[a-zA-Z0-9.-]*\.trycloudflare\.com' "$LOG_FILE" | head -n 1)
    if [ -n "$FOUND_URL" ]; then
      break
    fi
  fi
  sleep 1
done

if [ -n "$FOUND_URL" ]; then
  echo "$FOUND_URL" | pbcopy
  clear
  echo "================================================================================"
  echo "🎉 ลิงก์ออนไลน์สำหรับ Demo สร้างเสร็จสมบูรณ์แล้ว!"
  echo "================================================================================"
  echo ""
  echo "  👉 ลิงก์สดสำหรับส่งให้ผู้บริหาร/ลูกค้าทาง LINE หรือ Facebook:"
  echo ""
  echo "     $FOUND_URL"
  echo ""
  echo "================================================================================"
  echo "✅ ระบบได้คัดลอก (Copy) ลิงก์นี้ลงเครื่องคุณให้อัตโนมัติแล้ว!"
  echo "   (คุณสามารถกดปุ่ม [ Command + V ] หรือคลิกขวาแล้ววางใน LINE ได้ทันที)"
  echo ""
  echo "🌐 ระบบกำลังเปิดหน้าเดโม่นี้ในเว็บเบราว์เซอร์ของคุณ..."
  echo "⚠️ ข้อสำคัญ:"
  echo "   1. กรุณาเปิดหน้าต่างสีดำ (Terminal) นี้ทิ้งไว้ ตราบใดที่ยังต้องการให้ลูกค้าเปิดดูได้"
  echo "   2. เมื่อเสร็จสิ้นการสาธิตแล้ว ให้ปิดหน้าต่างนี้ หรือกด [ Control + C ] เพื่อหยุด"
  echo "================================================================================"
  
  open "$FOUND_URL" 2>/dev/null
  
  wait "$TUNNEL_PID"
else
  echo "❌ ไม่สามารถดึงลิงก์ได้ กรุณาดูรายละเอียดด้านล่าง:"
  cat "$LOG_FILE"
  wait "$TUNNEL_PID"
fi
