const express = require('express');

const router = express.Router();

module.exports = (app) => {
    app.use(`${app.get('base path')}/dev`, router);
};

router.get('/', (req, res) => {
    res.render('surveys/dev', { src: req.query.iframe });
});
