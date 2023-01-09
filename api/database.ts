import { equal, PostgresError, Pool, QueryArguments, configSync } from "../deps.ts";

configSync({ export: true });

const pool = new Pool({
  hostname: Deno.env.get('DB_HOSTNAME'),
  port: Deno.env.get('DB_PORT'),
  database: Deno.env.get('DB_DATABASE'),
  user: Deno.env.get('DB_USER'),
  password: Deno.env.get('DB_PASSWORD')
}, 5);

export const DBError = PostgresError;

export async function queryObject<T>(query: string, args?: QueryArguments): Promise<T[]> {
  const conn = await pool.connect();
  const result = await conn.queryObject<T>(query, args);
  conn.release();
  return result.rows;
}

export async function queryArray<T extends Array<unknown>>(query: string, args?: QueryArguments): Promise<T[]> {
  const conn = await pool.connect();
  const result = await conn.queryArray<T>(query, args);
  conn.release();
  return result.rows;
}

export async function upsert<T>(table: string, id: unknown, object: Record<string, unknown>): Promise<T | undefined> {
  if (equal(object, {})) return undefined;
  const args = [...Object.values(object), id].slice(0, id === null ? -1 : undefined);
  const fields = Object.keys(object).map((f,i) => ((id !== null ? `${f} = ` : ``) + `$${i+1}`)).join(', ');
  const returning = [...new Set(['id', ...Object.keys(object)])];
  const update = `UPDATE ${table} SET ${fields} WHERE id = $${Object.keys(object).length + 1}`;
  const insert = `INSERT INTO ${table} (${Object.keys(object).join(', ')}) VALUES (${fields})`;
  const query = `${id === null ? insert : update} RETURNING ${returning.join(', ')}`;
  return (await queryObject(query, args))[0] as T
}