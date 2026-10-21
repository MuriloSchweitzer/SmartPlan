FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /src
COPY backend/SmartPlan.Api.csproj backend/
RUN dotnet restore backend/SmartPlan.Api.csproj
COPY backend/ backend/
COPY database/ database/
RUN dotnet publish backend/SmartPlan.Api.csproj -c Release -o /app/publish --no-restore

FROM mcr.microsoft.com/dotnet/aspnet:6.0 AS runtime
WORKDIR /app
COPY --from=build /app/publish .
EXPOSE 8080
ENTRYPOINT ["dotnet", "SmartPlan.Api.dll"]
