const BASIC_EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;
const HEADER_BREAK_PATTERN = /[\r\n]/u;

export function assertSafeHeaderValue(value: string, fieldName: string): void {
	if (HEADER_BREAK_PATTERN.test(value)) {
		throw new Error(`${fieldName} must not contain line breaks`);
	}
}

function extractMailboxAddress(value: string): string {
	const angleBracketMatch = value.match(/<([^<>]+)>/u);
	return (angleBracketMatch?.[1] ?? value).trim();
}

export function validateAddressList(
	value: string,
	fieldName: string,
	options: { required?: boolean; single?: boolean } = {},
): string {
	const normalizedValue = value.trim();

	if (!normalizedValue) {
		if (options.required) throw new Error(`${fieldName} is required`);
		return '';
	}

	assertSafeHeaderValue(normalizedValue, fieldName);

	const entries = normalizedValue
		.split(',')
		.map((entry) => entry.trim())
		.filter(Boolean);

	if (options.single && entries.length !== 1) {
		throw new Error(`${fieldName} must contain exactly one email address`);
	}

	for (const entry of entries) {
		const mailbox = extractMailboxAddress(entry);
		if (!BASIC_EMAIL_PATTERN.test(mailbox)) {
			throw new Error(`Invalid email address in ${fieldName}: ${entry}`);
		}
	}

	return entries.join(', ');
}
