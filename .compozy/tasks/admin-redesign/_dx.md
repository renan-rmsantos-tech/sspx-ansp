# DX Contract: Redesenho do painel administrativo

Superfície pública alterada: apenas URLs do painel e um script npm. Nenhuma API, CLI, SDK ou chave de configuração.

## Rotas

| Rota | Papel | Observação |
| --- | --- | --- |
| `/admin` | staff | Início (antes: redirect para `/admin/solicitacoes`). |
| `/admin/solicitacoes` | staff | Aceita `?situacao=pendente\|aprovada\|rejeitada`. |
| `/admin/benfeitores` | staff | Aceita `?boas-vindas=pendentes` (efeito só para `admin`). |
| `/admin/pagamentos` | admin | Aceita `?mes=AAAA-MM`; padrão mês corrente (São Paulo). |
| `/admin/emails` | admin | Aceita `?aba=boas-vindas\|instrucoes\|lembretes` (padrão `boas-vindas`). |
| `/admin/modelos` | admin | Aceita `?aba=aprovacao\|rejeicao\|contrato` (padrão `aprovacao`). |
| `/admin/relatorios`, `/admin/ano-letivo`, `/admin/usuarios`, `/admin/cabecalho` | admin | Inalteradas. |

## Redirects permanentes (308) em `next.config.ts`

```ts
async redirects() {
  return [
    { source: "/admin/conferencia-pagamentos", destination: "/admin/pagamentos", permanent: true },
    { source: "/admin/email-benfeitores", destination: "/admin/emails", permanent: true },
    { source: "/admin/instrucoes-benfeitores", destination: "/admin/emails?aba=instrucoes", permanent: true },
    { source: "/admin/lembretes-benfeitores", destination: "/admin/emails?aba=lembretes", permanent: true },
    { source: "/admin/textos", destination: "/admin/modelos", permanent: true },
    { source: "/admin/contrato", destination: "/admin/modelos?aba=contrato", permanent: true },
  ];
}
```

O `proxy.ts` (`matcher: ["/admin/:path*"]`) continua exigindo sessão antes do redirect.

## Login

`AFTER_LOGIN` em `app/login/_actions/auth-actions.ts` passa a `"/admin"`.

## Scripts npm

`"lint": "eslint ."` (substitui `next lint`, removido no Next 16). `npm run typecheck`, `npm test` inalterados.

## Dev

`npm run dev` → `http://localhost:3000/admin` com `AUTH_BYPASS=true` (`admin@admin.com` / `admin123`). Protótipo de referência em `http://localhost:3000/prototipos/admin-redesign`.
