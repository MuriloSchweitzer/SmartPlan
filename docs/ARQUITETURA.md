# Arquitetura do SmartPlan

## Camadas separadas

### Frontend React

Responsável somente pela interface, navegação, gráficos e estado da sessão. Preserva o layout, os componentes e a experiência visual da Sprint3. Toda persistência passa por `VITE_API_URL`.

### Backend C#

API REST ASP.NET Core responsável por:

- autenticação e tokens de sessão assinados;
- autorização e isolamento por usuário;
- validação de dados;
- regras de tarefas, categorias, agenda e histórico;
- cálculo de prioridade;
- geração determinística da agenda;
- transações e migrações PostgreSQL.

### PostgreSQL

Camada de dados independente. Restrições, chaves estrangeiras e índices garantem integridade; nenhuma credencial do banco é enviada ao navegador.

## Modelo relacional

```text
users
 ├── categories
 ├── tasks ── categories
 │    ├── agenda_blocks
 │    └── task_history
 └── availability
```

Todas as entidades do usuário possuem `user_id`. Exclusões de usuário e tarefas usam cascata; categorias vinculadas a tarefas são protegidas.

## Planejamento semanal

1. Remove os blocos automáticos da semana e preserva os manuais.
2. Reserva tarefas fixas nos horários definidos.
3. Ordena tarefas flexíveis pela prioridade.
4. Expande a disponibilidade recorrente para os sete dias.
5. Subtrai horários ocupados e distribui o tempo restante em blocos mínimos de 15 minutos.
6. Informa quantas tarefas não couberam integralmente.

## Segurança

- PBKDF2-HMAC-SHA512 com 210 mil iterações e salt individual.
- Compatibilidade de login com hashes PBKDF2-SHA256 da Sprint3 original.
- Tokens HMAC-SHA256 com validade de 30 dias.
- CORS limitado a `FRONTEND_URL`.
- SQL parametrizado em todas as operações.
- Filtro obrigatório por `user_id` nas consultas e alterações.
