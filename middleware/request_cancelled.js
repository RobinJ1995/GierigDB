module.exports = (req, res, next) => {
	const subscribers = [];
	req.onCancel = cb => subscribers.push(cb);

	req.on('close', () => {
		req.cancelled = true;

		if (res.headersSent) {
			return;
		}

		console.log(`Request cancelled: ${req.method} ${req.originalUrl}`);
		subscribers.forEach(cb => cb());
	})

	next();
}