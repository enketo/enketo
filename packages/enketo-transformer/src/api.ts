/**
 * @module api
 *
 * @description This is not a robust, secure web API. It is just a quick starting point.
 * This repo is not used in production as a web API (only as a library).
 *
 * See inventory of work to be done here: https://github.com/enketo/enketo-transformer/labels/web-api-only.
 *
 * PRs are very welcome!
 */

import express from 'express';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { request } from 'undici';
import { fileURLToPath } from 'url';
import { transform } from './transformer';

const router = express.Router();

class FetchError extends Error {
    readonly status: number;

    constructor(status: number, message: string) {
        super(message);
        this.status = status;
    }
}

const getXForm = async (req: express.Request) => {
    const { xform } = req.query;

    try {
        if (typeof xform !== 'string') {
            throw new FetchError(
                400,
                'An `xform` query parameter is required.'
            );
        }

        if (!xform.includes('/')) {
            const basePath = resolve(
                dirname(fileURLToPath(import.meta.url)),
                '../'
            );
            const paths = [
                resolve(basePath, './test/forms', xform),
                resolve(
                    basePath,
                    './test/external-fixtures/enketo-core',
                    xform
                ),
            ];

            for (const path of paths) {
                try {
                    return readFileSync(path, 'utf-8');
                } catch {
                    // Try next path...
                }
            }

            throw new FetchError(400, `Could not find XForm: ${xform}`);
        }

        const response = await request(xform, {
            headers: {
                'X-OpenRosa-Version': '1.0',
            },
        });
        const { statusCode } = response;

        if (statusCode === 401) {
            throw new FetchError(
                statusCode,
                'Forbidden. Authorization Required.'
            );
        }

        if (statusCode < 200 || statusCode >= 300) {
            throw new FetchError(statusCode, `Request to ${xform} failed.`);
        }

        return response.body.text();
    } catch (error) {
        console.error(`Error occurred when requesting ${xform}`, error);

        if (error instanceof Error && !(error instanceof FetchError)) {
            throw new FetchError(500, error.message ?? 'Unknown error.');
        }

        throw error;
    }
};

const getTransformedSurvey = async (req: express.Request) => {
    const isPost = req.method === 'POST';
    const payload = isPost ? req.body : req.query;
    const { markdown, openclinica, theme } = payload;
    const media = isPost ? payload.media : {};
    const xform = req.method === 'POST' ? payload.xform : await getXForm(req);

    return transform({
        xform,
        markdown: markdown !== 'false',
        openclinica: openclinica === 'true',
        media,
        theme,
    });
};

router
    .all('/', (req, res, next) => {
        try {
            if (req.app.get('secure')) {
                throw new FetchError(405, 'Not Allowed.');
            }

            const payload = req.method === 'POST' ? req.body : req.query;

            if (payload.xform == null) {
                throw new FetchError(400, 'Bad Request.');
            }

            // Allow requests from anywhere
            res.set('Access-Control-Allow-Origin', '*');
            next();
        } catch (error) {
            next(error);
        }
    })
    .get('/', async (req, res, next) => {
        try {
            const survey = await getTransformedSurvey(req);

            res.json(survey);
        } catch (error) {
            next(error);
        }
    })
    .post('/', async (req, res, next) => {
        try {
            const survey = await getTransformedSurvey(req);

            res.json(survey);
        } catch (error) {
            next(error);
        }
    })
    // for development purposes, to return HTML that can be easily inspected in the developer console
    .get('/htmlform', async (req, res, next) => {
        try {
            const { form } = await getTransformedSurvey(req);

            res.set('Content-Type', 'text/html');
            res.end(form);
        } catch (error) {
            next(error);
        }
    });

const errorHandler: express.ErrorRequestHandler = (
    error: unknown,
    _req,
    res
) => {
    if (error instanceof FetchError) {
        res.status(error.status).send(
            `${error.message} (stack: ${error.stack})`
        );
    } else {
        res.status(500).send(`Unknown error: ${error}`);
    }
};

/** @package */
export const api = (app: express.Application) => {
    app.use('/transform', router, errorHandler);
};

/**
 * Exported for backwards compatibility, prefer named imports.
 */
export default api;
