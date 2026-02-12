# Delever Revenue OS

Revenue Operating System: привлечение, конверсия, монетизация, удержание, расширение, прогноз.

## Стек

- **Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL
- **Frontend:** React, Vite, TypeScript, React Router

## Запуск

```bash
# Корень
npm install

# Backend
cd backend && npm install && npx prisma generate
cp .env.example .env
# В .env задать DATABASE_URL (PostgreSQL), например:
# DATABASE_URL="postgresql://user:password@localhost:5432/delever_revenue_os"
npx prisma migrate dev --name init
npm run db:seed

# Frontend
cd ../frontend && npm install

# Из корня запуск обоих
cd .. && npm run dev
```

- Backend: http://localhost:3001  
- Frontend: http://localhost:5173  
- Вход: **admin@delever.io** / **admin123**

## Деплой на Vercel

1. Импортируйте репозиторий [github.com/faxryuk-commits/delever-rev-os](https://github.com/faxryuk-commits/delever-rev-os) в [Vercel](https://vercel.com).
2. Vercel подхватит `vercel.json`: сборка из папки `frontend`, результат в `frontend/dist`.
3. В настройках проекта (Environment Variables) добавьте переменную **`VITE_API_URL`** — полный URL вашего API (бэкенд нужно развернуть отдельно, например на Railway, Render или Fly.io). Пример: `https://your-api.railway.app`. Если не задать, фронт будет ходить на тот же домен (подойдёт, если API проксируете через Vercel Rewrites).
4. Деплой: каждый пуш в `main` будет собирать и публиковать фронтенд.

Бэкенд (Node + Prisma + PostgreSQL) на Vercel в текущем виде не деплоится — это длинный процесс. Разверните его на [Railway](https://railway.app), [Render](https://render.com) или [Fly.io](https://fly.io), создайте БД, пропишите `DATABASE_URL`, выполните `prisma migrate deploy` и `seed`. В `VITE_API_URL` укажите URL этого бэкенда.

## Логика использования

См. [docs/USAGE_FLOWS.md](docs/USAGE_FLOWS.md) — пошаговые сценарии без непонятных этапов. На экранах лида и сделки есть подсказки «Следующий шаг».
