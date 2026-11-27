// Copia la base de datos local (contenedor fitoprice-db) a Neon: esquema, datos e histórico de precios.
// Usa pg_dump y psql de dentro del contenedor, así que no hace falta instalar PostgreSQL.
//
//   1. Pon en .env NEON_DATABASE_URL con la cadena de conexión DIRECTA de Neon (sin "-pooler")
//   2. npm run db:neon
//
// La base de datos de Neon tiene que estar vacía: si ya tiene las tablas, psql parará en el primer error.
// Para empezar de cero en Neon: en su consola, Branches > Reset, o borra y crea la base de datos.

import { spawnSync } from "node:child_process";
import dotenv from "dotenv";

dotenv.config();

const target = process.env.NEON_DATABASE_URL;
if (!target) {
    console.error("Falta NEON_DATABASE_URL en .env (cadena de conexión directa de Neon).");
    process.exit(1);
}
if (target.includes("-pooler")) {
    console.error("Usa la conexión directa de Neon (sin -pooler): pg_dump/psql no funcionan bien a través del pooler.");
    process.exit(1);
}

// La URL viaja como variable de entorno, no en la línea de comandos, para que no salga en los logs
const result = spawnSync(
    "docker",
    [
        "exec", "-e", "TARGET_URL", "fitoprice-db", "sh", "-c",
        'pg_dump -U fitoprice --no-owner --no-acl --quote-all-identifiers fitoprice | psql "$TARGET_URL" -v ON_ERROR_STOP=1 -q',
    ],
    { stdio: "inherit", env: { ...process.env, TARGET_URL: target } },
);

if (result.status !== 0) {
    console.error("La copia ha fallado. Revisa el mensaje de psql de arriba.");
    process.exit(result.status ?? 1);
}
console.log("Base de datos copiada a Neon.");
