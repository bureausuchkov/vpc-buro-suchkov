@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo Забираем обновления коллег с GitHub...
git pull origin main

git add -A
git diff --cached --quiet
if %errorlevel% equ 0 (
    echo Изменений нет — коммитить нечего.
) else (
    git commit -m "Обновление материалов VPC"
)

echo Отправляем твои правки на GitHub...
git push origin main

echo.
echo ==============================================
echo Готово! Всё забрали и всё отправили.
echo ==============================================
pause