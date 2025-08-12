# Autenticação e Autorização

- **AutN**: Cognito/Identity Platform/B2C; MFA; rotação de chaves (JWKS).
- **AutZ**: RBAC (roles) e ABAC (claims/atributos); *policy as code* (OPA/OPA Gatekeeper).
- **Tenancy**: `tenantId` obrigatório em claims; policies que restringem acesso por tenant.
- **Sessões**: expiração curta + refresh; *token binding* no lado do servidor.
