const {
	checkNotNull,
	checkNotEmpty,
	checkIsNumberOrString,
	clone
} = require('./utils');
const config = require('./config');
const s3 = require('./s3client');
const { v4: uuid } = require('uuid');
const { removeDiacriticalMarks } = require('remove-diacritical-marks');
const gc = require('./gc');

const searchMatches = (query, item) => {
	if (typeof item === 'string') {
		return removeDiacriticalMarks(item).toLowerCase().includes(query);
	} else if (typeof item === 'object') {
		return Object.values(item)
			.some(val => {
				const valIsStr = typeof val === 'string';

				if (val === query) {
					return true;
				} else if (valIsStr && removeDiacriticalMarks(String(val)).toLowerCase().includes(query)) {
					return true;
				} else if (JSON.stringify(val).toLowerCase().includes(query)) {
					return true;
				}

				return false;
			});
	}

	return false;
};

class Collection {
	constructor(name) {
		this._initialising = false;
		this._initialised = false;
		this._locked = false;

		this._lastActivity = null;
		this._lastWriteOperation = null;

		this.name = checkNotEmpty(name);
		this.data = null;

		this._setupGc();
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

	search = (req, query) => {
		const queryLc = removeDiacriticalMarks(checkNotEmpty(query)).toLowerCase();
		let searchStart;

		return this._awaitInitialisation(() => {
			searchStart = new Date().getTime();
			console.info(`Starting search with query="${query}" in collection=${this.name}...`);
			
			const results = {};
			for (const key in this.data) {
				if (req.cancelled) {
					console.info(`Search with query="${query} in collection=${this.name} was cancelled. Ending search without returning results.`);
					return false;
				} else if (new Date().getTime() >= (searchStart + config.search.timeout_ms)) {
					console.warn(`Search with query="${query}" in collection=${this.name} has been running for ≥${config.search.timeout_ms}ms. Ending search.`);

					return results;
				}

				const item = this.data[key];
				if (searchMatches(queryLc, item)) {
					results[key] = item;
				}
			}

			return results;
		})
		.then(x => {
			if (x === false) {
				return {};
			}

			const searchTime = new Date().getTime() - searchStart;
			console.info(`Search for query="${query}" in collection=${this.name} returned ${Object.keys(x).length}/${Object.keys(this.data).length} entries in ${searchTime}ms.`);

			return x;
		});
	}

	replaceEntireCollection = data => {
		return this._awaitInitialisation(() => {
			console.warn(`Replacing data for entire collection=${this.name}...`);

			this.data = clone(data);

			return this._persist();
		}).then(() => void 0);
	}

	_load = () => this._withLock(() => {
		this._initialising = true;
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
				this._initialising = false;
				this._lastActivity = new Date();

				console.info(`Retrieved ${Object.keys(this.data).length} entries for collection=${this.name} from bucket=${config.s3.bucket}.`);
			}).catch(err => {
				if (err.code === 'NoSuchKey') {
					console.warn(`No data found for collection=${this.name} in bucket=${config.s3.bucket}. Initialising as an empty collection.`);
					this.data = {};
					this._initialised = true;
					this._initialising = false;

					return;
				}

				console.error(`Initialisation failed for collection=${this.name}.`, err)
				throw new Error(`Initialisation failed for collection=${this.name}.`);
			});
	})

	_setupGc = () => {
		setInterval(() => {
			if (!this._initialised || !this._lastActivity || this._initialising) {
				return;
			}

			const now = new Date().getTime();
			const timeBeforeTimeoutReached = (this._lastActivity.getTime() + config.gc.clear_after_ms) - now;
			if (timeBeforeTimeoutReached <= 0) {
				console.warn(`Last activity on collection=${this.name} was ${now - this._lastActivity.getTime()}ms ago. Clearing data from memory...`);

				this._withLock(() => {
					this._initialised = false;
					this._initialising = false;
					this.data = null;
					gc();

					console.info(`Collection=${this.name} de-initialised.`);
				});
			}
		}, config.gc.interval_ms);
	}

	_awaitInitialisation = (cb) => {
		return new Promise((resolve, reject) => {
			const check = () => {
				if (this._initialised) {
					return resolve();
				}

				if (!this._initialising) {
					console.info(`Collection=${this.name} is not initialised. Starting initialisation...`);
					return this._load()
						.then(() => resolve());
				}

				console.info(`Waiting until collection=${this.name} has been initialised...`);
				setTimeout(check, 100);
			};

			check();
		}).then(() => cb())
		.then(x => {
			this._lastActivity = new Date();

			return x;
		});
	}

	_withLock = (cb) => {
		return new Promise((resolve, reject) => {
			const check = () => {
				if (!this._locked) {
					return resolve();
				}

				console.info(`Waiting for lock on collection=${this.name}...`);
				setTimeout(check, 100);
			};

			check();
		}).then(() => {
			this._locked = true;

			return cb();
		}).then(x => {
			this._locked = false;

			return x;
		}).catch(err => {
			this._locked = false;

			throw err;
		})
	}

	_persist = () => this._withLock(() => {
		console.info(`Persisting collection=${this.name} with ${Object.keys(this.data).length} entries to bucket=${config.s3.bucket}...`);

		const jsonData = JSON.stringify(this.data, undefined, 4);

		const req = {
			Bucket: config.s3.bucket,
			Key: this.name,
			Body: jsonData
		};

		return s3.putObject(req).promise()
			.then(() => {
				const now = new Date();

				this._lastActivity = now;
				this._lastWriteOperation = now;
			})
			.then(() => console.info(`Collection=${this.name} persisted to bucket=${config.s3.bucket}.`));
	})
}

module.exports = Collection;