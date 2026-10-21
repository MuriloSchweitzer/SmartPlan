# Arquitetura do SmartPlan

## Separação das camadas

### Frontend

Aplicação React responsável exclusivamente pela interface, navegação e estado da sessão. Toda persistência usa a API configurada em `VITE_API_URL`.

### Backend

API REST Express responsável por:

- autenticação e sessões assinadas;
- autorização por usuário;
- validação dos dados;
- regras de tarefas e histórico;
- cálculo de prioridade;
- geração determinística da agenda;
- transações com o PostgreSQL.

### Banco de dados

O PostgreSQL é uma camada separada e não contém lógica de interface. Restrições, chaves estrangeiras e índices garantem integridade mesmo quando a API recebe requisições concorrentes.

## Modelo relacional

```text
users
 ├── categories
 ├── tasks ── categories
 │    ├── agenda_blocks
 │    └── task_history
 └── availability
```

Todas as entidades pertencentes a um usuário carregam `user_id`. Exclusões de conta e tarefas usam cascata; categorias vinculadas a tarefas não podem ser removidas.

## Planejamento semanal

1. Remove blocos automáticos da semana e preserva blocos manuais.
2. Reserva tarefas fixas nos horários definidos.
3. Ordena tarefas flexíveis pela prioridade calculada.
4. Expande a disponibilidade recorrente para os sete dias da semana.
5. Subtrai blocos ocupados e distribui o tempo restante em intervalos mínimos de 15 minutos.
6. Informa quantas tarefas não couberam integralmente.

## Segurança

- Senhas derivadas com PBKDF2-HMAC-SHA512, 210 mil iterações e salt individual.
- Tokens de sessão assinados com HMAC-SHA256 e validade de 30 dias.
- CORS restrito ao domínio informado em `FRONTEND_URL`.
- Helmet aplica cabeçalhos HTTP defensivos.
- Consultas parametrizadas impedem injeção de SQL.
- O backend sempre filtra consultas e mutações por `user_id`.
