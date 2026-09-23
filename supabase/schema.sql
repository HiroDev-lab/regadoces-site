-- ============================================================
-- REGADOCES — schema do Supabase (Postgres)
-- Rode este script no SQL Editor do projeto Supabase quando for
-- migrar do armazenamento local (data/*.json) para o banco.
-- Os nomes de colunas espelham os campos dos JSONs locais.
-- ============================================================

create table if not exists products (
  id          text primary key default gen_random_uuid()::text,
  codigo      text not null default '',
  nome        text not null,
  descricao   text not null default '',
  detalhe     text not null default '',
  preco       numeric(10,2) not null default 0,
  categoria   text not null default 'Outros',
  imagem      text not null default '',
  ordem       int  not null default 1,
  estoque     int  not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists coupons (
  id          text primary key default gen_random_uuid()::text,
  codigo      text not null unique,
  tipo        text not null check (tipo in ('percentual','valor')),
  valor       numeric(10,2) not null,
  validade    date not null,
  uso_maximo  int not null default 0,
  usos        int not null default 0,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists posts (
  id          text primary key default gen_random_uuid()::text,
  slug        text not null unique,
  titulo      text not null,
  capa        text not null default '',
  resumo      text not null default '',
  conteudo    text not null default '',
  destaque    boolean not null default false,
  ordem       int not null default 1,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

create table if not exists carousel_slides (
  id          text primary key default gen_random_uuid()::text,
  imagem      text not null,
  titulo      text not null default 'Regadoces',
  frase       text not null default '',
  subtitulo   text not null default '',
  texto_botao text not null default '',
  link_botao  text not null default '/',
  ordem       int not null default 1,
  ativo       boolean not null default true
);

create table if not exists testimonials (
  id          text primary key default gen_random_uuid()::text,
  nome        text not null,
  sobrenome   text not null default '',
  email       text not null default '',
  telefone    text not null default '',
  texto       text not null,
  aprovado    boolean not null default false,
  criado_em   timestamptz not null default now()
);

create table if not exists orders (
  id          text primary key,
  itens       jsonb not null,
  subtotal    numeric(10,2) not null,
  frete       numeric(10,2) not null,
  desconto    numeric(10,2) not null default 0,
  total       numeric(10,2) not null,
  cupom       text,
  cliente     jsonb not null,
  entrega     jsonb not null,
  pagamento   jsonb not null,   -- nunca inclui dados de cartão!
  status      text not null default 'recebido'
              check (status in ('recebido','preparando','entregue','cancelado')),
  criado_em   timestamptz not null default now()
);

create table if not exists admins (
  id          text primary key default gen_random_uuid()::text,
  email       text not null unique,
  senha_hash  text not null,     -- hash bcrypt
  nome        text not null default 'Administrador'
);

-- Segurança: habilite RLS e acesse essas tabelas SOMENTE pelo servidor
-- (SERVICE_ROLE_KEY nas rotas /api), nunca com a anon key no navegador.
alter table products         enable row level security;
alter table coupons          enable row level security;
alter table posts            enable row level security;
alter table carousel_slides  enable row level security;
alter table testimonials     enable row level security;
alter table orders           enable row level security;
alter table admins           enable row level security;

-- Leitura pública apenas do que o site mostra:
create policy "produtos publicos"  on products  for select using (ativo and estoque > 0);
create policy "posts publicos"     on posts     for select using (ativo);
create policy "slides publicos"    on carousel_slides for select using (ativo);
create policy "depoimentos publicos" on testimonials for select using (aprovado);

-- ============================================================
-- MODO USADO PELO SITE (simples): cada coleção inteira como JSON.
-- É a única tabela que o código lê/grava (src/lib/db.ts).
-- As tabelas acima ficam como referência para uma migração futura.
-- ============================================================
create table if not exists collections (
  name        text primary key,
  data        jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);
alter table collections enable row level security;
-- sem políticas públicas: só a service role (servidor) acessa

-- Bucket público para as fotos enviadas pelo painel
insert into storage.buckets (id, name, public)
values ('uploads', 'uploads', true)
on conflict (id) do nothing;
