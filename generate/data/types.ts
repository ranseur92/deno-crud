export default `
<% it.tables.forEach(function(table){ %>
export type <%= table.modelName %> = {
<% table.fields.forEach(function(f){ %>
  <%= f.name %>: <%= f.type %><% if(f.nullable) { %> | null<%}%>;
<% }) %>
}

<% }) %>
`;