import type { IDataObject } from 'n8n-workflow';

export type EmailFormat = 'text' | 'html' | 'both';
export type ReplyTargetType = 'message' | 'thread';

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

export interface GmailHeader extends IDataObject {
	name: string;
	value: string;
}

export interface GmailMessagePayload extends IDataObject {
	headers?: GmailHeader[];
}

export interface GmailMessageMetadata extends IDataObject {
	id?: string;
	threadId?: string;
	internalDate?: string;
	payload?: GmailMessagePayload;
}

export interface GmailThreadResponse extends IDataObject {
	id?: string;
	messages?: GmailMessageMetadata[];
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
	inReplyTo?: string;
	references?: string;
}
