# Configuração do Deepgram para Reconhecimento de Voz

## Por que Deepgram?

A Web Speech API do navegador depende dos servidores da Google e pode falhar com erros de "network" em alguns ambientes. O Deepgram fornece uma solução confiável e de alta qualidade para transcrição de áudio.

## Benefícios

- ✅ **Confiável**: Funciona sempre, sem depender de APIs do navegador
- ✅ **Português BR nativo**: Modelo treinado especificamente para português brasileiro
- ✅ **Alta qualidade**: Melhor precisão que Web Speech API
- ✅ **Transparente**: Fallback automático - tenta Web Speech primeiro, depois Deepgram

## Como obter uma chave de API

### 1. Criar conta no Deepgram

1. Acesse: https://console.deepgram.com/signup
2. Crie uma conta gratuita
3. **Crédito inicial**: $200 grátis para testar!

### 2. Criar API Key

1. No console, vá em **API Keys** (menu lateral)
2. Clique em **Create a New API Key**
3. Dê um nome (ex: "Qify Production")
4. Copie a chave gerada (começa com algo como `aaaaaabbbbbbccccccdddddd...`)

### 3. Adicionar no Vercel

1. Vá no dashboard do seu projeto na Vercel
2. Settings → Environment Variables
3. Adicione:
   - **Name**: `DEEPGRAM_API_KEY`
   - **Value**: Cole sua chave da Deepgram
   - **Environments**: Production, Preview, Development
4. Clique em **Save**
5. Faça um novo deploy (ou espere o próximo push)

### 4. Testar localmente (opcional)

Se quiser testar localmente antes de fazer deploy:

```bash
# No arquivo .env.local
DEEPGRAM_API_KEY=sua_chave_aqui
```

```bash
npm run dev
```

## Preços

- **Pay as you go**: ~$0.0043 por minuto de áudio
- **Exemplo**: 1000 conversas de 1 minuto = ~$4.30
- **Crédito inicial**: $200 = ~46.000 minutos de transcrição

## Como funciona o Fallback

O sistema tenta nesta ordem:

1. **Web Speech API** (grátis, do navegador)
   - Se funcionar: usa isso ✅
   - Se falhar 3 vezes: passa para Deepgram

2. **Deepgram API** (pago, confiável)
   - Sempre funciona
   - Maior qualidade
   - Pequeno custo

## Verificar se está funcionando

No console do navegador você verá:

```
🎬 [Hybrid] Starting recording...
🎤 [Hybrid] Trying Web Speech API first
```

Se Web Speech falhar:
```
⚠️ [Hybrid] Web Speech unavailable, switching to Deepgram
🎙️ [Hybrid] Using Deepgram
📤 [Deepgram] Sending audio to transcription API...
✅ [Deepgram] Transcription received
```

No header do chat aparecerá um badge mostrando qual método está ativo:
- 🔵 **"Web Speech"** - Usando API do navegador (grátis)
- 🟣 **"Deepgram"** - Usando Deepgram (pago, confiável)

## Suporte

- Documentação oficial: https://developers.deepgram.com/
- Status da API: https://status.deepgram.com/
- Suporte: https://deepgram.com/contact-us
