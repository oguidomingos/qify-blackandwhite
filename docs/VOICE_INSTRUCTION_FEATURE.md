# Funcionalidade de Instrução por Voz

## 📝 Visão Geral

A funcionalidade de **Instrução por Voz** permite que vendedores criem mensagens para clientes através de uma conversa natural por voz com a IA, similar ao modo de conversa do ChatGPT.

## 🎯 Objetivo

Facilitar a criação de mensagens profissionais para clientes através de uma conversa natural e interativa, onde a IA:
- Ouve o vendedor em tempo real
- Faz perguntas para entender o contexto
- Responde por voz
- Gera automaticamente uma mensagem profissional
- Permite edição antes do envio

## 🚀 Como Usar

### Passo 1: Iniciar Conversa
1. Navegue até a aba **Inbox**
2. Clique no botão **"Falar Instrução"** (botão circular no centro inferior da tela)
3. Permita o acesso ao microfone quando solicitado

### Passo 2: Conversar com a IA
1. **Popup de Conversa** abre automaticamente
2. A IA cumprimentará você por voz
3. Fale naturalmente sobre:
   - Quem é o cliente
   - Qual o objetivo da mensagem (proposta, follow-up, etc.)
   - Detalhes importantes (prazo, valor, necessidades)

### Passo 3: Observar o Feedback Visual
- **Ícone de Microfone Vermelho** pulsando = Ouvindo sua voz
- **Barras Animadas** = Capturando áudio
- **Transcrição em Tempo Real** = Seu texto aparece conforme você fala
- **Ícone Verde** pulsando = IA está falando
- **Loader Azul** = Processando sua mensagem

### Passo 4: Conversa Natural
- A IA fará perguntas para entender melhor
- Responda naturalmente
- Pausas de 2 segundos indicam fim da sua fala
- A IA processará e responderá automaticamente

### Passo 5: Confirmação e Envio
1. Quando a conversa tiver informações suficientes:
   - IA gera uma mensagem profissional
   - **Popup de Confirmação** abre automaticamente
2. No popup você pode:
   - **Revisar** a mensagem gerada
   - **Editar** o texto (clique em "Editar")
   - **Enviar** (botão verde)
   - **Cancelar** (botão cinza)

## 🎨 Funcionalidades Principais

### 1. Transcrição em Tempo Real
- Tecnologia: **Web Speech API (SpeechRecognition)**
- Idioma: Português do Brasil (pt-BR)
- Modo contínuo com resultados intermediários
- Texto aparece conforme você fala

### 2. IA Conversacional
- Powered by: **Google Gemini 2.0 Flash**
- Respostas curtas e naturais (máximo 2-3 frases)
- Perguntas diretas e específicas
- Coleta informações necessárias para criar a mensagem

### 3. Síntese de Voz
- Tecnologia: **Web Speech Synthesis API**
- Voz em português brasileiro
- IA fala suas respostas naturalmente
- Taxa e tom ajustáveis

### 4. Detecção Automática de Pausa
- Timer de silêncio: **2 segundos**
- Detecta automaticamente quando você terminou de falar
- IA processa e responde automaticamente

### 5. Edição de Mensagem
- Editor de texto completo
- Modo de visualização e modo de edição
- Preserva formatação
- Confirmação antes do envio

## 🛠️ Arquitetura Técnica

### Componentes Criados

#### 1. `VoiceConversationModal`
**Arquivo:** `/components/voice-conversation-modal.tsx`

**Responsabilidades:**
- Gerenciar Web Speech API (reconhecimento e síntese)
- Exibir transcrição em tempo real
- Mostrar histórico de conversa
- Feedback visual de estado (ouvindo, falando, processando)
- Comunicação com API de conversação

**Estados:**
```typescript
- isListening: boolean        // Microfone ativo
- isSpeaking: boolean          // IA falando
- transcript: string           // Transcrição completa
- messages: Message[]          // Histórico
- currentMessage: string       // Mensagem atual
- isProcessing: boolean        // Processando com IA
```

#### 2. `MessageConfirmationModal`
**Arquivo:** `/components/message-confirmation-modal.tsx`

**Responsabilidades:**
- Exibir mensagem final gerada
- Permitir edição
- Confirmar ou cancelar envio

**Funcionalidades:**
- Modo de visualização (read-only)
- Modo de edição (textarea)
- Validação (não permite envio vazio)

#### 3. `Dialog` (UI Component)
**Arquivo:** `/components/ui/dialog.tsx`

**Tecnologia:**
- Radix UI Dialog Primitive
- Totalmente acessível (WAI-ARIA)
- Animações com Tailwind CSS
- Responsivo

### API Route

#### `/api/voice/conversation`
**Arquivo:** `/app/api/voice/conversation/route.ts`

**Método:** POST

**Request:**
```typescript
{
  messages: Array<{
    role: "user" | "assistant",
    content: string
  }>,
  context?: string
}
```

**Response:**
```typescript
{
  assistantMessage: string,      // Resposta da IA
  isComplete: boolean,            // Conversa concluída?
  finalMessage?: string,          // Mensagem final (se completa)
  context: string                 // Contexto atualizado
}
```

**Lógica:**
1. Recebe histórico de mensagens
2. Usa Gemini 2.0 Flash para gerar resposta curta
3. Verifica se tem informações suficientes
4. Se sim, gera mensagem final profissional
5. Se não, continua conversando

### Tipos TypeScript

#### Web Speech API
**Arquivo:** `/types/speech-recognition.d.ts`

Define tipos para:
- `SpeechRecognition`
- `SpeechRecognitionEvent`
- `SpeechRecognitionResult`
- `SpeechRecognitionAlternative`
- `SpeechRecognitionErrorEvent`

## 📊 Fluxo de Dados

```
[Usuário fala]
    ↓
[Web Speech API transcreve]
    ↓
[Detecta pausa de 2s]
    ↓
[Envia para /api/voice/conversation]
    ↓
[Gemini 2.0 gera resposta]
    ↓
[API verifica se está completo]
    ↓
├─ SIM → [Gera mensagem final] → [Abre Confirmation Modal]
│
└─ NÃO → [Retorna pergunta] → [IA fala resposta] → [Volta a ouvir]
```

## 🎯 Exemplo de Conversa

### Conversa Típica

**Vendedor:** "Preciso enviar uma mensagem para o João"

**IA:** "Entendi! Qual é o objetivo dessa mensagem pro João? Proposta, follow-up, ou algo diferente?"

**Vendedor:** "É uma proposta de consultoria em vendas"

**IA:** "Legal! Você já conversou com ele antes sobre isso ou é o primeiro contato?"

**Vendedor:** "Já conversamos. Ele pediu uma proposta até sexta-feira"

**IA:** "Perfeito! Qual o valor e o escopo da consultoria que você vai propor?"

**Vendedor:** "Consultoria de 3 meses focada em prospecção, por 15 mil reais"

**IA:** "Ótimo! Deixa eu preparar a mensagem..."

### Mensagem Final Gerada

```
Olá João!

Como combinamos, segue a proposta de consultoria em vendas.

📋 Escopo: Consultoria focada em prospecção
⏱️ Duração: 3 meses
💰 Investimento: R$ 15.000,00

Vamos trabalhar juntos para alavancar seus resultados em vendas através de estratégias comprovadas de prospecção.

Fico à disposição para esclarecer qualquer dúvida!

Abraço,
[Seu nome]
```

## ⚙️ Configurações

### Variáveis de Ambiente

```env
# API Key do Google Gemini
GOOGLE_AI_API_KEY=your_api_key_here
```

### Configurações da IA

**Modelo:** `gemini-2.0-flash-exp`

**Parâmetros:**
- `maxOutputTokens`: 200 (respostas curtas)
- `temperature`: 0.9 (criatividade alta)

### Configurações de Voz

**Reconhecimento:**
- Idioma: `pt-BR`
- Contínuo: `true`
- Resultados intermediários: `true`
- Timer de silêncio: `2000ms`

**Síntese:**
- Idioma: `pt-BR`
- Taxa: `1.0` (velocidade normal)
- Tom: `1.0` (tom normal)

## 🔒 Segurança

### Permissões do Navegador
- **Microfone:** Solicitado automaticamente ao abrir modal
- **Apenas HTTPS:** Web Speech API requer conexão segura

### Privacidade
- Áudio não é gravado ou armazenado
- Transcrições são processadas localmente no navegador
- Apenas texto é enviado para a API
- Histórico de conversa não é persistido

## 🐛 Troubleshooting

### Microfone não funciona
1. Verifique permissões do navegador
2. Certifique-se de estar em HTTPS (ou localhost)
3. Teste em outro navegador (Chrome recomendado)

### IA não responde
1. Verifique `GOOGLE_AI_API_KEY` no `.env`
2. Verifique logs do console
3. Teste endpoint `/api/voice/conversation` diretamente

### Transcrição incorreta
1. Fale mais devagar e claramente
2. Reduza ruído ambiente
3. Teste qualidade do microfone

### Voz da IA não funciona
1. Verifique volume do sistema
2. Teste se `speechSynthesis.getVoices()` retorna vozes pt-BR
3. Alguns navegadores baixam vozes sob demanda (aguarde)

## 🚀 Próximas Melhorias

### Curto Prazo
- [ ] Integrar envio real para WhatsApp via Evolution API
- [ ] Salvar histórico de conversas no Convex
- [ ] Adicionar opção de replay da conversa
- [ ] Implementar cancelamento durante a conversa

### Médio Prazo
- [ ] Suporte para múltiplos idiomas
- [ ] Escolha de voz (masculina/feminina)
- [ ] Templates de mensagens
- [ ] Análise de sentimento

### Longo Prazo
- [ ] Transcrição com IA (Whisper API) para melhor precisão
- [ ] Síntese de voz neural (Google Cloud TTS)
- [ ] Análise de contexto de conversas anteriores
- [ ] Integração com CRM

## 📚 Referências

- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Google Gemini API](https://ai.google.dev/docs)
- [Radix UI Dialog](https://www.radix-ui.com/docs/primitives/components/dialog)
- [Evolution API](https://doc.evolution-api.com/)

## 👥 Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.

---

**Última atualização:** 2025-11-05
**Versão:** 1.0.0
