using Npgsql;

namespace SmartPlan.Api.Infrastructure;

public static class DbCommandExtensions
{
    public static NpgsqlCommand Command(this NpgsqlConnection connection, string sql, NpgsqlTransaction? transaction = null, params object?[] values)
    {
        var command = new NpgsqlCommand(sql, connection, transaction);
        for (var index = 0; index < values.Length; index++)
            command.Parameters.AddWithValue($"p{index + 1}", values[index] ?? DBNull.Value);
        return command;
    }
}
