# Melhores do Ano 2026 · Petribu · Shopping Carpina

Votação online das 11 categorias do **Melhores do Ano 2026** (votação de 23 a 30/11, save the date 11/12/2026).

- `/` — página de votação: uma categoria por vez; a próxima só aparece depois do voto. Ao final, agradecimento + *save the date*.
- `/admin` — resultados em tempo real (protegido por senha), ranking por categoria, exportação CSV,
  agendamento da votação (abre/fecha automaticamente, ou abrir/fechar na hora) e botão para zerar todos os votos.

Cada visitante vota **uma vez por categoria** (identificação anônima salva no navegador e validada no servidor).
Os nomes digitados são agrupados ignorando maiúsculas, acentos e espaços extras ("joão silva" = "João Silva").

## Stack

React 18 + Vite (front) · Vercel Serverless Functions em `/api` · Upstash Redis (votos).
Visual segundo o Manual de Identidade Visual Petribu (Azul Prússia `#102D40`, Verde Pera `#CFD604`, Heebo + Lora).

## Deploy na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório (framework detectado: **Vite**) e clique em **Deploy**.
2. No projeto, abra **Storage → Create Database → Upstash for Redis** (plano gratuito) e conecte ao projeto.
   Isso cria automaticamente `KV_REST_API_URL` e `KV_REST_API_TOKEN`.
3. (Recomendado) Em **Settings → Environment Variables**, defina `ADMIN_PASSWORD`.
   Sem ela, vale a senha padrão combinada.
4. Faça **Redeploy** para as variáveis valerem.

## Rodar localmente

```bash
npm install
npx vercel dev   # sobe front + /api (precisa das variáveis do Redis em .env.local)
```

## Editar categorias

`shared/categories.js` — usado tanto pela página quanto pela API.
