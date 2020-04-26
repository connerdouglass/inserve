import express from 'express';
import { Newable } from './newable';

export interface Handler {
    handle(req: express.Request, res: express.Response): void | Promise<void>;
}

export class Handler {

    /**
     * Generates a wrapper handler class, which can be used as a server hook
     * @param express_handler the raw express handler function
     */
    public static from(express_handler: express.RequestHandler): Newable<Handler> {

        // Return a new class
        return class implements Handler {

            /**
             * Handles the request
             * @param req the express request object
             * @param res the express response object
             */
            public handle(req: express.Request, res: express.Response): Promise<void> {
                return new Promise<void>((resolve, reject) => {

                    // Trigger the raw handler
                    express_handler(req, res, resolve);

                });
            }

        };

    }

}
