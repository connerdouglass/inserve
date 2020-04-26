import express from 'express';
import { container } from 'tsyringe';
import { Handler } from './handler';
import { Newable } from './newable';

// NOTE: This comes directly from Express. Ideally, would like to link into an internal
//       type definition, for maximum compatibility.
type PathParams = string | RegExp | Array<string | RegExp>;

export class Server {

    /**
     * The Express server instance
     */
    private express_server: express.Application;

    /**
     * Constructs a server instance
     */
    public constructor() {

        // Create the underlying server
        this.express_server = express();

    }

    /**
     * Launches the server, listening on the specified port number. Returns a promise
     * which resolves when the server is successfully started.
     * @param port the port number to listen on
     */
    public listen(port: number | string): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            // Start the server
            this.express_server.listen(port, () => {

                // Resolve the promise
                resolve();

            });

        });
    }

    private attach(method: string, path: PathParams, ...handlers: Newable<Handler>[]): this {
        this.express_server[method]?.(path, ...handlers.map(h => Server.wrapHandler(h)));
        return this;
    }

    public get(path: PathParams, ...handlers: Newable<Handler>[]): this {
        return this.attach('get', path, ...handlers);
    }

    public post(path: PathParams, ...handlers: Newable<Handler>[]): this {
        return this.attach('post', path, ...handlers);
    }

    public use(path: PathParams, ...handlers: Newable<Handler>[]): this {
        return this.attach('use', path, ...handlers);
    }

    private static wrapHandler(h: Newable<Handler>): express.RequestHandler {

        // The instance itself
        let instance: Handler | null = null;

        // Return the handler function
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {

            // If the value has not been resolved
            if (instance === null) {

                // Resolve the instance
                instance = container.resolve(h);

            }

            try {

                // Call the handler function
                const result = instance.handle(req, res);

                // If there is a result, and it's a promise, wait for it to resolve
                if (result && result instanceof Promise) await result;

            } catch {

            }

            // Wait for a brief timeout
            await new Promise<void>(res => setTimeout(res, 0));

            // If the headers have not been sent
            if (!res.headersSent) {

                // Call the next handler
                next();

            }

        };

    }

}
