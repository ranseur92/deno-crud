import { equal } from "../deps.ts";
import { queryArray, queryObject, upsert } from "./database.ts";

type Any = Record<string, unknown>;

export type Model<T> = {
  index(): Promise<Row<T>[]>;
  find(id: number): Promise<Row<T>>;
  create(body?: Omit<T, 'id'>): Row<T>;
}

export type Row<T> = T & {
  assign(body: Partial<T>): Row<T>;
  update(body: Partial<T>): Promise<Row<T>>;
  save(): Promise<Row<T>>;
  delete(): Promise<number>;
  toJSON(): T;
};

function constructRecord<T extends Any>(raw: T, data?: Partial<T>) {
  const record: Any = {};
  for(const [key, value] of Object.entries(raw)) {
    Object.assign(record, { [`_${key}`]: value })
    Object.defineProperty(record, key, {
      get() {
        return this[`_${key}`]
      },
      set(value: unknown) {
        const existing = this[`_${key}`];
        if (existing !== value) {
          this[`_${key}`] = value;
        }
      }
    });
  }
  Object.assign(record, data);
  return record as T;
}

function getDirty<T extends Any>(raw: T, data: T): Partial<T> {
  if (equal(raw, data)) return {};
  const dirty: Record<string, unknown> = {};
  for(const key of Object.keys(raw)) {
    if (!equal(raw[key], data[key])) {
      dirty[key] = data[key];
    }
  }
  return dirty as Partial<T>;
}

function row<T extends Any>(table: string, raw: T, body?: Partial<T>): Row<T> {

  function assignRecord(this: Row<T>, body: Partial<Omit<T, 'id'>>) {
    Object.assign(this, body);
    return this;
  }

  async function updateRecord(this: Row<T>, body: Partial<Omit<T, 'id'>>) {
    Object.assign(this, body);
    return await this.save();
  }

  async function saveRecord(this: Row<T>): Promise<Row<T>> {
    const dirty = getDirty<T>(raw, this.toJSON());
    const returned = await upsert(table, raw.id, dirty);
    Object.assign(raw, returned);
    Object.assign(this, returned);
    return this;
  }

  async function deleteRecord(this: Row<T>): Promise<number> {
    if (raw.id === null) {
      throw new Error("Field doesn't exist in database.")
    }

    const result = await queryArray<[number]>(`DELETE FROM ${table} WHERE id = $1 RETURNING id`, [raw.id]);
    return result?.[0]?.[0] ?? -1;
  }

  function toJSON(this: Row<T>): T {
    return Object.keys(raw).reduce((p,c) => ({ ...p, [c]: this[c] }), {}) as T;
  }
  
  const record = constructRecord<T>(raw, body);
  return Object.assign(record, {
    assign: assignRecord.bind(record as Row<T>),
    update: updateRecord.bind(record as Row<T>),
    save: saveRecord.bind(record as Row<T>),
    delete: deleteRecord.bind(record as Row<T>),
    toJSON: toJSON.bind(record as Row<T>)
  });
}

export default function model<T extends Any>(table: string, keys: Extract<keyof T, string>[]): Model<T> {
  const nulledRecord = keys.reduce((p,c) => ({ ...p, [c]: null }), {}) as T;
  
  const collection:Model<T> = {

    async index(): Promise<Row<T>[]> {
      const records = await queryObject<T>(`select ${keys.join(', ')} from ${table}`);
      return records.map((record) => row(table, record));
    },

    async find(id: number): Promise<Row<T>> {
      const [record] = await queryObject<T>(`select ${keys.join(', ')} from ${table} where id = $1`, [id]);
      if (!record) throw new Error("Record not found");
      return row(table, record);
    },

    create(body: T): Row<T> {
      return row<T>(table, nulledRecord, body);
    }

  }

  return collection;
}