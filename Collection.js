const {
	checkNotNull,
	checkNotEmpty,
	checkIsNumberOrString,
	clone
} = require('./utils');
const config = require('./config');
const s3 = require('./s3client');
const { v4: uuid } = require('uuid');

class Collection {
	constructor(name) {
		this._initialised = false;

		this.name = checkNotEmpty(name);

		this._load();
	}

	add = val => {
		return this._awaitInitialisation(() => {
			const key = uuid();
			this.data[key] = clone(val);
				
			return this._persist()
				.then(() => key);
		});
	}

	delete = key => {
		return this._awaitInitialisation(() => {
			delete this.data[checkIsNumberOrString(key)];
		})
			.then(() => this._persist())
			.then(() => void 0);
	}

	put = (key, val) => {
		return this._awaitInitialisation(() => {
			this.data[checkIsNumberOrString(key)] = clone(val);
		})
			.then(() => this._persist())
			.then(() => void 0);
	}

	get = (key = null) => {
		return this._awaitInitialisation(() => {
			if (key === null) {
				return Promise.resolve(clone(this.data));
			}

			return Promise.resolve(clone(this.data[checkIsNumberOrString(key)]));
		});
	}

	search = query => {
		const queryLc = checkNotEmpty(query);

		return this._awaitInitialisation(() => {
			return Object.keys(this.data).filter(key => {
				const item = this.data[key];

				if (typeof item === 'string') {
					return item.toLowerCase().includes(queryLc);
				} else if (typeof item === 'object') {
					return Object.values(item)
						.some(val => {
							const valIsStr = typeof val === 'string';
							
							if (val === queryLc) {
								return true;
							} else if (valIsStr && String(val).toLowerCase().includes(queryLc)) {
								return true;
							} else if (JSON.stringify(val).toLowerCase().includes(queryLc)) {
								return true;
							}

							return false;
						});
				}

				return false;
			})
			.reduce((acc, cur) => ({
				...acc,
				[cur]: this.data[cur]
			}), {});
		});
	}

	replaceEntireCollection = data => {
		return this._awaitInitialisation(() => {
			console.warn(`Replacing data for entire collection=${this.name}...`);

			this.data = clone(data);

			return this._persist();
		}).then(() => void 0);
	}

	_load = () => {
		console.info(`Retrieving data for collection=${this.name} from bucket=${config.s3.bucket}...`);

		const req = {
			Bucket: config.s3.bucket,
			Key: this.name
		};

		return s3.getObject(req).promise()
			.then(data => data.Body.toString('utf-8'))
			.then(JSON.parse)
			.then(data => {
				this.data = clone(data);
				this._initialised = true;

				console.info(`Retrieved ${Object.keys(this.data).length} entries for collection=${this.name} from bucket=${config.s3.bucket}.`);
			}).catch(err => {
				if (err.code === 'NoSuchKey') {
					console.warn(`No data found for collection=${this.name} in bucket=${config.s3.bucket}. Initialising as an empty collection.`);
					this.data = {};
					this._initialised = true;

					return;
				}

				throw new Error(`Initialisation failed for collection=${this.name}.`, err);
			});
	}

	_awaitInitialisation = (cb) => {
		return new Promise((resolve, reject) => {
			const check = () => {
				if (this._initialised) {
					return resolve();
				}

				console.info(`Waiting until collection=${this.name} has been initialised...`);
				setTimeout(check, 100);
			};

			check();
		}).then(() => cb());
	}

	_persist = () => {
		console.info(`Persisting collection=${this.name} with ${Object.keys(this.data).length} entries to bucket=${config.s3.bucket}...`);

		const jsonData = JSON.stringify(this.data, undefined, 4);

		const req = {
			Bucket: config.s3.bucket,
			Key: this.name,
			Body: jsonData
		};

		return s3.putObject(req).promise()
			.then(() => console.info(`Collection=${this.name} persisted to bucket=${config.s3.bucket}.`));
	}
}

module.exports = Collection;