const Collection = require('./Collection');
const { checkNotEmpty, checkIsNumberOrString } = require('./utils');

const collections = {};

const getCollection = coll => {
	if (collections[checkNotEmpty(coll)] === undefined) {
		collections[checkIsNumberOrString(coll)] = new Collection(coll);
	}

	return collections[checkIsNumberOrString(coll)];
}

module.exports = app => {
	app.get('/:coll', (req, res) => {
		getCollection(req.params.coll).get()
			.then(data => res.status(200).send(data));
	});

	app.get('/:coll/:key', (req, res) => {
		getCollection(req.params.coll).get(req.params.key)
			.then(data => res.status(200).send({ key: req.params.key, data }));
	});

	app.get('/:coll/search/:query', (req, res) => {
		getCollection(req.params.coll).search(req.params.query)
			.then(data => res.status(200).send(data));
	});

	app.post('/:coll', (req, res) => {
		getCollection(req.params.coll).add(req.body)
			.then(key => res.status(200).send({ key: key, data: req.body }));
	});

	app.delete('/:coll/:key', (req, res) => {
		getCollection(req.params.coll).delete(req.params.key)
			.then(key => res.status(204).send());
	});

	app.put('/:coll/:key', (req, res) => {
		getCollection(req.params.coll).put(req.params.key, req.body)
			.then(key => res.status(200).send({ key: req.params.key, data: req.body }));
	});

	app.put('/:coll', (req, res) => {
		getCollection(req.params.coll).replaceEntireCollection(req.body)
			.then(() => res.status(204).send());
	});
}