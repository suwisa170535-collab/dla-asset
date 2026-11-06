@echo off
chcp 65001 > nul
title ตั้งค่าความปลอดภัย Windows Firewall สำหรับระบบครุภัณฑ์
echo ==========================================================
echo 🛡️  ตั้งค่าอนุญาตพอร์ต 3000 ผ่าน Windows Firewall (รันที่เครื่องแม่)
echo ==========================================================
echo.
echo กำลังเปิดพอร์ต 3000 เพื่อให้เครื่องลูกในสำนักงานเข้าใช้งานได้...
echo (หากระบบถามสิทธิ์ Administrator กรุณากด Yes / ยอมรับ)
echo.

netsh advfirewall firewall delete rule name="Municipal Asset System (Port 3000)" > nul 2>&1
netsh advfirewall firewall add rule name="Municipal Asset System (Port 3000)" dir=in action=allow protocol=TCP localport=3000

if %errorlevel% == 0 (
    echo.
    echo ✅ ตั้งค่าอนุญาตผ่านไฟร์วอลล์สำเร็จเรียบร้อยแล้ว!
    echo    เครื่องลูกในสำนักงานสามารถเชื่อมต่อเข้ามาได้ตลอดเวลา
) else (
    echo.
    echo ⚠️ กรุณาคลิกขวาที่ไฟล์นี้แล้วเลือก "Run as administrator" (เรียกใช้ในฐานะผู้ดูแล)
)

echo.
pause

