# SmartPlan Database

- `migrations/001_initial_schema.sql`: esquema PostgreSQL completo e idempotente.
- `scripts/reset.sql`: limpeza dos dados para desenvolvimento local.

O `docker-compose.yml` da raiz executa automaticamente as migrações na primeira criação do volume.
