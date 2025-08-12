# Event Storming — Procedimento

1. Liste **eventos de domínio** no passado (ex.: `PedidoConfirmado`, `AssinaturaAtivada`).
2. Mapeie **comandos** (ex.: `ConfirmarPagamento`) e **políticas** (regras reativas).
3. Defina **agregados** (consistência) e **bounded contexts** (responsabilidades).
4. Desenhe **contratos** entre contextos: APIs síncronas vs eventos assíncronos.
5. Gere histórias, NFRs e riscos a partir dos gargalos, conflitos e invariantes.
