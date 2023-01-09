export default `
import model from "<%= it.apiURL %>/model.ts"

import * as Types from "./types.ts"

<% it.tables.forEach(function(table){ %>
export const <%= table.modelName %> = model<Types.<%= table.modelName %>>(
  '<%= table.tableName %>', 
  [<%~ table.fields.map(f => f.name).map(tn => ["'", tn, "'"].join('')).join(', ') %>]
);

<% }) %>
`;