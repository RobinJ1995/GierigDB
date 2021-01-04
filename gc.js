module.exports = () => {
	try {
		if (!global['gc']) {
			console.warn('GC is not exposed. Skipping... To fix, launch with --expose-gc flag.');
			return;
		}

		global.gc();
	} catch (ex) {
		console.error('GC failed.', ex);
	}
}