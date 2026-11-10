#!/bin/bash
# Двойной клик = закоммитить изменения и отправить их на GitHub.
# Дальше всё делает GitHub Actions: прогоняет проверки и публикует
# marketing.bureausuchkov.com. Обычно сайт обновляется за 1–2 минуты.
set -e
cd "$(dirname "$0")"

git add -A
if git diff --cached --quiet; then
  echo "Изменений нет — коммитить нечего."
else
  git commit -m "Обновление материалов VPC ($(date '+%Y-%m-%d %H:%M'))"
fi

git push origin main

echo
echo "Отправлено. Ход публикации:"
echo "  https://github.com/bureausuchkov/vpc-buro-suchkov/actions"
echo "Сайт: https://marketing.bureausuchkov.com/"
echo
echo "Окно можно закрыть."
