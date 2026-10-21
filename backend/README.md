# SmartPlan Backend

API REST independente construída com Node.js, Express e PostgreSQL.

```powershell
Copy-Item .env.example .env
npm install
npm run db:migrate
npm run dev
```

O frontend acessa apenas esta API; nenhuma credencial do PostgreSQL é enviada ao navegador.
