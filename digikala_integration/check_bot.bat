@echo off
rem این اسکریپت در صورت بسته شدن تب دیجی‌کالا، آن را دوباره باز می‌کند
tasklist /FI "IMAGENAME eq chrome.exe" 2>NUL | find /I /N "chrome.exe">NUL
if "%ERRORLEVEL%"=="0" (
    rem کروم در حال اجراست
    exit /b 0
) else (
    rem کروم بسته شده، باز کردن مجدد با صفحه دیجی‌کالا
    start "" "C:\Program Files\Google\Chrome\Application\chrome.exe" "https://seller.digikala.com/pwa/orders?sort=variant_id&page=1"
    exit /b 0
)
