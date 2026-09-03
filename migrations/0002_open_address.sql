-- Folio: one live file per apartment.
-- Children hang off address_files. user_id on children is the file owner
-- (TEXT, not UUID). Access is owner or file_members.

create table if not exists address_files (
  id            text primary key,
  user_id       text not null,
  demo_key      text,
  street        text not null,
  unit          text not null default '',
  city          text not null default 'Chicago',
  state         text not null default 'IL',
  zip           text not null default '',
  jurisdiction  text not null default 'cook-county-il',
  status        text not null default 'opened',
  case_inbox    text not null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index if not exists address_files_demo_key_idx
  on address_files (user_id, demo_key) where demo_key is not null;
create index if not exists address_files_user_id_idx on address_files (user_id);

create table if not exists file_members (
  file_id    text not null references address_files (id) on delete cascade,
  user_id    text not null,
  role       text not null default 'volunteer',
  created_at timestamptz not null default now(),
  primary key (file_id, user_id)
);

create table if not exists parties (
  id         text primary key,
  file_id    text not null references address_files (id) on delete cascade,
  user_id    text not null,
  kind       text not null,
  name       text not null,
  email      text not null default '',
  org        text not null default '',
  notes      text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists parties_file_id_idx on parties (file_id);

create table if not exists notices (
  id           text primary key,
  file_id      text not null references address_files (id) on delete cascade,
  user_id      text not null,
  notice_type  text not null,
  served_on    text,
  deadline_on  text,
  plaintiff    text not null default '',
  amount_cents integer,
  reason       text not null default '',
  raw_text     text not null,
  source       text not null default 'paste',
  created_at   timestamptz not null default now()
);
create index if not exists notices_file_id_idx on notices (file_id);

create table if not exists records (
  id            text primary key,
  file_id       text not null references address_files (id) on delete cascade,
  user_id       text not null,
  agency        text not null,
  kind          text not null,
  title         text not null,
  url           text not null default '',
  extracted     text not null default '{}',
  raw_excerpt   text not null default '',
  status        text not null default 'ready',
  created_at    timestamptz not null default now()
);
create index if not exists records_file_id_idx on records (file_id);

create table if not exists issues (
  id         text primary key,
  file_id    text not null references address_files (id) on delete cascade,
  user_id    text not null,
  kind       text not null,
  title      text not null,
  detail     text not null default '',
  status     text not null default 'open',
  opened_on  text,
  created_at timestamptz not null default now()
);
create index if not exists issues_file_id_idx on issues (file_id);

create table if not exists claims (
  id           text primary key,
  file_id      text not null references address_files (id) on delete cascade,
  user_id      text not null,
  kind         text not null,
  amount_cents integer,
  description  text not null,
  statute      text not null default '',
  status       text not null default 'open',
  promised_on  text,
  due_on       text,
  created_at   timestamptz not null default now()
);
create index if not exists claims_file_id_idx on claims (file_id);

create table if not exists messages (
  id              text primary key,
  file_id         text not null references address_files (id) on delete cascade,
  user_id         text not null,
  direction       text not null,
  to_email        text not null default '',
  from_email      text not null default '',
  subject         text not null,
  body            text not null,
  classification  text not null default 'other',
  status          text not null,
  related_claim_id text,
  created_at      timestamptz not null default now(),
  sent_at         timestamptz
);
create index if not exists messages_file_id_idx on messages (file_id);

create table if not exists exhibits (
  id          text primary key,
  file_id     text not null references address_files (id) on delete cascade,
  user_id     text not null,
  label       text not null,
  title       text not null,
  kind        text not null,
  source_table text not null default '',
  source_id   text not null default '',
  body        text not null default '',
  created_at  timestamptz not null default now()
);
create index if not exists exhibits_file_id_idx on exhibits (file_id);

create table if not exists deadlines (
  id           text primary key,
  file_id      text not null references address_files (id) on delete cascade,
  user_id      text not null,
  kind         text not null,
  title        text not null,
  due_on       text not null,
  completed_at timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists deadlines_file_id_idx on deadlines (file_id);

create table if not exists timeline_events (
  id         text primary key,
  file_id    text not null references address_files (id) on delete cascade,
  user_id    text not null,
  kind       text not null,
  title      text not null,
  detail     text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists timeline_events_file_id_idx on timeline_events (file_id);
