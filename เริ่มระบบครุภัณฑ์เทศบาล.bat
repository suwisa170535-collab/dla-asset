@echo off
chcp 65001 > nul
title ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย องค์กรปกครองส่วนท้องถิ่น (เครื่องแม่)
echo ==========================================================
echo 🏛️  ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย (เครื่องแม่)
echo ==========================================================
echo.
echo ⏳ กำลังเริ่มต้นระบบเซิร์ฟเวอร์ฐานข้อมูล... กรุณารอสักครู่
echo.

:: เปิดหน้าต่างโปรแกรมแบบ Desktop App แยกเดี่ยว (ไม่มีแถบ URL ไม่มีแท็บเบราว์เซอร์)
where msedge >nul 2>&1
if %errorlevel% == 0 (
    start "" msedge --app="http://localhost:3000" --window-size=1440,920
) else (
    where chrome >nul 2>&1
    if %errorlevel% == 0 (
        start "" chrome --app="http://localhost:3000" --window-size=1440,920
    ) else (
        start "" "http://localhost:3000"
    )
)

:: รัน Backend Server
node server/index.js

pause
