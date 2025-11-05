# ⚙️ Configuração da API Gemini para Assistente de Voz

O assistente de voz usa o Google Gemini 2.0 Flash para análise de conversas e geração de sugestões.

## 🔑 Obter API Key do Gemini

1. **Acesse**: https://aistudio.google.com/app/apikey
2. **Faça login** com sua conta Google
3. **Clique em "Create API Key"**
4. **Copie** a API key gerada (formato: `AIza...`)

## 🚀 Configurar na Vercel

### Opção 1: Via Dashboard (Recomendado)

1. Acesse: https://vercel.com/[seu-projeto]/settings/environment-variables
2. Clique em **"Add New"**
3. Preencha:
   - **Name**: `GEMINI_API_KEY`
   - **Value**: Cole a API key que você copiou
   - **Environment**: Marque todas (Production, Preview, Development)
4. Clique em **"Save"**
5. **Redeploy** o projeto:
   - Vá em "Deployments"
   - Clique nos 3 pontinhos do último deployment
   - Clique "Redeploy"

### Opção 2: Via CLI

```bash
# Instale a CLI da Vercel se ainda não tiver
npm i -g vercel

# Configure a variável de ambiente
vercel env add GEMINI_API_KEY

# Cole sua API key quando solicitado
# Selecione: Production, Preview, Development (todas)

# Faça redeploy
vercel --prod
```

## 🧪 Testar Localmente

Para testar no seu ambiente local:

```bash
# Adicione ao .env.local
echo 'GEMINI_API_KEY=sua-api-key-aqui' >> .env.local

# Reinicie o servidor de desenvolvimento
npm run dev
```

## ✅ Verificar se Funcionou

Depois de configurar e fazer redeploy:

1. **Abra o Console do navegador** (F12)
2. **Selecione uma conversa** no inbox
3. **Clique em "Analisar Conversa com IA"**
4. **Observe os logs** no console:
   - ✅ `🔍 Starting conversation analysis...`
   - ✅ `📡 API Response status: 200`
   - ✅ `📦 API Response data: { success: true, summary: "..." }`
   - ✅ `✅ Analysis complete, speaking summary`

### Se Der Erro:

**Erro de API Key:**
```
❌ API error: Gemini API key not configured
```
**Solução**: Configure a `GEMINI_API_KEY` conforme instruções acima

**Erro 500:**
```
📡 API Response status: 500
```
**Solução**: Verifique os logs da Vercel em Runtime Logs

**Erro de Quota:**
```
❌ API error: Quota exceeded
```
**Solução**: O Gemini tem limite gratuito. Aguarde ou use outra conta.

## 📊 Limites da API Gratuita

- **Requests por minuto**: 15
- **Requests por dia**: 1,500
- **Tokens por minuto**: 1 milhão

Para uso em produção, considere criar um projeto no Google Cloud Platform com billing habilitado.

## 🔒 Segurança

⚠️ **NUNCA** commite a API key no código ou no `.env.local`!

O arquivo `.env.local` já está no `.gitignore`, mas sempre verifique antes de fazer commit:

```bash
# Verificar se não tem API keys expostas
git diff

# Se encontrar, remova antes de commitar!
```

## 📝 Modelos Disponíveis

Atualmente usando: `gemini-2.0-flash-exp`

Outros modelos disponíveis:
- `gemini-1.5-pro` - Mais preciso, mais lento
- `gemini-1.5-flash` - Mais rápido, menos preciso
- `gemini-2.0-flash-exp` - Experimental, melhor equilíbrio

Para trocar, edite:
- `/app/api/ai/analyze-conversation/route.ts` (linha 17)
- `/app/api/ai/suggest-response/route.ts` (linha 17)

## 🆘 Suporte

Se continuar com problemas:

1. **Verifique os logs da Vercel**: Runtime Logs
2. **Verifique o console do navegador**: Logs detalhados com emojis
3. **Teste a API diretamente**: https://aistudio.google.com/app/prompts/new_chat

---

**Projeto**: Qify WhatsApp Inbox
**Docs Gemini**: https://ai.google.dev/gemini-api/docs
**Docs Vercel Env**: https://vercel.com/docs/projects/environment-variables
