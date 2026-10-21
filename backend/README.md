# SmartPlan Backend

API REST independente em C# com ASP.NET Core e PostgreSQL.

```powershell
Copy-Item .env.example .env
dotnet run --project SmartPlan.Api.csproj
```

A API abre em `http://localhost:8080`, aplica a migração automaticamente e expõe o health check em `/api/health`.

Para executar apenas a migração:

```powershell
dotnet run --project SmartPlan.Api.csproj -- --migrate-only
```

O React acessa somente esta API; as credenciais PostgreSQL permanecem no backend.
