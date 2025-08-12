# AWS — Next.js + Convex + Clerk (Vercel)

- **Next.js** em Vercel (edge + serverless functions).
- **Convex** para dados em tempo real (queries/mutations reativas).
- **Clerk** para identidade (users/orgs, JWT), billing simplificado.
- **EventBridge** para backbone de eventos entre domínios quando necessário.
- **S3** para arquivos; **CloudFront** para CDN.

## Segurança
- JWT do Clerk com `orgId`/`roles` → AutZ no Convex (RBAC/tenant).
- Segredos somente no servidor; *rate limit* em rotas públicas.
- Logs com `tenantId`/`actorId`; auditoria para ações críticas.
