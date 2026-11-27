// Copia la base de datos local (contenedor fitoprice-db) a Neon: esquema, datos e histórico de precios.
// Usa pg_dump y psql de dentro del contenedor, así que no hace falta instalar PostgreSQL.
//
//   1. neon env pull --file .env.neon   (deja DATABASE_URL_UNPOOLED, la conexión directa, en .env.neon)
//   2. npm run db:neon
//
// La base de datos de Neon tiene que estar vacía: si ya tiene las tablas, psql parará en el primer error.
// Para empezar de cero en Neon: en su consola, Branches > Reset, o borra y crea la base de datos.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import dotenv from "dotenv";

// Se lee .env.neon sin tocar process.env: la API local sigue usando el PostgreSQL de Docker
const neonEnv = fs.existsSync(".env.neon") ? dotenv.parse(fs.readFileSync(".env.neon")) : {};
const target = process.env.NEON_DATABASE_URL || neonEnv.DATABASE_URL_UNPOOLED;

if (!target) {
    console.error("No hay conexión a Neon: ejecuta `neon env pull --file .env.neon` (o define NEON_DATABASE_URL).");
    process.exit(1);
}
if (target.includes("-pooler")) {
    console.error("Usa la conexión directa de Neon (sin -pooler): pg_dump/psql no funcionan bien a través del pooler.");
    process.exit(1);
}

// Con --check solo dice cuántas tablas tiene ya la base de datos de Neon
const check = process.argv.includes("--check");
const sql = check
    ? `psql "$TARGET_URL" -Atc "select count(*) || ' tablas en public' from information_schema.tables where table_schema = 'public'"`
    : 'pg_dump -U fitoprice --no-owner --no-acl --quote-all-identifiers fitoprice | psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q';

// La URL viaja como variable de entorno, no en la línea de comandos, para que no salga en los logs
const result = spawnSync("docker", ["exec", "-e", "TARGET_URL", "fitoprice-db", "sh", "-c", sql], {
    stdio: "inherit",
    env: { ...process.env, TARGET_URL: target },
});

if (result.status !== 0) {
    console.error(check ? "No se ha podido conectar con Neon." : "La copia ha fallado. Revisa el mensaje de psql de arriba.");
    process.exit(result.status ?? 1);
}
if (!check) console.log("Base de datos copiada a Neon.");
