namespace SmartPlan.Api.Services;

public static class PriorityService
{
    public static int Urgency(DateTime deadline, DateTime? now = null)
    {
        var hours = (deadline - (now ?? DateTime.UtcNow)).TotalHours;
        if (hours <= 24) return 5;
        if (hours <= 72) return 4;
        if (hours <= 168) return 3;
        if (hours <= 336) return 2;
        return 1;
    }

    public static double Calculate(int criticality, int impact, DateTime deadline, DateTime? now = null)
        => Math.Round(0.4 * criticality + 0.4 * Urgency(deadline, now) + 0.2 * impact, 1);
}
