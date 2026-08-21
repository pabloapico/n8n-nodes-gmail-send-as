import addressparser from 'nodemailer/lib/addressparser';

import type { GmailMessageMetadata, GmailThreadResponse } from '../types';
import { normalizeEmailAddress } from './sendAs';

export function getHeaderValue(message: GmailMessageMetadata, headerName: string): string {
	const normalizedHeaderName = headerName.toLowerCase();
	const header = message.payload?.headers?.find(
		(candidate) => candidate.name.toLowerCase() === normalizedHeaderName,
	);
	return header?.value?.trim() ?? '';
}

export function selectLatestThreadMessage(thread: GmailThreadResponse): GmailMessageMetadata {
	const messages = thread.messages ?? [];
	if (messages.length === 0) {
		throw new Error('The Gmail thread contains no messages');
	}

	return messages.reduce((latest, candidate) => {
		const latestDate = Number(latest.internalDate ?? 0);
		const candidateDate = Number(candidate.internalDate ?? 0);
		return candidateDate >= latestDate ? candidate : latest;
	});
}

function parseHeaderAddresses(value: string): string[] {
	if (!value.trim()) return [];
	return addressparser(value, { flatten: true })
		.map((entry) => entry.address?.trim() ?? '')
		.filter(Boolean);
}

export function buildReplyRecipientLists(
	message: GmailMessageMetadata,
	ownAddresses: Iterable<string>,
	replyToSenderOnly: boolean,
): { to: string; cc: string } {
	const own = new Set(Array.from(ownAddresses, normalizeEmailAddress));
	const toRecipients = new Map<string, string>();
	const ccRecipients = new Map<string, string>();

	const addHeader = (headerValue: string, destination: Map<string, string>) => {
		for (const address of parseHeaderAddresses(headerValue)) {
			const normalized = normalizeEmailAddress(address);
			if (!normalized || own.has(normalized)) continue;
			if (!toRecipients.has(normalized) && !ccRecipients.has(normalized)) {
				destination.set(normalized, address);
			}
		}
	};

	const replyTarget = getHeaderValue(message, 'Reply-To') || getHeaderValue(message, 'From');
	addHeader(replyTarget, toRecipients);

	if (!replyToSenderOnly) {
		addHeader(getHeaderValue(message, 'To'), toRecipients);
		addHeader(getHeaderValue(message, 'Cc'), ccRecipients);
	}

	if (toRecipients.size === 0 && ccRecipients.size > 0) {
		const firstCc = ccRecipients.entries().next().value as [string, string] | undefined;
		if (firstCc) {
			ccRecipients.delete(firstCc[0]);
			toRecipients.set(firstCc[0], firstCc[1]);
		}
	}

	if (toRecipients.size === 0) {
		throw new Error('No reply recipients remain after excluding the authenticated Gmail identities');
	}

	return {
		to: Array.from(toRecipients.values()).join(', '),
		cc: Array.from(ccRecipients.values()).join(', '),
	};
}

export function buildReplyThreadHeaders(message: GmailMessageMetadata): {
	subject: string;
	inReplyTo: string;
	references: string;
} {
	const subject = getHeaderValue(message, 'Subject');
	const messageId = getHeaderValue(message, 'Message-ID');
	if (!messageId) {
		throw new Error('The referenced Gmail message does not contain an RFC Message-ID header');
	}

	const existingReferences = getHeaderValue(message, 'References');
	const references = existingReferences ? `${existingReferences} ${messageId}` : messageId;

	return {
		subject,
		inReplyTo: messageId,
		references,
	};
}
