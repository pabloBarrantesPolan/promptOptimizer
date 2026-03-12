# Prompt Optimizer

Aplicação web para otimização de prompts em IA generativa, com base em boas práticas de engenharia de prompts. Desenvolvida como TCC do MBA em Engenharia de Software – USP/ESALQ.

## Funcionalidades

- Fluxo guiado de perguntas contextuais (objetivo, público-alvo, contexto, restrições, etc.)
- Geração de prompt otimizado
- Integração com Google Gemini (sessões independentes para comparação A/B)
- Formulário de avaliação Likert 1–5
- Autenticação com admin (cadastro e autorização de usuários)
- Exportação de dados (JSON, TXT)

## Configuração

1. Copie `.env.example` para `.env`
2. Defina `GEMINI_API_KEY` (obtenha em https://aistudio.google.com/apikey)
3. Para desenvolvimento sem autenticação: `AUTH_ENABLED=false`
4. Para desenvolvimento local: `DATA_DIR=./data` e `PORT=3001`

## Desenvolvimento

```bash
npm install
npm run dev          # Frontend (Vite, porta 5173)
npm run dev:server   # Backend (porta 3001 com proxy)
```

Com `PORT=3001` e `DATA_DIR=./data`, o Vite faz proxy de `/api` para o backend.

## Produção

```bash
npm run build
npm start
```

Ou via Docker:

```bash
docker-compose up -d
```

## Scripts de dados

```bash
npm run generate-simulated   # Gera 25 registros simulados
npm run import-simulated    # Importa para surveys.json
npm run analyze             # Análise estatística e gráficos
```

## Estrutura

- `src/` – Frontend React
- `services/` – IA (Gemini), autenticação, usuários
- `server.js` – Backend Express
- `scripts/` – Geração e análise de dados
- `outputs/` – Resultados da análise (JSON, SVG)
- `docs/` – Template da monografia e slides
