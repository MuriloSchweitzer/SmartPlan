# SmartPlan

Aplicação web de planejamento inteligente do tempo. O sistema organiza tarefas fixas e flexíveis nos períodos livres do usuário, calcula prioridades, monta a agenda semanal e registra o tempo realmente utilizado.

## Arquitetura

```text
SmartPlan/
├── frontend/   React 19 + Vite
├── backend/    API REST Node.js + Express
├── database/   PostgreSQL: migrações e scripts
└── docker-compose.yml
```

As três camadas são independentes:

```text
Navegador (React) ──HTTPS──> API (Express) ──SQL──> PostgreSQL
```

- O frontend nunca acessa o banco diretamente.
- O backend valida a sessão e garante que cada usuário acesse apenas seus dados.
- O PostgreSQL mantém usuários, categorias, tarefas, disponibilidades, agenda e histórico em tabelas relacionais.

## Funcionalidades

- Cadastro, login e alteração de senha com PBKDF2 e salt.
- Categorias personalizadas por usuário.
- Tarefas fixas e flexíveis com prazo, duração, criticidade e impacto.
- Prioridade calculada por `0,4 × criticidade + 0,4 × urgência + 0,2 × impacto`.
- Disponibilidade semanal recorrente.
- Planejamento automático da agenda, preservando blocos manuais.
- Registro de execução e comparação entre tempo estimado e tempo real.
- Dashboard, agenda semanal, prioridades, histórico e configurações.
- Layout responsivo para desktop e celular.

## Execução local

Pré-requisitos: Node.js 22+, npm e Docker.

```powershell
docker compose up -d postgres
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm install
npm run db:migrate
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`
- PostgreSQL: `localhost:5432`

Antes de usar fora do ambiente local, altere `JWT_SECRET` em `backend/.env`.

## Testes e build

```powershell
npm test
npm run lint
npm run build
```

## Hospedagem

### Frontend

Use `frontend/` como diretório raiz na Vercel ou Netlify e configure:

```text
VITE_API_URL=https://sua-api.exemplo.com/api
```

### Backend

Use `backend/` como diretório raiz em um serviço Node.js ou na Vercel. Configure:

```text
DATABASE_URL=postgresql://...
JWT_SECRET=...
FRONTEND_URL=https://seu-frontend.exemplo.com
NODE_ENV=production
```

### PostgreSQL

O banco pode ser hospedado em Neon, Supabase, Railway ou outro provedor PostgreSQL. Execute `npm run db:migrate` apontando `DATABASE_URL` para a instância criada.

Consulte [docs/ARQUITETURA.md](docs/ARQUITETURA.md) para detalhes das camadas e regras de negócio.
