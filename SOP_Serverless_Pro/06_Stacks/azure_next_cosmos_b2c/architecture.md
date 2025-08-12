# Azure — Next.js + Cosmos DB + Azure AD B2C

- **Next.js** em Azure Static Web Apps (ou Vercel).
- **Cosmos DB** com partition key por tenant.
- **Azure AD B2C** para identidade (OIDC).
- **Event Grid** para eventos; **Functions** para compute.

## Considerações
- RU/s planejadas, *autoscale*; TTL de coleções de logs.
- Application Insights para métricas e tracing.
