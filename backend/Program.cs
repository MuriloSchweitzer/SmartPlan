using Npgsql;
using Microsoft.AspNetCore.Http.Json;
using SmartPlan.Api.Infrastructure;
using SmartPlan.Api.Models;
using SmartPlan.Api.Services;

EnvFile.Load();
var builder = WebApplication.CreateBuilder(args);
builder.WebHost.UseUrls(Environment.GetEnvironmentVariable("ASPNETCORE_URLS") ?? $"http://0.0.0.0:{Environment.GetEnvironmentVariable("PORT") ?? "8080"}");
builder.Services.Configure<JsonOptions>(options => options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase);
builder.Services.AddSingleton<Database>();
builder.Services.AddSingleton<SecurityService>();
builder.Services.AddSingleton<ProfileService>();
builder.Services.AddSingleton<PlannerService>();
var origins = (builder.Configuration["FRONTEND_URL"] ?? "http://localhost:5173").Split(',', StringSplitOptions.TrimEntries | StringSplitOptions.RemoveEmptyEntries);
builder.Services.AddCors(options => options.AddDefaultPolicy(policy => policy.WithOrigins(origins).AllowAnyHeader().AllowAnyMethod()));

var app = builder.Build();
app.UseCors();
app.Use(async (context, next) =>
{
    try
    {
        await next();
    }
    catch (ApiException exception)
    {
        context.Response.StatusCode = exception.StatusCode;
        await context.Response.WriteAsJsonAsync(new { error = exception.Message });
    }
    catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.UniqueViolation)
    {
        context.Response.StatusCode = 409;
        await context.Response.WriteAsJsonAsync(new { error = "Este registro já existe." });
    }
    catch (PostgresException exception) when (exception.SqlState == PostgresErrorCodes.ForeignKeyViolation)
    {
        context.Response.StatusCode = 400;
        await context.Response.WriteAsJsonAsync(new { error = "O registro está em uso e não pode ser removido." });
    }
});

var database = app.Services.GetRequiredService<Database>();
await database.MigrateAsync();
if (args.Contains("--migrate-only")) return;

app.Use(async (context, next) =>
{
    if (!context.Request.Path.StartsWithSegments("/api/profile"))
    {
        await next();
        return;
    }
    var header = context.Request.Headers.Authorization.ToString();
    var token = header.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) ? header[7..] : null;
    var userId = app.Services.GetRequiredService<SecurityService>().VerifyToken(token);
    if (!userId.HasValue)
    {
        context.Response.StatusCode = 401;
        await context.Response.WriteAsJsonAsync(new { error = "Sessão inválida ou expirada." });
        return;
    }
    context.Items["UserId"] = userId.Value;
    await next();
});

app.MapGet("/api/health", () => Results.Ok(new { status = "ok", backend = "ASP.NET Core", database = "PostgreSQL" }));

app.MapPost("/api/auth/register", async (RegisterRequest request, Database db, SecurityService security, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var name = Validators.Name(request.Name);
    var email = Validators.Email(request.Email);
    Validators.Password(request.Password);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    await using (var existing = connection.Command("SELECT 1 FROM users WHERE email=@p1", transaction, email))
        if (await existing.ExecuteScalarAsync(cancellationToken) is not null) throw new ApiException(409, "Este e-mail já está cadastrado.");
    Guid userId;
    await using (var insert = connection.Command("INSERT INTO users(name,email,password_hash) VALUES(@p1,@p2,@p3) RETURNING id", transaction, name, email, security.HashPassword(request.Password)))
        userId = (Guid)(await insert.ExecuteScalarAsync(cancellationToken) ?? throw new InvalidOperationException());
    await using (var categories = connection.Command("INSERT INTO categories(user_id,name,color) VALUES(@p1,'Estudo','#6558E8'),(@p1,'Trabalho','#168E9B'),(@p1,'Pessoal','#F1715B')", transaction, userId))
        await categories.ExecuteNonQueryAsync(cancellationToken);
    var profile = await profiles.LoadAsync(userId, connection, transaction, cancellationToken);
    await transaction.CommitAsync(cancellationToken);
    return Results.Json(new { token = security.SignToken(userId), profile }, statusCode: 201);
});

app.MapPost("/api/auth/login", async (LoginRequest request, Database db, SecurityService security, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var email = Validators.Email(request.Email);
    await using var connection = await db.OpenAsync(cancellationToken);
    Guid userId = default;
    string? hash = null;
    await using (var command = connection.Command("SELECT id,password_hash FROM users WHERE email=@p1", null, email))
    await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
        if (await reader.ReadAsync(cancellationToken)) { userId = reader.GetGuid(0); hash = reader.GetString(1); }
    if (hash is null || !security.VerifyPassword(request.Password, hash)) throw new ApiException(401, "E-mail ou senha incorretos.");
    return Results.Ok(new { token = security.SignToken(userId), profile = await profiles.LoadAsync(userId, connection, null, cancellationToken) });
});

app.MapGet("/api/profile", async (HttpContext context, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var profile = await profiles.LoadAsync(UserId(context), cancellationToken: cancellationToken) ?? throw new ApiException(404, "Conta não encontrada.");
    return Results.Ok(new { profile });
});

app.MapPut("/api/profile", async (HttpContext context, ProfileRequest request, Database db, SecurityService security, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    var name = Validators.Name(request.Name);
    await using var connection = await db.OpenAsync(cancellationToken);
    if (!string.IsNullOrEmpty(request.NewPassword))
    {
        Validators.Password(request.NewPassword);
        await using var command = connection.Command("UPDATE users SET name=@p1,password_hash=@p2,updated_at=NOW() WHERE id=@p3", null, name, security.HashPassword(request.NewPassword), userId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    else
    {
        await using var command = connection.Command("UPDATE users SET name=@p1,updated_at=NOW() WHERE id=@p2", null, name, userId);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    return Results.Ok(new { profile = await profiles.LoadAsync(userId, connection, null, cancellationToken) });
});

app.MapPost("/api/profile/password", async (HttpContext context, PasswordRequest request, Database db, SecurityService security, CancellationToken cancellationToken) =>
{
    Validators.Password(request.NewPassword);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    string? hash;
    await using (var select = connection.Command("SELECT password_hash FROM users WHERE id=@p1", null, userId)) hash = (string?)await select.ExecuteScalarAsync(cancellationToken);
    if (hash is null) throw new ApiException(404, "Conta não encontrada.");
    if (!security.VerifyPassword(request.CurrentPassword, hash)) throw new ApiException(401, "A senha atual está incorreta.");
    await using (var update = connection.Command("UPDATE users SET password_hash=@p1,updated_at=NOW() WHERE id=@p2", null, security.HashPassword(request.NewPassword), userId)) await update.ExecuteNonQueryAsync(cancellationToken);
    return Results.Ok(new { ok = true });
});

app.MapPost("/api/profile/categories", async (HttpContext context, CategoryRequest body, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var request = Validators.Category(body);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using (var command = connection.Command("INSERT INTO categories(user_id,name,color) VALUES(@p1,@p2,@p3)", null, userId, request.Name, request.Color)) await command.ExecuteNonQueryAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 201, cancellationToken);
});

app.MapPut("/api/profile/categories/{id:guid}", async (HttpContext context, Guid id, CategoryRequest body, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var request = Validators.Category(body);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var command = connection.Command("UPDATE categories SET name=@p1,color=@p2 WHERE id=@p3 AND user_id=@p4", null, request.Name, request.Color, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Categoria não encontrada.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapDelete("/api/profile/categories/{id:guid}", async (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using (var count = connection.Command("SELECT COUNT(*)::int FROM categories WHERE user_id=@p1", null, userId))
        if ((int)(await count.ExecuteScalarAsync(cancellationToken) ?? 0) <= 1) throw new ApiException(400, "Mantenha ao menos uma categoria.");
    await using var command = connection.Command("DELETE FROM categories WHERE id=@p1 AND user_id=@p2", null, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Categoria não encontrada.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapPost("/api/profile/tasks", async (HttpContext context, TaskRequest body, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var request = Validators.Task(body);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await AssertCategory(connection, null, userId, request.CategoryId, cancellationToken);
    await using var command = connection.Command("INSERT INTO tasks(user_id,category_id,title,description,context,deadline,mode,duration_minutes,criticality,impact,fixed_start,fixed_end) VALUES(@p1,@p2,@p3,@p4,@p5::task_context,@p6,@p7::task_mode,@p8,@p9,@p10,@p11,@p12)", null, userId, request.CategoryId, request.Title, NullIfEmpty(request.Description), request.Context, request.Deadline.UtcDateTime, request.Mode, request.Duration, request.Criticality, request.Impact, request.Mode == "fixed" ? request.FixedStart?.UtcDateTime : null, request.Mode == "fixed" ? request.FixedEnd?.UtcDateTime : null);
    await command.ExecuteNonQueryAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 201, cancellationToken);
});

app.MapPut("/api/profile/tasks/{id:guid}", async (HttpContext context, Guid id, TaskRequest body, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var request = Validators.Task(body);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await AssertCategory(connection, null, userId, request.CategoryId, cancellationToken);
    await using var command = connection.Command("UPDATE tasks SET category_id=@p1,title=@p2,description=@p3,context=@p4::task_context,deadline=@p5,mode=@p6::task_mode,duration_minutes=@p7,criticality=@p8,impact=@p9,fixed_start=@p10,fixed_end=@p11 WHERE id=@p12 AND user_id=@p13 AND status IN ('pending','ongoing')", null, request.CategoryId, request.Title, NullIfEmpty(request.Description), request.Context, request.Deadline.UtcDateTime, request.Mode, request.Duration, request.Criticality, request.Impact, request.Mode == "fixed" ? request.FixedStart?.UtcDateTime : null, request.Mode == "fixed" ? request.FixedEnd?.UtcDateTime : null, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Tarefa ativa não encontrada.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapPost("/api/profile/tasks/{id:guid}/complete", (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) => FinishTask(context, id, "completed", db, profiles, cancellationToken));
app.MapPost("/api/profile/tasks/{id:guid}/cancel", (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) => FinishTask(context, id, "cancelled", db, profiles, cancellationToken));

app.MapDelete("/api/profile/tasks/{id:guid}", async (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var command = connection.Command("DELETE FROM tasks WHERE id=@p1 AND user_id=@p2", null, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Tarefa não encontrada.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapPost("/api/profile/availability", async (HttpContext context, AvailabilityRequest request, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var period = Validators.Availability(request);
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    foreach (var day in request.Days.Distinct())
    {
        await using var command = connection.Command("INSERT INTO availability(user_id,weekday,start_time,end_time) VALUES(@p1,@p2,@p3,@p4) ON CONFLICT DO NOTHING", transaction, userId, day, period.Start, period.End);
        await command.ExecuteNonQueryAsync(cancellationToken);
    }
    await transaction.CommitAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 201, cancellationToken);
});

app.MapDelete("/api/profile/availability/{id:guid}", async (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var command = connection.Command("DELETE FROM availability WHERE id=@p1 AND user_id=@p2", null, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Disponibilidade não encontrada.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapPost("/api/profile/history", async (HttpContext context, HistoryRequest request, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    Validators.History(request);
    var userId = UserId(context);
    var duration = (int)Math.Ceiling((request.End - request.Start).TotalMinutes);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    var status = await AssertTask(connection, transaction, userId, request.TaskId, cancellationToken);
    await using (var insert = connection.Command("INSERT INTO task_history(user_id,task_id,started_at,ended_at,duration_minutes) VALUES(@p1,@p2,@p3,@p4,@p5)", transaction, userId, request.TaskId, request.Start.UtcDateTime, request.End.UtcDateTime, duration)) await insert.ExecuteNonQueryAsync(cancellationToken);
    if (request.Complete)
    {
        await using var update = connection.Command("UPDATE tasks SET status='completed',completed_at=NOW() WHERE id=@p1", transaction, request.TaskId);
        await update.ExecuteNonQueryAsync(cancellationToken);
        await using var delete = connection.Command("DELETE FROM agenda_blocks WHERE task_id=@p1 AND starts_at>=NOW()", transaction, request.TaskId);
        await delete.ExecuteNonQueryAsync(cancellationToken);
    }
    else if (status == "pending")
    {
        await using var update = connection.Command("UPDATE tasks SET status='ongoing' WHERE id=@p1", transaction, request.TaskId);
        await update.ExecuteNonQueryAsync(cancellationToken);
    }
    await transaction.CommitAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 201, cancellationToken);
});

app.MapDelete("/api/profile/history/{id:guid}", async (HttpContext context, Guid id, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var command = connection.Command("DELETE FROM task_history WHERE id=@p1 AND user_id=@p2", null, id, userId);
    if (await command.ExecuteNonQueryAsync(cancellationToken) == 0) throw new ApiException(404, "Registro não encontrado.");
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

app.MapPost("/api/profile/agenda/recalculate", async (HttpContext context, RecalculateRequest request, Database db, PlannerService planner, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    var unallocatedCount = await planner.RecalculateAsync(connection, transaction, userId, request.WeekStart, cancellationToken);
    await transaction.CommitAsync(cancellationToken);
    await Touch(connection, userId, cancellationToken);
    return Results.Ok(new { unallocatedCount, profile = await profiles.LoadAsync(userId, connection, null, cancellationToken) });
});

app.MapPut("/api/profile/agenda/{id:guid}/move", async (HttpContext context, Guid id, AgendaMoveRequest request, Database db, ProfileService profiles, CancellationToken cancellationToken) =>
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    Guid taskId = default;
    DateTime oldStart = default, oldEnd = default, deadline = default;
    string? mode = null;
    await using (var select = connection.Command("SELECT ab.task_id,ab.starts_at,ab.ends_at,t.deadline,t.mode::text FROM agenda_blocks ab JOIN tasks t ON t.id=ab.task_id WHERE ab.id=@p1 AND ab.user_id=@p2", transaction, id, userId))
    await using (var reader = await select.ExecuteReaderAsync(cancellationToken))
        if (await reader.ReadAsync(cancellationToken)) { taskId = reader.GetGuid(0); oldStart = reader.GetDateTime(1); oldEnd = reader.GetDateTime(2); deadline = reader.GetDateTime(3); mode = reader.GetString(4); }
    if (mode is null) throw new ApiException(404, "Bloco da agenda não encontrado.");
    var start = request.Start.UtcDateTime;
    var end = start.Add(oldEnd - oldStart);
    if (start < DateTime.UtcNow) throw new ApiException(400, "Não é possível mover uma tarefa para um horário que já passou.");
    if (end > deadline) throw new ApiException(400, "O novo horário ultrapassa o prazo da tarefa.");
    await using (var window = connection.Command("SELECT 1 FROM availability WHERE user_id=@p1 AND weekday=EXTRACT(ISODOW FROM timezone('America/Sao_Paulo',@p2::timestamptz)) AND start_time<=timezone('America/Sao_Paulo',@p2::timestamptz)::time AND end_time>=timezone('America/Sao_Paulo',@p3::timestamptz)::time LIMIT 1", transaction, userId, start, end))
        if (await window.ExecuteScalarAsync(cancellationToken) is null) throw new ApiException(400, "Solte a tarefa dentro de um período disponível.");
    await using (var conflict = connection.Command("SELECT 1 FROM agenda_blocks WHERE user_id=@p1 AND id<>@p2 AND status NOT IN ('cancelled','missed') AND @p3::timestamptz<ends_at AND starts_at<@p4::timestamptz LIMIT 1", transaction, userId, id, start, end))
        if (await conflict.ExecuteScalarAsync(cancellationToken) is not null) throw new ApiException(400, "Este horário já está ocupado por outra tarefa.");
    await using (var update = connection.Command("UPDATE agenda_blocks SET starts_at=@p1,ends_at=@p2,status='manual',manual=TRUE WHERE id=@p3", transaction, start, end, id)) await update.ExecuteNonQueryAsync(cancellationToken);
    if (mode == "fixed") await using (var update = connection.Command("UPDATE tasks SET fixed_start=@p1,fixed_end=@p2 WHERE id=@p3", transaction, start, end, taskId)) await update.ExecuteNonQueryAsync(cancellationToken);
    await transaction.CommitAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
});

await app.RunAsync();

static Guid UserId(HttpContext context) => (Guid)(context.Items["UserId"] ?? throw new ApiException(401, "Sessão inválida."));
static string? NullIfEmpty(string? value) => string.IsNullOrWhiteSpace(value) ? null : value.Trim();

static async Task AssertCategory(NpgsqlConnection connection, NpgsqlTransaction? transaction, Guid userId, Guid categoryId, CancellationToken cancellationToken)
{
    await using var command = connection.Command("SELECT 1 FROM categories WHERE id=@p1 AND user_id=@p2", transaction, categoryId, userId);
    if (await command.ExecuteScalarAsync(cancellationToken) is null) throw new ApiException(400, "Categoria inválida.");
}

static async Task<string> AssertTask(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, Guid taskId, CancellationToken cancellationToken)
{
    await using var command = connection.Command("SELECT status::text FROM tasks WHERE id=@p1 AND user_id=@p2", transaction, taskId, userId);
    return (string?)await command.ExecuteScalarAsync(cancellationToken) ?? throw new ApiException(404, "Tarefa não encontrada.");
}

static async Task<IResult> FinishTask(HttpContext context, Guid taskId, string newStatus, Database db, ProfileService profiles, CancellationToken cancellationToken)
{
    var userId = UserId(context);
    await using var connection = await db.OpenAsync(cancellationToken);
    await using var transaction = await connection.BeginTransactionAsync(cancellationToken);
    var status = await AssertTask(connection, transaction, userId, taskId, cancellationToken);
    if (status is "completed" or "cancelled") throw new ApiException(400, "A tarefa já foi finalizada.");
    var sql = newStatus == "completed" ? "UPDATE tasks SET status='completed',completed_at=NOW() WHERE id=@p1" : "UPDATE tasks SET status='cancelled' WHERE id=@p1";
    await using (var update = connection.Command(sql, transaction, taskId)) await update.ExecuteNonQueryAsync(cancellationToken);
    await using (var delete = connection.Command("DELETE FROM agenda_blocks WHERE task_id=@p1 AND starts_at>=NOW()", transaction, taskId)) await delete.ExecuteNonQueryAsync(cancellationToken);
    await transaction.CommitAsync(cancellationToken);
    return await ProfileResult(connection, profiles, userId, 200, cancellationToken);
}

static async Task Touch(NpgsqlConnection connection, Guid userId, CancellationToken cancellationToken)
{
    await using var command = connection.Command("UPDATE users SET updated_at=NOW() WHERE id=@p1", null, userId);
    await command.ExecuteNonQueryAsync(cancellationToken);
}

static async Task<IResult> ProfileResult(NpgsqlConnection connection, ProfileService profiles, Guid userId, int statusCode, CancellationToken cancellationToken)
{
    await Touch(connection, userId, cancellationToken);
    return Results.Json(new { profile = await profiles.LoadAsync(userId, connection, null, cancellationToken) }, statusCode: statusCode);
}
