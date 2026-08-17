# pubman — regras de trabalho para agentes de IA

Leia isto antes de tocar em qualquer arquivo. Vale para qualquer agente (Claude Code, Codex,
Cursor, o que for) e para qualquer pessoa trabalhando com um agente neste repositório.

## O que é este repositório

App de gestão do **Ludens Club** (luderia/bar): escala de turnos, consumo da equipe, compras,
reembolsos e o livro de pagamentos que fecha a semana. **Está em produção e é o sistema que o
lugar usa todo dia.** Dinheiro de gente real passa por aqui — pagamento de funcionário é gerado
como payload PIX pelo próprio app.

Stack: SvelteKit + TypeScript, Supabase (Postgres + Auth), Tailwind/shadcn, deploy na Netlify.

## A regra que não se quebra: nada entra direto na main

**`main` é produção.** A Netlify constrói e publica a partir dela — merge na `main` **é** deploy.
Não existe passo manual separado de "subir pro ar" que sirva de rede de segurança.

Por isso, o fluxo é sempre:

1. **Crie uma branch** a partir da `main` atualizada.
2. **Commite na branch**, nunca na `main`.
3. **Abra um Pull Request** descrevendo o que mudou, por quê, e como testar.
4. **Mergeie o PR** quando estiver revisado e o build passar.

Nunca `git push` na `main`. Nunca `git commit` com a `main` como branch ativa. Se você já commitou
na `main` sem querer, **pare e avise** antes de empurrar qualquer coisa — mover commit de branch
depois é mais fácil do que desfazer um deploy.

### Nomes de branch

Siga o que o repositório já usa:

```
feat/<slug-em-kebab>       funcionalidade nova
fix/<slug-em-kebab>        correção de bug
refactor/<slug-em-kebab>   mudança sem alterar comportamento
chore/<slug-em-kebab>      infra, dependências, configuração
```

Exemplos reais daqui: `feat/pagar-dias-selecao`, `feat/compras-checklist`, `refactor/shadcn-ui`.

### Mensagens de commit

Conventional commits, **em português**, como já é o padrão do histórico:

```
feat: seleção de dias no pagamento (pagar parcial)
fix: impede períodos de escala sobrepostos (raiz do bug de dias duplicados)
chore: migrations de acesso do usuário augusto
```

**Nunca** adicione trailer de co-autoria (`Co-Authored-By:`) em commit nenhum, de agente nenhum.

### Antes de abrir o PR

```
npm run build
```

Tem que passar. Hoje esse é o único portão automatizado que existe no projeto (não há suíte de
testes nem lint configurado), então ele é obrigatório — não abra PR sem ter rodado.

## Onde ir devagar

Estas quatro áreas mexem com dinheiro, com a operação diária ou são irreversíveis. Aqui **abra o
PR e espere revisão do dono do repositório antes de mergear**, mesmo que o build passe:

- **Pagamentos e geração de PIX** — o payload é montado byte a byte na especificação EMV (TLV,
  CRC16-CCITT). Um erro aqui não dá exceção, dá um QR que ninguém consegue pagar, ou pior, que
  paga errado.
- **Migrations e schema do Supabase** — o banco é compartilhado e está vivo. Não rode SQL
  destrutivo contra produção. Migration nova vai versionada em `supabase/`, nunca aplicada só
  pela mão no dashboard.
- **Escalas e períodos** — este projeto já teve um bug de dias duplicados causado por períodos de
  escala sobrepostos. A defesa está em três camadas (guarda na aplicação, `unique(date)` no banco,
  reconciliação dos dados). Não remova nenhuma delas.
- **Autenticação e políticas de acesso** — quem enxerga o quê é regra de negócio, não detalhe
  técnico.

## Higiene

- **Nada de segredo no repositório.** Chave de Supabase, token, credencial: vão em variável de
  ambiente, e a de produção fica na Netlify. Se você encontrar segredo commitado, avise em vez de
  simplesmente apagar (apagar do arquivo não tira do histórico).
- **Não commite `node_modules/`, `build/` nem dumps de banco.**
- **Não altere as políticas de segurança do `netlify.toml`** (CSP, HSTS, X-Frame-Options) sem
  dizer explicitamente o que está mudando e por quê, no PR.
- **Apague a branch depois do merge.** O remoto já acumula branches antigas; não aumente a pilha.

## O que fazer quando estiver em dúvida

Pergunte em vez de decidir sozinho. Especialmente: se a tarefa parece pedir mudança de schema, de
regra de pagamento ou de permissão de usuário, e a instrução que você recebeu não diz
explicitamente o que fazer — pare e pergunte.
