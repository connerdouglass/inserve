# Inserve
Inserve aims to extend Express with a number of features that are vital while working on large codebases at scale. The goal is that it remains a very thin wrapper layer around Express, without significant divergence.

### Features
- First-class support for dependency injection into route handlers (using Microsoft's tsyringe library)
- A really great TypeScript experience. Typings built-in to the package, and used from the start, not as an afterthought.
- Compatibility with everything else that is made for Express. We don't change the fundamentals at all.
- BYOE: "Bring your own Express." We depend on Express and tsyringe as peer dependencies. The versions used in your project will be used by Inserve also.

### Example #1 - Hello World

```typescript
import 'reflect-metadata';
import { Server, Handler } from 'inserve';
import { Request, Response } from 'express';

// Define a route handler class. These can be used
// as middleware, endpoints, etc.
class HelloWorld implements Handler {

    public handle(req: Request, res: Response) {
        res.send('Hello world!');
    }

}

// Create and start the server
const server: Server = new Server();
server.get('/', HelloWorld);
server.listen(8080);

```

Pretty simple. But, this code is longer than the equivalent code in Express! So surely, there is a *useful* example, right? Right, that's where dependency injection comes in!

### Example #2 - Dependency Injection (w/ tsyringe)

```typescript
import 'reflect-metadata';
import { InjectionToken, injectable, inject } from 'tsyringe';
import { Server, Handler } from '../src';
import { Request, Response } from 'express';

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

        // Get the token from headers
        const token: string | undefined = req.headers.authorization?.replace(/^Bearer\s+/i, '');
        if (!token) res.status(401).send('Unauthorized. No access token provided.');

        // Check the user authentication
        const authenticated: boolean = await this.database.checkUserAuth(token as string);
        if (!authenticated) res.status(401).send('Unauthorized. Invalid access token.');

        // If you're familiar with Express, when this function returns, 
        // the underlying `next()` function is called, moving control
        // to the next middleware / handler.

    }
}

class HelloWorld implements Handler {

    public handle(req: Request, res: Response) {
        res.send('Hello world!');
    }

}

// Create the server instance
const server: Server = new Server();
server.get('/', RequireAccessToken, HelloWorld);

// Inject our database implementation
server.getContainer().register(DATABASE_TOKEN, MyDatabase);

// Start the database
server.listen(8080);
```

## Conclusion
For large codebases, where it's crucial to build generic components which can be used in multiple different environments, dependency injection is a must.

Inserve enables your Express servers to take advantage of dependency injection. Routes can define what services and values they need, and the upstream provider / environment can inject the appropriate implementation at runtime.

Hopefully you find this useful. I intend to add to this as needed for my other projects that depend on it; but, if you think of something you need, I an open to adding it too.
