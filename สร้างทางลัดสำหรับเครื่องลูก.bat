@echo off
chcp 65001 > nul
title สร้างไอคอนทางลัดระบบครุภัณฑ์สำหรับเครื่องลูก
echo ==========================================================
echo 🏛️  สร้างไอคอนทางลัดบนหน้าจอ Desktop (สำหรับเครื่องลูก)
echo ==========================================================
echo.
echo โปรแกรมนี้จะสร้างไอคอน "ระบบครุภัณฑ์เทศบาล" บนหน้าจอ Desktop ให้คุณ
echo.
set /p SERVER_NAME="👉 กรุณาพิมพ์ชื่อเครื่องแม่ (เช่น PASSADU หรือกด Enter หากใช้ชื่อ PASSADU): "
if "%SERVER_NAME%"=="" set SERVER_NAME=PASSADU

set DESKTOP_DIR=%USERPROFILE%\Desktop
set SHORTCUT_FILE=%DESKTOP_DIR%\ระบบครุภัณฑ์เทศบาล.url

echo [InternetShortcut] > "%SHORTCUT_FILE%"
echo URL=http://%SERVER_NAME%:3000 >> "%SHORTCUT_FILE%"
echo IconIndex=0 >> "%SHORTCUT_FILE%"

echo.
echo ==========================================================
echo 🎉 สำเร็จ! สร้างไอคอนทางลัด "ระบบครุภัณฑ์เทศบาล" บนหน้าจอเรียบร้อยแล้ว
echo    (คุณสามารถดับเบิ้ลคลิกไอคอนบนหน้าจอ Desktop เพื่อเข้าใช้งานได้ทันที)
echo ==========================================================
echo.
pause

