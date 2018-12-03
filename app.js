require('dotenv').config();

const express = require('express');
const request = require('request');
const util = require('util');
const fs = require('fs');
const cors = require('cors');
const sprintf = require('sprintf-js').sprintf;

const app = express();

app.use(express.static(__dirname + '/public'));

global.SERVER_HOST = process.env.HOSTNAME || 'localhost';
global.SERVER_PORT = process.env.PORT || '3001';

const file = fs.readFileSync('./res/map.html').toString();

app.get('/', function(req, res) {
    res.send(file);
});

app.use(function(err, req, res, next) {
    if (res.headersSent) {
        return next(err)
    }
	res.status(err.status || 500).send({'error': util.inspect(err)});
});

app.listen(SERVER_PORT, SERVER_HOST);

console.log(sprintf('Nukes started at %s listening on %s:%s', new Date().toISOString(), SERVER_HOST, SERVER_PORT));