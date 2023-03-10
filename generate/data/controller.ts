export default `
import { <%= it.table.modelName %> } from "../models.ts";
import * as Types from "../types.ts"

import type { Controller } from "<%= it.apiURL %>/controller.ts"

const controller: Controller<Types.<%= it.table.modelName %>> = {

  route: '<%= it.table.tableName %>',

  async index() {
    return await <%= it.table.modelName %>.index();
  },

  async find(id: number) {
    return await <%= it.table.modelName %>.find(id)
  },

  async create(data: Omit<Types.<%= it.table.modelName %>, "id">) {
    return await <%= it.table.modelName %>.create(data).save();
  },

  async update(id: number, data: Partial<Omit<Types.<%= it.table.modelName %>, "id">>) {
    const record = await <%= it.table.modelName %>.find(id)
    return await record?.update(data);
  },

  async delete(id: number): Promise<number> {
    const record = await <%= it.table.modelName %>.find(id)
    return await record?.delete();
  }
}

export default controller;
`;