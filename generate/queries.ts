import { Client, configSync } from '../deps.ts'
import typeMap from './types.ts';

configSync({ export: true });

const client = new Client({
  hostname: Deno.env.get('DB_HOSTNAME'),
  port: Deno.env.get('DB_PORT'),
  database: Deno.env.get('DB_DATABASE'),
  user: Deno.env.get('DB_USER'),
  password: Deno.env.get('DB_PASSWORD')
});

export async function getTables() {
  const query = `select table_name from information_schema.tables where table_schema = 'public' and table_catalog = '${Deno.env.get('DB_DATABASE')}'`;
  return (await client.queryArray<[string]>(query)).rows.flat();
}

export async function getFields(collection: string) {
  const query = `SELECT c.column_name, c.is_nullable, c.data_type, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
    FROM information_schema.columns as c
    left join information_schema.key_column_usage kcu on kcu.table_name = c.table_name and kcu.column_name = c.column_name
    left join information_schema.constraint_column_usage ccu on ccu.constraint_name = kcu.constraint_name
    WHERE c.table_name = '${collection}'
  `;
  const result = (await client.queryArray<[string, string, string, string, string]>(query)).rows;
  return result.map(([name, nul, type, ref, ref_name]) => {
    const field: Record<string, unknown> = { name, nullable: nul === 'YES', type: typeMap[type] };
    if (ref !== null && ref !== collection) field.references = { collection: ref, field: ref_name };
    return field;
  });
}

export async function close() {
  await client.end();
}