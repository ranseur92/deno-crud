import { equal, Router, RouterMiddleware, RouterContext } from "../deps.ts"
import type { Row } from "./model.ts";

type ControllerMethods = "index" | "find" | "create" | "update" | "delete";
type IndexRecord<T> = () => Promise<Row<T>[]>;
type FindRecord<T> = (id: number) => Promise<Row<T>>;
type CreateRecord<T> = (body: Omit<T, 'id'>) => Promise<Row<T>>;
type UpdateRecord<T> = (id: number, body: Partial<Omit<T, 'id'>>) => Promise<Row<T>>;
type DeleteRecord = (id: number) => Promise<number>;

export type Controller<T> = {
  route: string;
  index: IndexRecord<T>;
  find: FindRecord<T>; 
  create: CreateRecord<T>;
  update: UpdateRecord<T>;
  delete: DeleteRecord;
}

async function getBody(ctx: RouterContext<string>) {
  try {
    if (ctx.state.body) return ctx.state.body;
    return await ctx.request.body().value
  } catch (e) {}
  return undefined;
}

function wrapper<T>(controller: Controller<T>, method: ControllerMethods) {
  const middleware: RouterMiddleware<string> = async (ctx: RouterContext<string>, nextFn) => {

    const body = await getBody(ctx);

    const callback = controller[method];
    let result;

    if (method === 'create' || method === 'update') {
      if (!body) throw new Error("No payload specified.")
      if (equal(body, {})) throw new Error("Empty payload.")
    }

    if (method === 'create') {
      result = await (callback as CreateRecord<T>)(body as T)
    } else if (method === 'update') {
      result = await (callback as UpdateRecord<T>)(parseInt(ctx.params.id!), body as T)
    } else if (method === 'delete') {
      result = await (callback as DeleteRecord)(parseInt(ctx.params.id!))
    } else if (method === 'find') {
      result = await (callback as FindRecord<T>)(parseInt(ctx.params.id!))
    } else if (method === 'index') {
      result = await (callback as IndexRecord<T>)();
    } else {
      throw new Error("Method not supported.")
    }

    if (Array.isArray(result)) {
      result = result.map(r => r.toJSON());
    } else if (typeof result === 'object') {
      result = result.toJSON();
    }

    if (!result) return !result;
    ctx.response.body = result;
    ctx.response.headers.set('content-type', 'application/json');

    await nextFn();
  }

  return middleware;
}

export function register<T>(router: Router, controller: Controller<T>) {
  const controllerRouter = new Router({ prefix: controller.route });
  controllerRouter.get('/', wrapper<T>(controller, 'index'))
  controllerRouter.get(`/:id`, wrapper<T>(controller, 'find'))
  controllerRouter.post(`/`, wrapper<T>(controller, 'create'))
  controllerRouter.patch(`/:id`, wrapper<T>(controller, 'update'))
  controllerRouter.delete(`/:id`, wrapper<T>(controller, 'delete'))

  router.use(controllerRouter.routes());
  router.use(controllerRouter.allowedMethods());
}