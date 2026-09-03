-- AgentMail / Firecrawl fields on the address file.
alter table address_files add column if not exists mail_inbox_id text;
alter table address_files add column if not exists mail_provider text not null default 'mailto';
alter table messages add column if not exists provider_id text;
create index if not exists address_files_case_inbox_idx on address_files (case_inbox);
create index if not exists address_files_mail_inbox_idx on address_files (mail_inbox_id);
