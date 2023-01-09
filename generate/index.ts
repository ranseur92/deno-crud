import { renderAsync, join, dirname } from '../deps.ts';
import { getTables, getFields, close } from './queries.ts';

console.log({
  module: Deno.mainModule, 
  importUrl: import.meta.url
})

const genURL = dirname(import.meta.url);
const apiURL = join(genURL, '../api').replace(/\\/g, '/');

console.log({
  module: Deno.mainModule, 
  importUrl: import.meta.url, 
  genURL, 
  apiURL
})

async function render(templateName: string, tableData: any, file: string) {
  const template = Deno.readTextFileSync(join(genURL, `./data/${templateName}.eta`));
  const text = await renderAsync(template, tableData, { cache: true });
  const filePath = join(Deno.cwd(), '/api/', file);
  if (typeof text === 'string') {
    Deno.mkdirSync(dirname(filePath), { recursive: true });
    Deno.writeTextFileSync(filePath, text)
  }
}

const tables = [];

for(const tableName of await getTables()) {
  tables.push({
    tableName,
    modelName: tableName.split('_').map(n => n.slice(0,1).toUpperCase() + n.slice(1)).join(''),
    fields: await getFields(tableName)
  })
}

const renderData = { tables, apiURL };

await render('models', renderData, 'models.ts');
await render('types', renderData, 'types.ts');
await render('router', renderData, 'router.ts');

for(const table of tables) {
  await render('controller', { apiURL, table }, `./controllers/${table.tableName}.ts`);
}

await close();