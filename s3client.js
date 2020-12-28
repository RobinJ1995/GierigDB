const S3 = require('aws-sdk/clients/s3');

const config = require('./config');

const s3Config = {
	accessKeyId: config.s3.access_key_id,
	secretAccessKey: config.s3.secret_access_key,
};
if (config.s3.endpoint) {
	s3Config.endpoint = config.s3.endpoint;
}

const client = new S3(s3Config);

module.exports = client;