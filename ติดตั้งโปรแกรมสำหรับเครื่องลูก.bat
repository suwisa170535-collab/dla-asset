@echo off
chcp 65001 > nul
title ติดตั้งโปรแกรมระบบครุภัณฑ์เทศบาล (สำหรับเครื่องลูก)
echo ================================================================================
echo 🏛️  ติดตั้งโปรแกรมระบบครุภัณฑ์และพัสดุเทศบาล (สำหรับเครื่องลูกในสำนักงาน)
echo ================================================================================
echo.
echo โปรแกรมนี้จะสร้างไอคอนเข้าใช้งานแบบ "หน้าต่างโปรแกรมจริง (Desktop App)"
echo ไว้บนหน้าจอ Desktop ของคุณ (เปิดใช้งานได้ทันทีโดยไม่มีแถบเบราว์เซอร์หรือแท็บรบกวน)
echo.
echo --------------------------------------------------------------------------------
set /p SERVER_HOST="👉 กรุณาพิมพ์ชื่อเครื่องแม่ (เช่น PASSADU หรือกด Enter หากใช้ชื่อ PASSADU): "
if "%SERVER_HOST%"=="" set SERVER_HOST=PASSADU

set TARGET_URL=http://%SERVER_HOST%:3000
set DESKTOP_DIR=%USERPROFILE%\Desktop
set APP_BAT=%DESKTOP_DIR%\ระบบครุภัณฑ์เทศบาล.bat

echo @echo off > "%APP_BAT%"
echo chcp 65001 ^> nul >> "%APP_BAT%"
echo title ระบบบริหารจัดการครุภัณฑ์และพัสดุคลังย่อย เทศบาล/อบต. >> "%APP_BAT%"
echo :: เปิดในโหมดหน้าต่างโปรแกรมเฉพาะ (Desktop Application Mode) >> "%APP_BAT%"
echo where msedge >nul 2>&1 >> "%APP_BAT%"
echo if %%errorlevel%% == 0 ( >> "%APP_BAT%"
echo     start "" msedge --app="%TARGET_URL%" --window-size=1400,900 >> "%APP_BAT%"
echo     exit >> "%APP_BAT%"
echo ) >> "%APP_BAT%"
echo where chrome >nul 2>&1 >> "%APP_BAT%"
echo if %%errorlevel%% == 0 ( >> "%APP_BAT%"
echo     start "" chrome --app="%TARGET_URL%" --window-size=1400,900 >> "%APP_BAT%"
echo     exit >> "%APP_BAT%"
echo ) >> "%APP_BAT%"
echo start "" "%TARGET_URL%" >> "%APP_BAT%"

:: สร้าง Internet Shortcut สำรองไว้ด้วย
set SHORTCUT_FILE=%DESKTOP_DIR%\ระบบครุภัณฑ์เทศบาล.url
echo [InternetShortcut] > "%SHORTCUT_FILE%"
echo URL=%TARGET_URL% >> "%SHORTCUT_FILE%"
echo IconIndex=0 >> "%SHORTCUT_FILE%"

echo.
echo ================================================================================
echo 🎉 ติดตั้งโปรแกรมบนหน้าจอ Desktop สำเร็จเรียบร้อยแล้ว!
echo.
echo    🔗 เชื่อมต่อกับเครื่องแม่: %SERVER_HOST% (พอร์ต 3000)
echo    💻 มีไอคอน "ระบบครุภัณฑ์เทศบาล" ปรากฏอยู่บนหน้าจอ Desktop แล้ว
echo    👉 ดับเบิ้ลคลิกไอคอนบนหน้าจอเพื่อเริ่มใช้งานได้ทันที (เปิดเป็นหน้าต่างโปรแกรมจริง)
echo ================================================================================
echo.
pause
