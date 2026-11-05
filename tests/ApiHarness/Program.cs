using Microsoft.EntityFrameworkCore;
using NoName_Hotel.Tests;
using NoName_Hotel.Infrastructure.Data;
using NoName_Hotel.Domain.Entities.Models;
// Test-only HTTP bridge to the SUPPLIED backend controllers/services with isolated SQLite.
// It never reads or writes the configured SQL Server database. No production host changes.
using var original = new TestApplication();
var apiRoot = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, "../../../../../../NoName_Hotel.sol/NoName_Hotel.api"));
using var factory = original.WithWebHostBuilder(host => host.UseContentRoot(apiRoot).ConfigureServices(services =>
{
    // A TestServer has no bound address for the optional health-check UI poller.
    foreach (var descriptor in services.Where(s => s.ServiceType == typeof(IHostedService) &&
        s.ImplementationType?.FullName?.StartsWith("HealthChecks.UI.", StringComparison.Ordinal) == true).ToList())
        services.Remove(descriptor);
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
