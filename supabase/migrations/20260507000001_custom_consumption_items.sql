-- Allow custom consumption items not in the menu
alter table consumption
  alter column product_id drop not null,
  add column custom_name text,
  add column custom_price numeric;

-- Either product_id or custom fields must be set
alter table consumption
  add constraint consumption_product_or_custom
  check (product_id is not null or (custom_name is not null and custom_price is not null));
