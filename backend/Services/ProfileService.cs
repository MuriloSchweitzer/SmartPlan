using Npgsql;
using SmartPlan.Api.Infrastructure;
using SmartPlan.Api.Models;

namespace SmartPlan.Api.Services;

public sealed class ProfileService
{
    private readonly Database _database;

    public ProfileService(Database database) => _database = database;

    public async Task<ProfileDto?> LoadAsync(Guid userId, NpgsqlConnection? connection = null, NpgsqlTransaction? transaction = null, CancellationToken cancellationToken = default)
    {
        var ownsConnection = connection is null;
        connection ??= await _database.OpenAsync(cancellationToken);
        try
        {
            UserDto? user = null;
            DateTime updatedAt = default;
            await using (var command = connection.Command("SELECT id,name,email,created_at,updated_at FROM users WHERE id=@p1", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            {
                if (await reader.ReadAsync(cancellationToken))
                {
                    user = new UserDto(reader.GetGuid(0), reader.GetString(1), reader.GetString(2), reader.GetDateTime(3));
                    updatedAt = reader.GetDateTime(4);
                }
            }
            if (user is null) return null;

            var categories = new List<CategoryDto>();
            await using (var command = connection.Command("SELECT id,name,color FROM categories WHERE user_id=@p1 ORDER BY created_at,name", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken)) categories.Add(new CategoryDto(reader.GetGuid(0), reader.GetString(1), reader.GetString(2)));

            var tasks = new List<TaskDto>();
            await using (var command = connection.Command(@"
                SELECT id,category_id,title,COALESCE(description,''),context::text,deadline,mode::text,
                       duration_minutes,criticality,impact,fixed_start,fixed_end,status::text,created_at,completed_at
                FROM tasks WHERE user_id=@p1 ORDER BY created_at DESC
                ", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken))
                    tasks.Add(new TaskDto(reader.GetGuid(0), reader.GetGuid(1), reader.GetString(2), reader.GetString(3), reader.GetString(4), reader.GetDateTime(5), reader.GetString(6), reader.GetInt32(7), reader.GetInt16(8), reader.GetInt16(9), reader.IsDBNull(10) ? null : reader.GetDateTime(10), reader.IsDBNull(11) ? null : reader.GetDateTime(11), reader.GetString(12), reader.GetDateTime(13), reader.IsDBNull(14) ? null : reader.GetDateTime(14)));

            var availability = new List<AvailabilityDto>();
            await using (var command = connection.Command("SELECT id,weekday,to_char(start_time,'HH24:MI'),to_char(end_time,'HH24:MI') FROM availability WHERE user_id=@p1 ORDER BY weekday,start_time", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken)) availability.Add(new AvailabilityDto(reader.GetGuid(0), reader.GetInt16(1), reader.GetString(2), reader.GetString(3)));

            var agenda = new List<AgendaBlockDto>();
            await using (var command = connection.Command("SELECT id,task_id,starts_at,ends_at,status::text,manual FROM agenda_blocks WHERE user_id=@p1 ORDER BY starts_at", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken)) agenda.Add(new AgendaBlockDto(reader.GetGuid(0), reader.GetGuid(1), reader.GetDateTime(2), reader.GetDateTime(3), reader.GetString(4), reader.GetBoolean(5)));

            var history = new List<HistoryDto>();
            await using (var command = connection.Command("SELECT id,task_id,agenda_block_id,started_at,ended_at,duration_minutes FROM task_history WHERE user_id=@p1 ORDER BY started_at DESC", transaction, userId))
            await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
                while (await reader.ReadAsync(cancellationToken)) history.Add(new HistoryDto(reader.GetGuid(0), reader.GetGuid(1), reader.IsDBNull(2) ? null : reader.GetGuid(2), reader.GetDateTime(3), reader.GetDateTime(4), reader.GetInt32(5)));

            return new ProfileDto(user, categories, tasks, availability, agenda, history, updatedAt);
        }
        finally
        {
            if (ownsConnection) await connection.DisposeAsync();
        }
    }
}
