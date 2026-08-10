import type { INodePropertyOptions } from 'n8n-workflow';

import type { GmailSendAsIdentity } from '../types';

export type SendAsResolution =
	| { ok: true; identity: GmailSendAsIdentity }
	| { ok: false; reason: 'missing' | 'pending' | 'unverified' };

export function normalizeEmailAddress(email: string): string {
	return email.trim().toLowerCase();
}

export function isUsableSendAsIdentity(identity: GmailSendAsIdentity): boolean {
	if (identity.isPrimary === true) return true;
	return identity.verificationStatus === 'accepted';
}

export function resolveSendAsIdentity(
	identities: GmailSendAsIdentity[],
	selectedEmail: string,
): SendAsResolution {
	const normalizedSelectedEmail = normalizeEmailAddress(selectedEmail);
	const identity = identities.find(
		(candidate) => normalizeEmailAddress(candidate.sendAsEmail) === normalizedSelectedEmail,
	);

	if (!identity) return { ok: false, reason: 'missing' };
	if (identity.isPrimary === true || identity.verificationStatus === 'accepted') {
		return { ok: true, identity };
	}
	if (identity.verificationStatus === 'pending') {
		return { ok: false, reason: 'pending' };
	}
	return { ok: false, reason: 'unverified' };
}

export function formatSendAsOption(identity: GmailSendAsIdentity): INodePropertyOptions {
	const identityLabel = identity.displayName?.trim()
		? `${identity.displayName.trim()} <${identity.sendAsEmail}>`
		: identity.sendAsEmail;

	const statusLabels: string[] = [];
	if (identity.isPrimary) statusLabels.push('Primary');
	if (identity.isDefault) statusLabels.push('Default');
	if (!identity.isPrimary) {
		statusLabels.push(
			identity.verificationStatus === 'accepted'
				? 'Verified'
				: 'Pending verification — cannot send',
		);
	}

	const status = statusLabels.length > 0 ? ` — ${statusLabels.join(', ')}` : '';

	return {
		name: `${identityLabel}${status}`,
		value: identity.sendAsEmail,
		description: identity.replyToAddress
			? `Configured Gmail reply-to: ${identity.replyToAddress}`
			: undefined,
	};
}

export function sortSendAsIdentities(identities: GmailSendAsIdentity[]): GmailSendAsIdentity[] {
	return [...identities].sort((left, right) => {
		if (left.isPrimary !== right.isPrimary) return left.isPrimary ? -1 : 1;
		if (left.isDefault !== right.isDefault) return left.isDefault ? -1 : 1;
		return left.sendAsEmail.localeCompare(right.sendAsEmail);
	});
}
