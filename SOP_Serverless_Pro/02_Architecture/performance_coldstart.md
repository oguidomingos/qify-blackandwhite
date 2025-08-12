# Desempenho e Cold Start

- **Runtimes leves** (Node/Python) minimizam *cold start*; evite SDKs enormes.
- **Provisioned Concurrency** para rotas críticas; aquecimento controlado.
- **Conexões**: use *connection pooling* gerenciado (RDS Proxy) ou NoSQL sem conexão persistente.
- **Cache**: CDN/Edge, KV global, cache de resultados e *memoization* seletiva.
