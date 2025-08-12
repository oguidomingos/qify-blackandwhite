# Modelagem de Dados — Cosmos DB / Firestore

- **Cosmos**: escolha bem a **partition key**; evite fan-out; TTL para retenção; RU/s planejadas.
- **Firestore**: subcoleções por agregado; **composite indexes** para queries complexas; limite de gravações por documento/seg.
- **Consistência**: entenda níveis disponíveis (forte/eventual) e impacto na latência.
- **Streams/Triggers**: *change feed* (Cosmos) e *cloud functions* (Firestore) para materializações.
