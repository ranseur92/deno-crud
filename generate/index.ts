import { renderAsync, join, fromFileUrl, dirname, toFileUrl } from '../deps.ts';
import { getTables, getFields, close } from './queries.ts';

const genURL = fromFileUrl(dirname(import.meta.url));
const apiURL = toFileUrl(join(genURL, '../api')).href.replace(/\\/g, '/');

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