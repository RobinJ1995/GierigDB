const checkNotNull = val => {
	if (val === null || val === undefined) {
		throw new Error('Value is null');
	}

	return val;
};

const checkNotEmpty = val => {
	if (String(checkNotNull(val)).trim() === '') {
		throw new Error('Value is an empty string');
	}

	return val;
};

const checkIsNumberOrString = val => {
	if (['number', 'string'].includes(typeof val)) {
		return val;
	}

	throw new Error('Value is not a number or a string');
}

const clone = obj => JSON.parse(JSON.stringify(checkNotNull(obj)));

module.exports = {
	checkNotNull,
	checkNotEmpty,
	checkIsNumberOrString,
	clone
};