using System.Net.Mail;
using System.Text.RegularExpressions;
using SmartPlan.Api.Infrastructure;
using SmartPlan.Api.Models;

namespace SmartPlan.Api.Services;

public static class Validators
{
    private static readonly Regex ColorPattern = new("^#[0-9a-fA-F]{6}$", RegexOptions.Compiled);
    public static string Name(string? value)
    {
        var result = value?.Trim() ?? string.Empty;
        if (result.Length is < 2 or > 120) throw new ApiException(400, "O nome deve ter entre 2 e 120 caracteres.");
        return result;
    }

    public static string Email(string? value)
    {
        var result = value?.Trim().ToLowerInvariant() ?? string.Empty;
        try { _ = new MailAddress(result); }
        catch { throw new ApiException(400, "E-mail inválido."); }
        if (result.Length > 160) throw new ApiException(400, "E-mail inválido.");
        return result;
    }

    public static void Password(string? value)
    {
        if (string.IsNullOrWhiteSpace(value) || value.Length is < 6 or > 200)
            throw new ApiException(400, "A senha deve ter pelo menos 6 caracteres.");
    }

    public static CategoryRequest Category(CategoryRequest value)
    {
        var name = value.Name?.Trim() ?? string.Empty;
        if (name.Length is < 1 or > 80) throw new ApiException(400, "Nome da categoria inválido.");
        if (!ColorPattern.IsMatch(value.Color ?? string.Empty)) throw new ApiException(400, "Cor inválida.");
        return value with { Name = name };
    }

    public static TaskRequest Task(TaskRequest value)
    {
        var title = value.Title?.Trim() ?? string.Empty;
        var description = value.Description?.Trim() ?? string.Empty;
        if (title.Length is < 1 or > 160) throw new ApiException(400, "Título inválido.");
        if (description.Length > 1000) throw new ApiException(400, "Descrição inválida.");
        if (value.Context is not ("Estudo" or "Trabalho" or "Pessoal")) throw new ApiException(400, "Contexto inválido.");
        if (value.Mode is not ("flexible" or "fixed")) throw new ApiException(400, "Modo inválido.");
        if (value.Duration is < 1 or > 100_000) throw new ApiException(400, "Duração inválida.");
        if (value.Criticality is < 1 or > 5 || value.Impact is < 1 or > 5) throw new ApiException(400, "Criticidade e impacto devem ficar entre 1 e 5.");
        if (value.Mode == "fixed")
        {
            if (!value.FixedStart.HasValue || !value.FixedEnd.HasValue) throw new ApiException(400, "Informe início e fim da tarefa fixa.");
            if (value.FixedEnd <= value.FixedStart) throw new ApiException(400, "O fim fixo deve ser posterior ao início.");
            if (value.FixedEnd > value.Deadline) throw new ApiException(400, "A tarefa fixa precisa terminar até o prazo.");
        }
        return value with { Title = title, Description = description };
    }

    public static (TimeSpan Start, TimeSpan End) Availability(AvailabilityRequest value)
    {
        if (value.Days is null || value.Days.Count == 0 || value.Days.Any(day => day is < 1 or > 7))
            throw new ApiException(400, "Escolha ao menos um dia válido.");
        if (!TimeSpan.TryParseExact(value.Start, @"hh\:mm", null, out var start) || !TimeSpan.TryParseExact(value.End, @"hh\:mm", null, out var end))
            throw new ApiException(400, "Horário inválido.");
        if (end <= start) throw new ApiException(400, "O horário final deve ser posterior ao inicial.");
        return (start, end);
    }

    public static void History(HistoryRequest value)
    {
        if (value.End <= value.Start) throw new ApiException(400, "O fim deve ser posterior ao início.");
    }

}
