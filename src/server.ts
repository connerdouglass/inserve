import express from 'express';
import { DependencyContainer, container as RootContainer } from 'tsyringe';
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
     * The dependency injection container
     */
    private container: DependencyContainer = RootContainer;

    /**
     * Constructs a server instance
     */
    public constructor() {

        // Create the underlying server
        this.express_server = express();

    }

    /**
     * Gets the underlying Express server instance
     */
    public getExpressServer(): express.Application {
        return this.express_server;
    }

    /**
     * Gets the dependency injection container for this server
     */
    public getContainer(): DependencyContainer {
        return this.container;
    }

    /**
     * Launches the server, listening on the specified port number. Returns a promise
     * which resolves when the server is successfully started.
     * @param port the port number to listen on
     */
    public listen(port: number | string): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            // Start the server
            this.express_server
                .listen(port, resolve)
                .on('error', reject);

        });
    }

    public get(path: PathParams, ...handlers: Newable<Handler | Server>[]): this {
        return this.attach('get', path, ...handlers);
    }

    public post(path: PathParams, ...handlers: Newable<Handler | Server>[]): this {
        return this.attach('post', path, ...handlers);
    }

    public use(path: PathParams, ...handlers: Newable<Handler | Server>[]): this {
        return this.attach('use', path, ...handlers);
    }

    /**
     * Attaches some handlers to a specific method on the underlying express server
     * @param method the method to call 'get', 'post', etc.
     * @param path the path to register the handler(s) to
     * @param handlers the handlers to register
     */
    private attach(method: string, path: PathParams, ...handlers: Newable<Handler | Server>[]): this {
        this.express_server[method]?.(path, ...handlers.map(h => this.wrapHandler(h)));
        return this;
    }

    /**
     * Takes a handler received as an argument and converts it into a request handler
     * function that can be understood by Express
     * @param h the handler passed in as an argument
     */
    private wrapHandler(h: Newable<Handler | Server>): express.RequestHandler {

        // The instance itself
        let instance: Handler | Server | null = null;

        // Return the handler function
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {

            // If the value has not been resolved
            if (instance === null) {

                // Resolve the instance
                instance = this.container.resolve(h);

            }

            // If the instance is a Server
            if (instance instanceof Server) instance.express_server(req, res, next);

            // Or, if the instance is a Handler instance
            else {

                // Call the handler function
                const result = instance.handle(req, res);

                // If there is a result, and it's a promise, wait for it to resolve
                if (result && result instanceof Promise) await result;

                // Wait for a brief timeout
                await new Promise<void>(res => setTimeout(res, 0));

                // If the headers have not been sent
                if (!res.headersSent) {

                    // Call the next handler
                    next();

                }

            }

        };

    }

}
