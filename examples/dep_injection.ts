import 'reflect-metadata';
import { Request, Response } from 'express';
import http from 'http';
import { inject, injectable, InjectionToken } from 'tsyringe';
import { Handler, HTTP_SERVER_TOKEN, Server } from '../src';

/**
 * This injection token can be used to inject / resolve a database implementation
 */
const DATABASE_TOKEN: InjectionToken<IDatabase> = Symbol('DATABASE_TOKEN');

/**
 * Interface, which defines behaviors but not the specifics of how they are performed
 */
interface IDatabase {

    /**
     * Performs some user authentication check. I am not suggesting that this is a good
     * way to do this sort of thing. This example is used for illustrative purposes only.
     * @param token the user's authentication token
     */
    checkUserAuth(token: string): Promise<boolean>;

}

/**
 * Implementation, which defined implementation details for the aforementioned behaviors
 */
class MyDatabase implements IDatabase {

    public async checkUserAuth(token: string): Promise<boolean> {

        // Perform some check here. This is obviously only an example, and will allow anyone
        // with token 'hello'.
        return (token === 'hello');

    }

}

@injectable()
class RequireAccessToken implements Handler {

    /**
     * The database implementation is injected here. This middleware is agnostic
     * as it pertains to the specific implementation used. It just needs any
     * database that is wired up to work.
     */
    public constructor(
        @inject(DATABASE_TOKEN) private database: IDatabase) {}

    public async handle(req: Request, res: Response): Promise<void> {
return;
        // Get the token from headers
        const token: string | undefined = req.headers.authorization?.replace(/^Bearer\s+/i, '');

        // If there is no token
        if (!token) res.status(401).send('Unauthorized. No access token provided.');

        // Check the user authentication
        const authenticated: boolean = await this.database.checkUserAuth(token as string);

        // If the user isn't authenticated
        if (!authenticated) res.status(401).send('Unauthorized. Invalid access token.');

    }
}

@injectable()
class HelloWorld implements Handler {

    public constructor(
        @inject(HTTP_SERVER_TOKEN) private http_server: http.Server) {}

    public handle(req: Request, res: Response) {
        res.send('Hello world!');
    }

}

// Create the server instance
const server: Server = new Server();

// Inject the database instance
server.getContainer().register(DATABASE_TOKEN, MyDatabase);

// Start running the server
server.get('/', RequireAccessToken, HelloWorld);
server.listen(8080)
    .then(() => console.log(`Started server on port 8080`))
    .catch(console.error);
