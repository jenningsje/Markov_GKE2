#!/bin/sh
set -e

echo "Waiting for database..."

until pg_isready -h db -p 5432 -U postgres; do
    sleep 2
done

echo "Database ready"

psql postgresql://postgres:postgres@db:5432/postgres <<EOF

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'user'
);

EOF

echo "Database initialized"

node server.js
