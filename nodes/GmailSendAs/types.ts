import type { IDataObject } from 'n8n-workflow';

export type EmailFormat = 'text' | 'html' | 'both';

export type GmailSendAsVerificationStatus =
	| 'accepted'
	| 'pending'
	| 'verificationStatusUnspecified'
	| string;

export interface GmailSendAsIdentity extends IDataObject {
	sendAsEmail: string;
	displayName?: string;
	replyToAddress?: string;
	isPrimary?: boolean;
	isDefault?: boolean;
	treatAsAlias?: boolean;
	verificationStatus?: GmailSendAsVerificationStatus;
}

export interface GmailSendAsListResponse extends IDataObject {
	sendAs?: GmailSendAsIdentity[];
}

export interface GmailMessageResponse extends IDataObject {
	id?: string;
	threadId?: string;
	labelIds?: string[];
}

export interface EmailAttachment {
	filename: string;
	content: Buffer;
	contentType: string;
}

export interface MimeMessageInput {
	fromEmail: string;
	senderName?: string;
	to: string;
	cc?: string;
	bcc?: string;
	replyTo?: string;
	subject: string;
	text?: string;
	html?: string;
	attachments?: EmailAttachment[];
}
