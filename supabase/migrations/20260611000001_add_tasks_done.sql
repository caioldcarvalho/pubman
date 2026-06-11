-- Itens da lista de compras agora podem ser "riscados" (done) sem sair da
-- lista; só são removidos quando entram numa compra.
alter table tasks add column if not exists done boolean not null default false;
