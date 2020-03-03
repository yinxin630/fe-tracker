import * as Koa from 'koa';
import * as bodyparser from 'koa-bodyparser';

import { config } from './config';
import { logger } from './logging';
import { routes } from './routes';

const app = new Koa();
app.proxy = true;

app.use(
    bodyparser({
        detectJSON: function(ctx) {
            return ctx.method === 'POST';
        },
    }),
);

app.use(logger);

/**
 * 拦截异常返回 400 状态码
 */
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (err) {
        console.error(err);
        ctx.status = 400;
        ctx.body = err.message;
    }
});

app.use(routes);

app.listen(config.port, () => {
    console.log(`Server running on port ${config.port}`);
});
