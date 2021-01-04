const {
	checkNotEmpty
} = require('./utils');

module.exports = {
	http: {
		port: process.env.PORT ?? 9009,
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
		timeout_ms: process.env.SEARCH_TIMEOUT_MS ?? 2500
	}
}