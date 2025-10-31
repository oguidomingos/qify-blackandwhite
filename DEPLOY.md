# 🚀 Deploy para Vercel - Evolution API Integration

## Status Atual
✅ Código commitado e pushed para branch: `claude/evolution-api-credentials-011CUeRrmSD4z9yb95TTmfHg`

## Opções de Deploy

### Opção 1: Deploy Automático via Preview (RECOMENDADO)
A Vercel já deve ter criado um **preview deployment** automaticamente para a branch:
- Acesse: https://vercel.com/[seu-projeto]/deployments
- Procure pelo deployment da branch `claude/evolution-api-credentials-011CUeRrmSD4z9yb95TTmfHg`
- O deployment preview terá uma URL única (ex: `qify-...-git-claude-evolution-...vercel.app`)

### Opção 2: Promover Preview para Produção
1. Acesse o dashboard da Vercel
2. Vá em "Deployments"
3. Encontre o deployment da branch `claude/evolution-api-credentials-011CUeRrmSD4z9yb95TTmfHg`
4. Clique em "Promote to Production"

### Opção 3: Merge via Pull Request (GitHub)
1. Acesse: https://github.com/oguidomingos/qify-blackandwhite/pull/new/claude/evolution-api-credentials-011CUeRrmSD4z9yb95TTmfHg
2. Crie o Pull Request
3. Merge para `main`
4. Vercel fará deploy automático da `main`

### Opção 4: Deploy Manual via CLI
```bash
# Instalar Vercel CLI (se necessário)
npm i -g vercel

# Na raiz do projeto
vercel --prod
```

## ⚙️ Variáveis de Ambiente CRÍTICAS

**IMPORTANTE**: Configure estas variáveis no dashboard da Vercel antes do deploy:

### Evolution API (OBRIGATÓRIO)
```
EVOLUTION_BASE_URL=https://api.icebergcompany.com.br
EVOLUTION_API_KEY=509dbd54-c20c-4a5b-b889-a0494a861f5a
EVOLUTION_INSTANCE_NAME=oguidomingos
EVOLUTION_WEBHOOK_SECRET=your_webhook_secret_here
EVOLUTION_SHARED_TOKEN=your_shared_token_32_chars
```

### Clerk (já deve estar configurado)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```

### Convex (já deve estar configurado)
```
NEXT_PUBLIC_CONVEX_URL=https://your-convex-deployment.convex.dev
CONVEX_DEPLOYMENT=dev:your-deployment-name
CONVEX_AUTH_SITE_URL=https://seu-dominio.vercel.app
```

### Gemini AI (opcional)
```
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## 📝 Passos para Configurar Variáveis na Vercel

1. Acesse https://vercel.com/[seu-projeto]/settings/environment-variables
2. Adicione cada variável acima
3. Selecione os ambientes: `Production`, `Preview`, `Development`
4. Clique em "Save"
5. Faça um novo deployment (ou redeploy o atual)

## 🧪 Após o Deploy

### 1. Inicializar o Usuário Admin123
```bash
curl -X POST https://seu-dominio.vercel.app/api/admin/setup-admin123
```

Resposta esperada:
```json
{
  "success": true,
  "message": "Admin123 user setup completed successfully",
  "data": {
    "orgId": "...",
    "instanceName": "oguidomingos",
    "evolutionStatus": "connected"
  }
}
```

### 2. Testar a Integração

**Testar Conversas:**
```bash
curl https://seu-dominio.vercel.app/api/evolution/chats?period=week&activeOnly=true
```

**Testar Mensagens:**
```bash
curl https://seu-dominio.vercel.app/api/evolution/messages?period=week&limit=50
```

**Testar Conversa Completa:**
```bash
curl "https://seu-dominio.vercel.app/api/evolution/conversation?contactId=5511999999999@s.whatsapp.net&limit=100"
```

### 3. Acessar o Inbox
Acesse: `https://seu-dominio.vercel.app/inbox`

Você deve ver:
- ✅ Lista de conversas da instância `oguidomingos`
- ✅ Estatísticas das conversas
- ✅ Ao clicar em um contato, todas as mensagens são carregadas
- ✅ Painel direito mostra as últimas 20 mensagens

## 🔍 Troubleshooting

### Erro: "Evolution API indisponível"
- Verifique se as variáveis `EVOLUTION_BASE_URL` e `EVOLUTION_API_KEY` estão corretas
- Teste a API diretamente: `curl -H "apikey: 509dbd54-c20c-4a5b-b889-a0494a861f5a" https://api.icebergcompany.com.br/instance/connectionState/oguidomingos`

### Erro: "Nenhuma conversa ativa"
- Execute o setup do admin123: `POST /api/admin/setup-admin123`
- Verifique se a instância `oguidomingos` está conectada na Evolution API
- Acesse o manager: https://api.icebergcompany.com.br/manager/

### Deploy não foi triggered
- Verifique os logs no dashboard da Vercel
- Confirme que o webhook do GitHub está ativo
- Force um novo deployment manualmente

## 📊 Monitoramento

Após o deploy, monitore:
- **Vercel Dashboard**: https://vercel.com/[seu-projeto]
- **Logs de Runtime**: Para ver erros de API
- **Analytics**: Para ver uso das rotas

## ✨ Mudanças Nesta Versão

- ✅ Integração completa com Evolution API 2.0
- ✅ Instância `oguidomingos` configurada
- ✅ Nova rota `/api/evolution/conversation` para buscar histórico completo
- ✅ Inbox atualizado para exibir todas as mensagens
- ✅ Setup automático do usuário admin123
- ✅ Suporte para análise de IA (últimas 20 mensagens)

---

**Branch**: `claude/evolution-api-credentials-011CUeRrmSD4z9yb95TTmfHg`
**Commit**: `4f904a34` - Configure Evolution API integration for oguidomingos instance
