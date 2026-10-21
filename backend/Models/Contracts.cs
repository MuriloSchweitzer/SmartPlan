namespace SmartPlan.Api.Models;

public sealed record RegisterRequest(string Name, string Email, string Password);
public sealed record LoginRequest(string Email, string Password);
public sealed record ProfileRequest(string Name, string? NewPassword);
public sealed record PasswordRequest(string CurrentPassword, string NewPassword);
public sealed record CategoryRequest(string Name, string Color);
public sealed record AvailabilityRequest(IReadOnlyList<int> Days, string Start, string End);
public sealed record HistoryRequest(Guid TaskId, DateTimeOffset Start, DateTimeOffset End, bool Complete = false);
public sealed record RecalculateRequest(DateTimeOffset WeekStart);
public sealed record AgendaMoveRequest(DateTimeOffset Start);

public sealed record TaskRequest(
    string Title,
    string? Description,
    Guid CategoryId,
    string Context,
    DateTimeOffset Deadline,
    string Mode,
    int Duration,
    int Criticality,
    int Impact,
    DateTimeOffset? FixedStart,
    DateTimeOffset? FixedEnd);

public sealed record UserDto(Guid Id, string Name, string Email, DateTime CreatedAt);
public sealed record CategoryDto(Guid Id, string Name, string Color);
public sealed record TaskDto(
    Guid Id,
    Guid CategoryId,
    string Title,
    string Description,
    string Context,
    DateTime Deadline,
    string Mode,
    int Duration,
    int Criticality,
    int Impact,
    DateTime? FixedStart,
    DateTime? FixedEnd,
    string Status,
    DateTime CreatedAt,
    DateTime? CompletedAt);
public sealed record AvailabilityDto(Guid Id, int Day, string Start, string End);
public sealed record AgendaBlockDto(Guid Id, Guid TaskId, DateTime Start, DateTime End, string Status, bool Manual);
public sealed record HistoryDto(Guid Id, Guid TaskId, Guid? AgendaBlockId, DateTime Start, DateTime End, int Duration);
public sealed record ProfileDto(
    UserDto User,
    IReadOnlyList<CategoryDto> Categories,
    IReadOnlyList<TaskDto> Tasks,
    IReadOnlyList<AvailabilityDto> Availability,
    IReadOnlyList<AgendaBlockDto> Agenda,
    IReadOnlyList<HistoryDto> History,
    DateTime UpdatedAt);

internal sealed record PlannerTask(
    Guid Id,
    string Title,
    DateTime Deadline,
    string Mode,
    int Duration,
    int Criticality,
    int Impact,
    DateTime? FixedStart,
    DateTime? FixedEnd);

internal sealed record PlannerWindow(int Weekday, int StartMinutes, int EndMinutes);
internal sealed record PlannerBlock(Guid Id, Guid TaskId, DateTime Start, DateTime End, string Status, bool Manual);
