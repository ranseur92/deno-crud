export default `
<% it.tables.forEach(function(table){ %>
import <%= table.modelName %>Controller from "./controllers/<%= table.tableName %>.ts";
<% }) %>

export default [
<% it.tables.forEach(function(table){ %>
  <%= table.modelName %>Controller,
<% }) %>
]
`;