import type { EmailFormat } from '../types';

const ATTRIBUTION_TEXT = 'This email was sent automatically with n8n';
const ATTRIBUTION_URL = 'https://n8n.io';

export function appendN8nAttribution(
	format: EmailFormat,
	text: string | undefined,
	html: string | undefined,
): { text?: string; html?: string } {
	let attributedText = text;
	let attributedHtml = html;

	if ((format === 'text' || format === 'both') && attributedText !== undefined) {
		attributedText = `${attributedText}\n\n---\n${ATTRIBUTION_TEXT}\n${ATTRIBUTION_URL}`;
	}

	if ((format === 'html' || format === 'both') && attributedHtml !== undefined) {
		attributedHtml = `${attributedHtml}<br><br>---<br><em>This email was sent automatically with <a href="${ATTRIBUTION_URL}" target="_blank">n8n</a></em>`;
	}

	return { text: attributedText, html: attributedHtml };
}
