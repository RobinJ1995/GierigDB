require('console-stamp')(console);
const app = require('express')();
const BodyParser = require('body-parser');

const config = require('./config');

app.use(BodyParser.json({
	type: '*/*',
	limit: config.http.request.body.max_size
}));
app.use(BodyParser.urlencoded({ extended: true }));

require('./handlers')(app);

app.listen(config.http.port, () => {
	console.info(`Listening on port ${config.http.port}`);
});