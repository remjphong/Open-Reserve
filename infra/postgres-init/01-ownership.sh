#!/bin/sh
set -eu
# Environment credentials only. psql quotes values as SQL literals, never SQL identifiers.
: "${CATALOG_DB_PASSWORD:?required}" "${CHAIN_DB_PASSWORD:?required}"
psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
  <<'SQL'
\getenv catalog_password CATALOG_DB_PASSWORD
\getenv chain_password CHAIN_DB_PASSWORD
CREATE ROLE catalog_user LOGIN PASSWORD :'catalog_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE ROLE chain_user LOGIN PASSWORD :'chain_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
CREATE DATABASE catalog_db OWNER catalog_user;
CREATE DATABASE chain_db OWNER chain_user;
REVOKE ALL ON DATABASE catalog_db FROM PUBLIC;
REVOKE ALL ON DATABASE chain_db FROM PUBLIC;
GRANT CONNECT ON DATABASE catalog_db TO catalog_user;
GRANT CONNECT ON DATABASE chain_db TO chain_user;
\connect catalog_db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO catalog_user;
\connect chain_db
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT ALL ON SCHEMA public TO chain_user;
SQL
