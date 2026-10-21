using Npgsql;
using SmartPlan.Api.Infrastructure;
using SmartPlan.Api.Models;

namespace SmartPlan.Api.Services;

public sealed class PlannerService
{
    public async Task<int> RecalculateAsync(NpgsqlConnection connection, NpgsqlTransaction transaction, Guid userId, DateTimeOffset weekStart, CancellationToken cancellationToken = default)
    {
        var start = weekStart.UtcDateTime;
        var end = weekStart.AddDays(7).UtcDateTime;
        await using (var delete = connection.Command("DELETE FROM agenda_blocks WHERE user_id=@p1 AND manual=FALSE AND starts_at>=@p2 AND starts_at<@p3", transaction, userId, start, end))
            await delete.ExecuteNonQueryAsync(cancellationToken);

        var tasks = new List<PlannerTask>();
        await using (var command = connection.Command("SELECT id,title,deadline,mode::text,duration_minutes,criticality,impact,fixed_start,fixed_end FROM tasks WHERE user_id=@p1 AND status IN ('pending','ongoing') AND deadline>=@p2", transaction, userId, start))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            while (await reader.ReadAsync(cancellationToken)) tasks.Add(new PlannerTask(reader.GetGuid(0), reader.GetString(1), reader.GetDateTime(2), reader.GetString(3), reader.GetInt32(4), reader.GetInt16(5), reader.GetInt16(6), reader.IsDBNull(7) ? null : reader.GetDateTime(7), reader.IsDBNull(8) ? null : reader.GetDateTime(8)));

        var windows = new List<PlannerWindow>();
        await using (var command = connection.Command("SELECT weekday,EXTRACT(HOUR FROM start_time)::int*60+EXTRACT(MINUTE FROM start_time)::int,EXTRACT(HOUR FROM end_time)::int*60+EXTRACT(MINUTE FROM end_time)::int FROM availability WHERE user_id=@p1 ORDER BY weekday,start_time", transaction, userId))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            while (await reader.ReadAsync(cancellationToken)) windows.Add(new PlannerWindow(reader.GetInt16(0), reader.GetInt32(1), reader.GetInt32(2)));

        var executed = new Dictionary<Guid, int>();
        await using (var command = connection.Command("SELECT task_id,COALESCE(SUM(duration_minutes),0)::int FROM task_history WHERE user_id=@p1 GROUP BY task_id", transaction, userId))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            while (await reader.ReadAsync(cancellationToken)) executed[reader.GetGuid(0)] = reader.GetInt32(1);

        var blocks = new List<PlannerBlock>();
        await using (var command = connection.Command("SELECT id,task_id,starts_at,ends_at,status::text,manual FROM agenda_blocks WHERE user_id=@p1 AND manual=TRUE AND starts_at>=@p2 AND starts_at<@p3", transaction, userId, start, end))
        await using (var reader = await command.ExecuteReaderAsync(cancellationToken))
            while (await reader.ReadAsync(cancellationToken)) blocks.Add(ReadBlock(reader));

        foreach (var task in tasks.Where(item => item.Mode == "fixed" && item.FixedStart >= start && item.FixedStart < end))
        {
            await using var command = connection.Command("INSERT INTO agenda_blocks(user_id,task_id,starts_at,ends_at,status,manual) VALUES(@p1,@p2,@p3,@p4,'planned',FALSE) RETURNING id,task_id,starts_at,ends_at,status::text,manual", transaction, userId, task.Id, task.FixedStart!, task.FixedEnd!);
            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            if (await reader.ReadAsync(cancellationToken)) blocks.Add(ReadBlock(reader));
        }

        var unallocatedCount = 0;
        foreach (var task in tasks.Where(item => item.Mode == "flexible").OrderByDescending(item => PriorityService.Calculate(item.Criticality, item.Impact, item.Deadline)))
        {
            var remaining = Math.Max(0, task.Duration - executed.GetValueOrDefault(task.Id));
            for (var dayIndex = 0; dayIndex < 7 && remaining > 0; dayIndex++)
            {
                var day = start.AddDays(dayIndex);
                if (day > task.Deadline) break;
                foreach (var window in windows.Where(item => item.Weekday == dayIndex + 1))
                {
                    var cursor = day.AddMinutes(window.StartMinutes);
                    var windowEnd = day.AddMinutes(window.EndMinutes);
                    var occupied = blocks.Where(block => block.Start < windowEnd && block.End > cursor).OrderBy(block => block.Start).ToList();
                    occupied.Add(new PlannerBlock(Guid.Empty, Guid.Empty, windowEnd, windowEnd, "planned", false));
                    foreach (var busy in occupied)
                    {
                        if (busy.Start > cursor && remaining > 0)
                        {
                            var amount = Math.Min(remaining, (int)Math.Floor((busy.Start - cursor).TotalMinutes));
                            if (amount >= 15)
                            {
                                var blockEnd = cursor.AddMinutes(amount);
                                if (blockEnd <= task.Deadline)
                                {
                                    await using var command = connection.Command("INSERT INTO agenda_blocks(user_id,task_id,starts_at,ends_at,status,manual) VALUES(@p1,@p2,@p3,@p4,'planned',FALSE) RETURNING id,task_id,starts_at,ends_at,status::text,manual", transaction, userId, task.Id, cursor, blockEnd);
                                    await using var reader = await command.ExecuteReaderAsync(cancellationToken);
                                    if (await reader.ReadAsync(cancellationToken)) blocks.Add(ReadBlock(reader));
                                    remaining -= amount;
                                    cursor = blockEnd;
                                }
                            }
                        }
                        if (busy.End > cursor) cursor = busy.End;
                    }
                }
            }
            if (remaining > 0) unallocatedCount++;
        }
        return unallocatedCount;
    }

    private static PlannerBlock ReadBlock(NpgsqlDataReader reader) => new(reader.GetGuid(0), reader.GetGuid(1), reader.GetDateTime(2), reader.GetDateTime(3), reader.GetString(4), reader.GetBoolean(5));
}
