-- DataMatch LatAm · base de datos en Supabase
-- Pégalo completo en Supabase > SQL Editor > New query y presiona Run.

create table if not exists public.docs (
  coleccion  text        not null,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (coleccion, id)
);

create index if not exists docs_coleccion_idx on public.docs (coleccion);

-- Necesario para que el tiempo real avise también cuando se borra una fila
alter table public.docs replica identity full;

-- Seguridad por filas: la app solo puede tocar sus cuatro colecciones
alter table public.docs enable row level security;

drop policy if exists "leer"       on public.docs;
drop policy if exists "crear"      on public.docs;
drop policy if exists "actualizar" on public.docs;
drop policy if exists "borrar"     on public.docs;

create policy "leer" on public.docs for select to anon, authenticated
  using (coleccion in ('perfiles','conexiones','encuestas','modelo'));

create policy "crear" on public.docs for insert to anon, authenticated
  with check (coleccion in ('perfiles','conexiones','encuestas','modelo'));

create policy "actualizar" on public.docs for update to anon, authenticated
  using (coleccion in ('perfiles','conexiones','encuestas','modelo'))
  with check (coleccion in ('perfiles','conexiones','encuestas','modelo'));

-- El modelo no se puede borrar desde la app; los usuarios sí pueden borrar su cuenta
create policy "borrar" on public.docs for delete to anon, authenticated
  using (coleccion in ('perfiles','conexiones','encuestas'));

-- Activa el tiempo real para la tabla
do $$
begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'docs') then
    alter publication supabase_realtime add table public.docs;
  end if;
end $$;
