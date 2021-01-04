const gc = require('./gc');
const config = require('./config');

setInterval(() => gc(), config.gc.gc_every_ms);