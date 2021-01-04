const {
	checkNotEmpty,
	tryParseInt
} = require('./utils');

module.exports = {
	http: {
		port: tryParseInt(process.env.PORT) ?? 9009,
		request: {
			body: {
				max_size: process.env.HTTP_REQUEST_BODY_MAX_SIZE ?? '50mb'
			}
		}
	},
	s3: {
		endpoint: process.env.S3_ENDPOINT,
		access_key_id: checkNotEmpty(process.env.S3_ACCESS_KEY_ID ?? process.env.AWS_ACCESS_KEY_ID),
		secret_access_key: checkNotEmpty(process.env.S3_SECRET_ACCESS_KEY ?? process.env.AWS_SECRET_ACCESS_KEY),
		bucket: checkNotEmpty(process.env.S3_BUCKET)
	},
	search: {
		timeout_ms: tryParseInt(process.env.SEARCH_TIMEOUT_MS) ?? 1000 * 2.5
	},
	gc: {
		interval_ms: tryParseInt(process.env.GC_INTERVAL_MS) ?? 1000 * 60,
		clear_after_ms: tryParseInt(process.env.GC_CLEAR_AFTER_MS) ?? 1000 * 60 * 30
	}
};