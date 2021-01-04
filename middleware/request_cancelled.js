module.exports = (req, res, next) => {
	req.on('close', () => {
		req.cancelled = true;
	})

	next();
}