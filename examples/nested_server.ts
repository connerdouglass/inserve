import 'reflect-metadata';
import { Server, Handler } from '../src';
import { Request, Response } from 'express';

class ApiServer extends Server {

    public constructor() {
        super();

        this.get('/v1', Handler.from((req, res) => res.send('You found the API!')));
    }

}

class WebsiteServer extends Server {

    public constructor() {
        super();

        this.get('/', Handler.from((req, res) => res.send('You found the website!')));
    }

}

// Create the server instance
const server: Server = new Server();
server.use('/', WebsiteServer);
server.use('/api', ApiServer);
server.listen(8080)
    .then(() => console.log(`Started server on port 8080`))
    .catch(console.error);
