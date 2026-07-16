-- Cria usuário de acesso para augustolcar@gmail.com (app de gerente único).
-- Idempotente: não recria se o email já existir.
do $$
declare
  v_user_id uuid := gen_random_uuid();
  v_email text := 'augustolcar@gmail.com';
  v_password text := 'axRJGQQdNrii6a!9';
begin
  if exists (select 1 from auth.users where email = v_email) then
    raise notice 'Usuário % já existe, pulando.', v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, created_at, updated_at,
    raw_app_meta_data, raw_user_meta_data
  ) values (
    '00000000-0000-0000-0000-000000000000',
    v_user_id,
    'authenticated', 'authenticated',
    v_email,
    extensions.crypt(v_password, extensions.gen_salt('bf')),
    now(), now(), now(),
    '{"provider":"email","providers":["email"]}',
    '{}'
  );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(),
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true),
    'email',
    v_user_id::text,
    now(), now(), now()
  );
end $$;
