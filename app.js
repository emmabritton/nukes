require('dotenv').config();

const express = require('express');
const util = require('util');
const fs = require('fs');
const sprintf = require('sprintf-js').sprintf;

const app = express();

app.use(express.static(__dirname + '/public'));

global.SERVER_HOST = process.env.HOSTNAME || '0.0.0.0';
global.SERVER_PORT = process.env.PORT || '3001';

const file = makeHtmlPage();

app.get('/alive', (req, res) => res.sendStatus(200));

app.get('/', (req, res) => res.send(file));

app.use('/', (req, res) => res.sendStatus(404));

app.listen(SERVER_PORT, SERVER_HOST);

console.log(sprintf('Nukes started at %s listening on %s:%s', new Date().toISOString(), SERVER_HOST, SERVER_PORT));

function makeHtmlPage() {
    var countries = fs.readFileSync('./res/countries.json').toString();
    var detonations = fs.readFileSync('./res/detonations.json').toString();
    return sprintf(fs.readFileSync('./res/map.html').toString(), countries, detonations);
}