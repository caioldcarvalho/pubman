-- Alerta de segurança do Supabase (rls_disabled_in_public, 11/out/2026):
-- products_backup_20260916 é um snapshot manual do cardápio, criado fora das
-- migrations e sem RLS — qualquer pessoa com a URL do projeto conseguia ler,
-- editar e apagar. Liga o RLS sem criar policy: anon/authenticated ficam sem
-- acesso, e o dado continua preservado (service role e dashboard seguem lendo).
-- Não apaga a tabela; decidir descartar o backup é outra conversa.
alter table if exists public.products_backup_20260916 enable row level security;
