using System.Security.Cryptography;
using System.Text;
using System.Text.Json;

namespace SmartPlan.Api.Services;

public sealed class SecurityService
{
    private const int Iterations = 210_000;
    private static readonly TimeSpan TokenLifetime = TimeSpan.FromDays(30);
    private readonly byte[] _secret;

    public SecurityService(IConfiguration configuration)
    {
        var value = configuration["JWT_SECRET"]?.Trim();
        if (string.IsNullOrWhiteSpace(value) || value.Length < 32)
            throw new InvalidOperationException("JWT_SECRET não configurado ou inválido.");
        _secret = Encoding.UTF8.GetBytes(value);
    }

    public string HashPassword(string password)
    {
        Validators.Password(password);
        var salt = RandomNumberGenerator.GetBytes(16);
        var hash = Rfc2898DeriveBytes.Pbkdf2(password, salt, Iterations, HashAlgorithmName.SHA512, 32);
        return $"{Iterations}${Convert.ToHexString(salt).ToLowerInvariant()}${Convert.ToHexString(hash).ToLowerInvariant()}";
    }

    public bool VerifyPassword(string password, string encoded)
    {
        try
        {
            if (encoded.StartsWith("PBKDF2-SHA256$", StringComparison.Ordinal))
            {
                var legacy = encoded.Split('$');
                var iterations = int.Parse(legacy[1]);
                var salt = Convert.FromBase64String(legacy[2]);
                var expected = Convert.FromBase64String(legacy[3]);
                var actual = Rfc2898DeriveBytes.Pbkdf2(password, salt, iterations, HashAlgorithmName.SHA256, expected.Length);
                return CryptographicOperations.FixedTimeEquals(actual, expected);
            }

            var parts = encoded.Split('$');
            if (parts.Length != 3 || !int.TryParse(parts[0], out var count)) return false;
            var nodeSalt = Convert.FromHexString(parts[1]);
            var stored = Convert.FromHexString(parts[2]);
            var supplied = Rfc2898DeriveBytes.Pbkdf2(password, nodeSalt, count, HashAlgorithmName.SHA512, stored.Length);
            return CryptographicOperations.FixedTimeEquals(supplied, stored);
        }
        catch
        {
            return false;
        }
    }

    public string SignToken(Guid userId)
    {
        var payload = JsonSerializer.SerializeToUtf8Bytes(new TokenPayload(userId, DateTimeOffset.UtcNow.Add(TokenLifetime).ToUnixTimeSeconds()));
        var encodedPayload = Base64UrlEncode(payload);
        using var hmac = new HMACSHA256(_secret);
        var signature = Base64UrlEncode(hmac.ComputeHash(Encoding.UTF8.GetBytes(encodedPayload)));
        return $"{encodedPayload}.{signature}";
    }

    public Guid? VerifyToken(string? token)
    {
        try
        {
            var parts = (token ?? string.Empty).Split('.');
            if (parts.Length != 2) return null;
            using var hmac = new HMACSHA256(_secret);
            var expected = hmac.ComputeHash(Encoding.UTF8.GetBytes(parts[0]));
            var received = Base64UrlDecode(parts[1]);
            if (!CryptographicOperations.FixedTimeEquals(expected, received)) return null;
            var payload = JsonSerializer.Deserialize<TokenPayload>(Base64UrlDecode(parts[0]));
            return payload is not null && payload.Exp > DateTimeOffset.UtcNow.ToUnixTimeSeconds() ? payload.Sub : null;
        }
        catch
        {
            return null;
        }
    }

    private static string Base64UrlEncode(byte[] value) => Convert.ToBase64String(value).TrimEnd('=').Replace('+', '-').Replace('/', '_');
    private static byte[] Base64UrlDecode(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        padded += new string('=', (4 - padded.Length % 4) % 4);
        return Convert.FromBase64String(padded);
    }

    private sealed record TokenPayload(Guid Sub, long Exp);
}
