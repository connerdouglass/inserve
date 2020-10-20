import http from 'http';
import express from 'express';
import { DependencyContainer, container as RootContainer, InjectionToken } from 'tsyringe';
import { Handler } from './handler';
import { Newable } from './newable';

// NOTE: This comes directly from Express. Ideally, would like to link into an internal
//       type definition, for maximum compatibility.
type PathParamsStr = string | RegExp | Array<string | RegExp>;

type PathParams = PathParamsStr | {
    path: PathParamsStr;
    eager?: boolean;
};

/**
 * Injection token for the underlying HTTP server instance
 */
export const HTTP_SERVER_TOKEN: InjectionToken<http.Server> = Symbol('HTTP_SERVER_TOKEN');

export class Server {

    /**
     * The Express server instance
     */
    private express_server: express.Application = express();

    /**
     * The dependency injection container
     */
    private container: DependencyContainer = RootContainer;

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
     * 
     * @param container the container to use for this server
     */
    public setContainer(container: DependencyContainer): void {
        this.container = container;
    }

    /**
     * Launches the server, listening on the specified port number. Returns a promise
     * which resolves when the server is successfully started.
     * @param port the port number to listen on
     */
    public listen(port: number | string): Promise<void> {
        return new Promise<void>((resolve, reject) => {

            // Create the HTTP server
            const http_server: http.Server = this.express_server.listen(port, resolve);

            // Inject the http server
            this.container.register(HTTP_SERVER_TOKEN, {useValue: http_server});

            // If there is an error
            http_server.on('error', reject);

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
        this.express_server[method]?.(
            (typeof path === 'string') ? path :
            (typeof path === 'object' && 'path' in path) ? path.path : null,
            ...handlers.map(h => this.wrapHandler(path, h)));
        return this;
    }

    /**
     * Takes a handler received as an argument and converts it into a request handler
     * function that can be understood by Express
     * @param path the path parameters
     * @param h the handler passed in as an argument
     */
    private wrapHandler(path: PathParams, h: Newable<Handler | Server>): express.RequestHandler {

        // The instance itself
        let instance: Handler | Server | null = null;

        // If we're loading eagerly
        if (typeof path === 'object' && 'eager' in path && path.eager) {

            // Resolve the instance right now
            instance = this.container.resolve(h);

        }

        // Return the handler function
        return async (req: express.Request, res: express.Response, next: express.NextFunction) => {

            // If the value has not been resolved
            if (instance === null) {

                try {

                    // Resolve the instance
                    instance = this.container.resolve(h);

                } catch (err) {

                    // Throw the error
                    res.send(err?.message ?? err ?? `Error resolving handler: ${h}`);
                    return;

                }

            }

            // If the instance is a Server
            if (instance instanceof Server) {

                // Create a nested container for the child
                instance.container = this.container.createChildContainer();

                // Call the underlying server
                instance.express_server(req, res, next);

            }

            // Or, if the instance is a Handler instance
            else {

                try {

                    // Call the handler function
                    const result = instance.handle(req, res);

                    // If there is a result, and it's a promise, wait for it to resolve
                    if (result && result instanceof Promise) await result;

                } catch (err) {

                    // Output an error
                    res.status(500).send('Internal server error');

                    // Log the error
                    console.error(err);

                }

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
