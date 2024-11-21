import bodyParser from 'body-parser';
import express from 'express';
import config from '../config/config.json';
import { api } from './api';

const app = express();

Object.entries(config).forEach(([key, value]) => {
    app.set(key, value);
});

app.post('/', bodyParser.json());
app.post(
    '/',
    bodyParser.urlencoded({
        extended: true,
    })
);

api(app);

const { port } = config;

app.listen(port, () => {
    console.warn(`enketo-transformer running on port ${port}!`);
});
