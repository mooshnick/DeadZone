alter table users add column if not exists google_subject varchar(64);

create unique index if not exists uk_users_google_subject
    on users (google_subject)
    where google_subject is not null;
