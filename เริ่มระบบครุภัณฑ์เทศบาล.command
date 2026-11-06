#!/bin/bash
# ดับเบิ้ลคลิกไฟล์นี้เพื่อเริ่มระบบครุภัณฑ์เทศบาล/อบต. (Desktop App)
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR" || exit 1

echo "=========================================================="
echo "🏛️  กำลังเริ่มระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย (Desktop App)..."
echo "=========================================================="

# ปิดโปรเซสเก่าบนพอร์ต 3000 (ถ้ามี)
PIDS=$(lsof -ti :3000 2>/dev/null)
if [ -n "$PIDS" ]; then
  echo "กำลังปิดโปรเซสเดิมบนพอร์ต 3000 ($PIDS)..."
  kill -9 $PIDS 2>/dev/null
  sleep 1
fi

# ปลดตัวแปรสภาพแวดล้อมเพื่อให้ Electron ทำงานเป็นแอปพลิเคชัน Desktop
unset ELECTRON_RUN_AS_NODE

ELECTRON_BIN="./node_modules/electron/dist/Electron.app/Contents/MacOS/Electron"
if [ ! -f "$ELECTRON_BIN" ]; then
  ELECTRON_BIN="./node_modules/.bin/electron"
fi

echo "กำลังเปิดหน้าต่างโปรแกรม Desktop App..."
"$ELECTRON_BIN" desktop-main.cjs
