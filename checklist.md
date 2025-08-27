

✅ Checklist E2E — Qify Black&White (Batching, Prompt, SPIN, Evolution)

0) Pré-voo (infra & env)
	•	ENV Convex/Next atualizados (local e Vercel):
	•	GEMINI_API_KEY
	•	EVOLUTION_BASE_URL
	•	EVOLUTION_API_KEY (se por org/instância, validar todas)
	•	REDIS_URL, REDIS_TOKEN (Upstash/Vercel KV)
	•	Variáveis por org/instância: conferidas nas tabelas (whatsapp_accounts, evolution_instances, agent_configurations)
	•	ai_prompts: existe kind="spin_sdr", active=true para a org alvo
	•	Feature flags/config: batchingDelayMs=120000 (ou o valor desejado)

⸻

1) Sanidade Redis & estado efêmero (local)
	•	Rodar scripts/test-redis-batching.js e garantir green
	•	Verificar que a lista pending_msgs armazena objetos (cliente Upstash já desserializa)
	•	Ordem cronológica ok no drain (retorno invertido para ASC)
	•	facts retorna objeto default quando hgetall vier nulo

Comandos úteis

# inspeção
# (ajuste sessionId de teste)
LRANGE sess:{sessionId}:pending_msgs 0 -1
HGETALL sess:{sessionId}:facts
SMEMBERS sess:{sessionId}:asked
SMEMBERS sess:{sessionId}:answered


⸻

2) Idempotência dupla (Convex + Redis)
	•	Enviar a mesma mensagem (mesmo providerMessageId) 3x
	•	Convex: messages tem 1 registro (query por providerId)
	•	Redis: houve bloqueio/TTL de dedupe curto (log de “dedupe hit”)

⸻

3) Batching 120s (local/mocado)
	•	Disparar 3 mensagens para a mesma sessão em <5s
	•	Aguardar ~125s → apenas 1 resposta consolidada
	•	Logs mostram batch_scheduled ➜ batch_drained com batch_size=3
	•	batch_until foi respeitado; sem respostas intermediárias
	•	Nenhuma mensagem “skipped” ficou perdida (fila esvaziada)

⸻

4) Prompt & Gemini
	•	{{$now}} substituído por data/hora reais
	•	Prompt enviado com seções:
	•	### Contexto
	•	### Dados coletados
	•	### Histórico (resumo)
	•	### Próxima ação
	•	### Regras finais (NÃO cumprimentar de novo; 1 pergunta; não repetir slots)
	•	Forçar resposta com múltiplos parts ➜ resposta final concatena todos
	•	Sem “mensagens fragmentadas” no WhatsApp/console

⸻

5) SPIN & anti-repetição (local)
	•	Gating: sem nome + PF/PJ + empresa → NÃO avançar SPIN
	•	Coleta:
	•	“Sou o Guilherme” ➜ facts.name="Guilherme"
	•	“PJ” ➜ facts.personType="PJ"
	•	“Iceberg Marketing” ➜ facts.business="Iceberg Marketing"
	•	Após básicos, avançar S→P→I→N com confiança ≥ τ
	•	asked/answered em Redis atualizados por turno
	•	Bot não repete saudação nem pergunta já respondida; máx. 1 pergunta por turno

⸻

6) Observabilidade (local)
	•	Logs estruturados por evento:
	•	ingest, batch_scheduled, batch_drained, lock_failed, skipped,
	•	llm_request, llm_response, evolution_request
	•	Correlação por sessionId e providerMessageId
	•	Exportar amostra JSONL de uma conversa

⸻

7) Deploy para testes com Evolution
	•	git add -A && git commit -m "feat: batching+redis+spin gating e2e"
	•	vercel --prod (ou pipeline CI) ➜ confirmar URL final (ex.: https://qify-blackandwhite-...vercel.app)
	•	Conferir ENV na Vercel (Production) = valores de 0) Pré-voo

⸻

8) Evolução — configuração das instâncias

Padrão sugerido de nomes
	•	Bot (recebe): qify-5561999449983  (rename de roigem para ficar no padrão)
	•	Cliente (envia): oguidomingos  (seu WhatsApp/instância “humana”)

Webhook (na Evolution, para a instância do Bot)
	•	URL: https://{sua_url_prod}/api/webhook/whatsapp/{instanceName}
	•	Ex.: https://qify-blackandwhite-...vercel.app/api/webhook/whatsapp/qify-5561999449983
	•	Token/assinatura (shared/secret) combina com o esperado no backend
	•	Instância conectada (QR pareado) e ativa

⸻

9) Evolução — testes ponta-a-ponta (WhatsApp real)

Cenário D — Mensagens reais
	•	Do WhatsApp da instância oguidomingos, enviar para o número da instância qify-5561999449983
	•	Enviar 3 mensagens em <5s (ex.: “Sou o Guilherme” / “da Iceberg Marketing” / “assessoria”)
	•	Aguardar ~120s ➜ 1 única resposta do bot
	•	Resposta respeita regras (sem saudação repetida, 1 pergunta, sem repetir slot)
	•	Dashboard (Inbox/Sessions) mostra a conversa (Convex-first)

Cenário E — Erros/fallback
	•	Temporariamente usar credencial inválida e chamar /api/evolution/instance-stats
	•	UI exibe erro claro; logs mostram evolution_request (status/latência)
	•	Dashboard continua estável (contagens via Convex)

⸻

10) Casos de borda / caos
	•	Duplicados (mesmo providerMessageId fora de ordem) ➜ 1 só no Convex
	•	Concorrência: 2–3 ingests paralelos ➜ no máx. 1 processScheduledReply efetivo
	•	Timeout LLM ➜ re-agendar ou fallback; logar
	•	Mensagem vazia/anexo ➜ ignorar com log de causa
	•	Janela de batch: msgs chegando no fim ➜ re-agendamento correto

⸻

11) Critérios de aceite (encerrar)
	•	3 msgs em <5s ➜ 1 resposta consolidada (nenhuma perdida)
	•	Zero saudação repetida; zero pergunta duplicada; máx. 1 pergunta/turno
	•	SPIN só avança com nome + PF/PJ + empresa
	•	Prompt com seções + {{$now}} resolvido; resposta concatena todos os parts
	•	Dashboard: contagens via Convex; status da instância via Evolution; erros claros
	•	Logs: completos e correlacionados (sessionId, providerMessageId), métricas de latência OK
