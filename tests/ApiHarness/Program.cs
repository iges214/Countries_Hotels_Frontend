using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NoName_Hotel.Application.Contracts;
using NoName_Hotel.Tests;
using NoName_Hotel.Infrastructure.Data;
using NoName_Hotel.Domain.Entities.Models;
// Test-only HTTP bridge to the SUPPLIED backend controllers/services with isolated SQLite.
// It never reads or writes the configured SQL Server database. No production host changes.
// TestServer has no listening address for the optional monitoring poller.
using var original = new TestApplication(healthChecksUiEnabled: false);
var apiRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../NoName_Hotel.sol/NoName_Hotel.api"));
var mail = new CapturedMail();
using var factory = original.WithWebHostBuilder(host => host.UseContentRoot(apiRoot)
    .UseSetting("PasswordReset:FrontendUrl", "http://127.0.0.1:5173")
    .ConfigureServices(services =>
    {
        services.RemoveAll<IHotelMailSender>();
        services.AddSingleton<IHotelMailSender>(mail);
    }));
using (var scope = factory.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<NoName_hotel_DbContext>();
    await db.Database.EnsureCreatedAsync();
    db.Users.AddRange(new ApplicationUser { Id = "guest", UserName = "guest@example.test" }, new ApplicationUser { Id = "other", UserName = "other@example.test" });
    db.Countries.Add(new Country { CountryId = 1, Name = "Nigeria", ShortName = "NG" });
    var hotel = new Hotel { Id = 1, CountryId = 1, Rating = 4.5, PerNightRate = 100, TotalRooms = 6 };
    db.Hotels.Add(hotel);
    db.Rooms.AddRange(TestApplication.SeedRoom(1, 1, 100), TestApplication.SeedRoom(2, 1, 101));
    hotel.Name = "IGES · Isolated test branch";
    hotel.City = "Warri"; hotel.State = "Delta State"; hotel.Address = "Isolated automated test fixture";
    hotel.TotalRooms = 6;
    var twin = TestApplication.SeedRoom(3, 1, 160);
    var vip = TestApplication.SeedRoom(4, 1, 210);
    var suite = TestApplication.SeedRoom(5, 1, 350); suite.IsHoneymoonSuite = true;
    var platinum = TestApplication.SeedRoom(6, 1, 480);
    db.Rooms.AddRange(twin, vip, suite, platinum);
    await db.SaveChangesAsync();
}
using var client = factory.CreateClient(new Microsoft.AspNetCore.Mvc.Testing.WebApplicationFactoryClientOptions
{
    BaseAddress = new Uri("https://localhost"),
    HandleCookies = false
});
var builder = WebApplication.CreateBuilder(args);
builder.Logging.ClearProviders();
builder.WebHost.UseUrls("http://127.0.0.1:5199");
var app = builder.Build();
// TestApplication owns a single in-memory SQLite connection. Keep forwarded HTTP
// requests sequential; production SQL Server uses its normal connection pool.
using var requestGate = new SemaphoreSlim(1, 1);
app.MapGet("/harness/ready", () => "Isolated supplied-backend test host");
app.Run(async context =>
{
    if (context.Request.Path == "/harness/ready") { await context.Response.WriteAsync("Isolated supplied-backend test host"); return; }
    // Only this isolated loopback test bridge exposes captured reset messages. No SMTP is used.
    if (context.Request.Path == "/harness/reset-link")
    {
        if (mail.Links.TryGetValue(context.Request.Query["email"].ToString(), out var link))
            await context.Response.WriteAsJsonAsync(new { link });
        else context.Response.StatusCode = 404;
        return;
    }
    await requestGate.WaitAsync(context.RequestAborted);
    try
    {
    using var message = new HttpRequestMessage(new HttpMethod(context.Request.Method), context.Request.Path + context.Request.QueryString);
    if (context.Request.ContentLength > 0)
    {
        message.Content = new StreamContent(context.Request.Body);
        if (context.Request.ContentType is not null) message.Content.Headers.TryAddWithoutValidation("Content-Type", context.Request.ContentType);
    }
    if (context.Request.Headers.TryGetValue("Authorization", out var auth)) message.Headers.TryAddWithoutValidation("Authorization", auth.ToString());
    foreach (var header in new[] { "Cookie", "X-IGES-Session", "Sec-Fetch-Site" })
        if (context.Request.Headers.TryGetValue(header, out var value))
            message.Headers.TryAddWithoutValidation(header, value.ToArray());
    using var response = await client.SendAsync(message);
    context.Response.StatusCode = (int)response.StatusCode;
    context.Response.ContentType = response.Content.Headers.ContentType?.ToString() ?? "application/json";
    if (response.Headers.TryGetValues("Retry-After", out var retry)) context.Response.Headers["Retry-After"] = retry.First();
    if (response.Headers.TryGetValues("Set-Cookie", out var cookies))
        context.Response.Headers.Append("Set-Cookie", cookies.ToArray());
    await response.Content.CopyToAsync(context.Response.Body);
    }
    finally { requestGate.Release(); }
});
await app.RunAsync();

sealed class CapturedMail : IHotelMailSender
{
    public bool IsConfigured => true;
    public System.Collections.Concurrent.ConcurrentDictionary<string, string> Links { get; } = new(StringComparer.OrdinalIgnoreCase);
    public Task SendAsync(string recipient, string subject, string body, CancellationToken cancellationToken)
    {
        Links[recipient] = body.Split('\n').Single(line => line.StartsWith("http://127.0.0.1:5173/", StringComparison.Ordinal));
        return Task.CompletedTask;
    }
    public Task SendReplyAsync(string recipient, string subject, string body, string? replyTo, CancellationToken cancellationToken) =>
        Task.CompletedTask;
}
