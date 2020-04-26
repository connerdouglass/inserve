import 'reflect-metadata';
import { Server, Handler } from '../src';
import { Request, Response } from 'express';

class HelloWorld implements Handler {

    public handle(req: Request, res: Response) {
        res.send('Hello world!');
    }

}

// Create the server instance
const server: Server = new Server();

// Register a GET hook
server.get('/', HelloWorld);

// Begin listening on port 8080
server.listen(8080)
    .then(() => console.log(`Started server on port 8080`))
    .catch(console.error);
