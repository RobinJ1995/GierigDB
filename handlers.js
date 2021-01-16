const Collection = require('./Collection');
const { checkNotEmpty,
	checkIsNumberOrString,
	tryParseInt } = require('./utils');

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
		const limit = tryParseInt(req.query.limit) ?? null;
		getCollection(req.params.coll).search(req, req.params.query, limit)
			.then(data => res.status(200).send(data))
			.catch(error => {
				console.error(`Search for query="${req.params.query}" in collection=${req.params.coll} failed.`, error);
				res.status(500).send({ error })
			});
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

	app.patch('/:coll', (req, res) => {
		getCollection(req.params.coll).appendToCollection(req.body)
			.then(nNewItems => res.status(200).send({ n: nNewItems }));
	});

	app.put('/:coll', (req, res) => {
		getCollection(req.params.coll).replaceEntireCollection(req.body)
			.then(n => res.status(200).send({ n }));
	});

	app.delete('/:coll', (req, res) => {
		getCollection(req.params.coll).replaceEntireCollection({})
			.then(() => res.status(204).send());
	});
}