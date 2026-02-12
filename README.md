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

## Логика использования

См. [docs/USAGE_FLOWS.md](docs/USAGE_FLOWS.md) — пошаговые сценарии без непонятных этапов. На экранах лида и сделки есть подсказки «Следующий шаг».
