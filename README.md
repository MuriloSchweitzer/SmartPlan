# SmartPlan

Versão web completa da Sprint3, mantendo a identidade visual e as regras do aplicativo iniciado por `Sprint3/executar-smartplan.cmd`.

## Estrutura

```text
SmartPlan/
├── frontend/             React 19 + Vite
├── backend/              C# + ASP.NET Core 6
├── database/             PostgreSQL 17
├── docker-compose.yml    Banco e API em contêineres separados
└── executar-smartplan.cmd
```

O frontend, o backend e o banco são camadas independentes:

```text
React ──HTTPS──> ASP.NET Core ──SQL──> PostgreSQL
```

## Funcionalidades preservadas

- Cadastro, login, perfil e alteração de senha.
- Categorias personalizadas.
- Tarefas fixas e flexíveis com prazo, duração, criticidade e impacto.
- Prioridade por `0,4 × criticidade + 0,4 × urgência + 0,2 × impacto`.
- Disponibilidade recorrente e planejamento automático semanal.
- Movimentação manual dos blocos da agenda com validação de conflitos.
- Registro de execução e histórico de tempo estimado versus realizado.
- Dashboard, agenda, prioridades, tarefas, disponibilidade, histórico e configurações.
- Mesma estrutura visual React já reproduzida a partir da Sprint3.

## Executar no Windows

Com .NET 6 SDK, Node.js 22+ e PostgreSQL disponíveis, execute:

```powershell
.\executar-smartplan.cmd
```

Se o Docker estiver instalado, o script inicia o PostgreSQL automaticamente. Caso contrário, ele usa o PostgreSQL local configurado em `backend/.env`.

- Aplicação: `http://localhost:5173`
- API C#: `http://localhost:8080`
- Health check: `http://localhost:8080/api/health`
- PostgreSQL: `localhost:5432`

Execução manual:

```powershell
docker compose up -d postgres
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
npm install
npm run dev
```

## Validar

```powershell
npm test
npm run build
```

## Hospedar

- **Frontend:** publique `frontend/` na Netlify ou Vercel e configure `VITE_API_URL=https://sua-api/api`.
- **Backend:** publique a imagem de `backend/Dockerfile` em Render, Railway, Azure, AWS ou outro host com suporte a ASP.NET Core/Docker.
- **Banco:** use PostgreSQL gerenciado e configure `DATABASE_URL` somente no backend.

Variáveis obrigatórias do backend:

```text
DATABASE_URL=postgresql://usuario:senha@host:5432/banco
JWT_SECRET=segredo-com-pelo-menos-32-caracteres
FRONTEND_URL=https://seu-frontend.netlify.app
ASPNETCORE_URLS=http://0.0.0.0:8080
```

A API aplica automaticamente `database/migrations/001_initial_schema.sql` ao iniciar. O banco nunca é acessado diretamente pelo React.

Consulte `docs/ARQUITETURA.md` para os detalhes das camadas e regras.
