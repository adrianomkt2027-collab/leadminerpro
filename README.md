# Lead Miner Pro

Lead Miner extrai dados do Google Maps e da base oficial de CNPJs, pontua oportunidades automaticamente e dispara mensagens personalizadas via WhatsApp — tudo em uma única plataforma.

## Supabase

Projeto oficial utilizado pelo sistema:

- Project ref: `ejpvovdixjcsrjgasrym`
- URL: `https://ejpvovdixjcsrjgasrym.supabase.co`

O `supabase/config.toml` está apontando para esse projeto.

## Configuração

Configure no ambiente de execução:

```env
VITE_SUPABASE_PROJECT_ID=ejpvovdixjcsrjgasrym
VITE_SUPABASE_URL=https://ejpvovdixjcsrjgasrym.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<chave publishable/anon do projeto>
```

Não coloque chaves secretas/service-role no frontend ou no GitHub.

## Deploy

O repositório é integrado ao Vercel. Commits na branch `main` podem acionar o deploy de produção conforme a configuração do projeto Vercel.

## Modo Local

```bash
npm install
npm run dev
```
