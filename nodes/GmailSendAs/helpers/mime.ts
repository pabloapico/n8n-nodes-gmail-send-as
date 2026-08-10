import MailComposer from 'nodemailer/lib/mail-composer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

import type { MimeMessageInput } from '../types';

function toBase64Url(buffer: Buffer): string {
	return buffer.toString('base64').replace(/\+/gu, '-').replace(/\//gu, '_').replace(/=+$/u, '');
}

export async function buildRawMessage(input: MimeMessageInput): Promise<string> {
	const mailOptions: SMTPTransport.MailOptions = {
		from: input.senderName
			? { name: input.senderName, address: input.fromEmail }
			: input.fromEmail,
		to: input.to,
		cc: input.cc || undefined,
		bcc: input.bcc || undefined,
		replyTo: input.replyTo || undefined,
		subject: input.subject,
		text: input.text,
		html: input.html,
		attachments: input.attachments,
	};

	const compiledMessage = new MailComposer(mailOptions).compile();

	// Gmail needs the Bcc header in the raw MIME message to deliver blind copies.
	compiledMessage.keepBcc = true;

	const mimeBuffer = await compiledMessage.build();
	return toBase64Url(mimeBuffer);
}

export function decodeRawMessage(raw: string): Buffer {
	const base64 = raw.replace(/-/gu, '+').replace(/_/gu, '/');
	const paddingLength = (4 - (base64.length % 4)) % 4;
	return Buffer.from(`${base64}${'='.repeat(paddingLength)}`, 'base64');
}
