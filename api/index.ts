import { Application, Router, dirname, fromFileUrl, join, toFileUrl } from "../deps.ts";
import { Controller, register } from "./controller.ts";

export default async function() {

  const base = join(dirname(fromFileUrl(Deno.mainModule)), '/api/');

  const router = new Router({ prefix: '/api/' });
  
  const routerFile = toFileUrl(join(base, './router.ts')).href;
  const controllers: Controller<unknown>[] = (await import(routerFile)).default;
  controllers.forEach((controller) => register(router, controller));
  
  const api = new Application();
  api.use(router.routes());
  api.use(router.allowedMethods());

  return async function(req: Request, ctx: { next: () => Promise<Response> }) {
    const url = new URL(req.url);
    if (url.pathname.startsWith('/api/')) {
      const apiResult = await api.handle(req)
      if (apiResult) return apiResult;
    }
    return await ctx.next();
  }
}