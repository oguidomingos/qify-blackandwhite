# Padrões de Código — Python

- `black` + `ruff`; `mypy` opcional com `strict = True` onde possível.
- Estrutura por camada; evite *god functions*.
- Respeite limites de responsabilidade; injete dependências via construtores.
- Use *dataclasses/pydantic* para DTOs; *attrs* quando precisar de performance.
