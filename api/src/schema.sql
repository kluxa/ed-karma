
drop table if exists Posts;
drop table if exists Replies;

create table Posts (
    id        integer primary key,
    userId    integer not null,
    userName  text not null,
    karma     integer check (karma >= 0)
);

create table Replies (
    id        integer primary key,
    userId    integer not null,
    userName  text not null,
    karma     integer check (karma >= 0)
);
