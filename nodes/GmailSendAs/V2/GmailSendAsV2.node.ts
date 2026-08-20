import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeBaseDescription,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { assertSafeHeaderValue, validateAddressList } from '../helpers/addresses';
import { appendN8nAttribution } from '../helpers/attribution';
import { collectAttachments } from '../helpers/attachments';
import { gmailApiRequest } from '../helpers/gmailApi';
import { buildRawMessage } from '../helpers/mime';
import {
	buildReplyRecipientLists,
	buildReplyThreadHeaders,
	selectLatestThreadMessage,
} from '../helpers/reply';
import {
	formatSendAsOption,
	resolveSendAsIdentity,
	sortSendAsIdentities,
} from '../helpers/sendAs';
import type {
	EmailFormat,
	GmailMessageMetadata,
	GmailMessageResponse,
	GmailSendAsIdentity,
	GmailSendAsListResponse,
	GmailThreadResponse,
	ReplyTargetType,
} from '../types';

const SEND_AS_ENDPOINT = '/gmail/v1/users/me/settings/sendAs';
const SEND_MESSAGE_ENDPOINT = '/gmail/v1/users/me/messages/send';

async function listSendAsIdentities(
	context: IExecuteFunctions | ILoadOptionsFunctions,
): Promise<GmailSendAsIdentity[]> {
	const response = (await gmailApiRequest.call(
		context,
		'GET',
		SEND_AS_ENDPOINT,
	)) as GmailSendAsListResponse;
	return response.sendAs ?? [];
}

async function resolveReplyReference(
	context: IExecuteFunctions,
	targetType: ReplyTargetType,
	targetId: string,
): Promise<{ message: GmailMessageMetadata; threadId: string; messageId: string }> {
	if (targetType === 'message') {
		const message = (await gmailApiRequest.call(
			context,
			'GET',
			`/gmail/v1/users/me/messages/${encodeURIComponent(targetId)}`,
			{},
			{ format: 'metadata' },
		)) as GmailMessageMetadata;

		if (!message.threadId) {
			throw new Error('The referenced Gmail message does not contain a thread ID');
		}

		return {
			message,
			threadId: message.threadId,
			messageId: message.id ?? targetId,
		};
	}

	const thread = (await gmailApiRequest.call(
		context,
		'GET',
		`/gmail/v1/users/me/threads/${encodeURIComponent(targetId)}`,
		{},
		{ format: 'metadata' },
	)) as GmailThreadResponse;
	const message = selectLatestThreadMessage(thread);

	return {
		message,
		threadId: thread.id ?? message.threadId ?? targetId,
		messageId: message.id ?? '',
	};
}

function invalidIdentityDescription(reason: 'missing' | 'pending' | 'unverified'): string {
	const descriptions = {
		missing:
			'The selected address is not configured as a Send As identity for the authenticated Gmail account.',
		pending:
			'The selected Gmail Send As identity is pending verification. Verify it in Gmail before sending.',
		unverified: 'The selected Gmail Send As identity is not verified and cannot be used for sending.',
	};
	return descriptions[reason];
}

export class GmailSendAsV2 implements INodeType {
	description: INodeTypeDescription;

	constructor(baseDescription: INodeTypeBaseDescription) {
		this.description = {
			...baseDescription,
			version: 2,
			subtitle: '={{$parameter["operation"]}}',
			defaults: {
				name: 'Gmail Send As',
			},
			inputs: [NodeConnectionTypes.Main],
			outputs: [NodeConnectionTypes.Main],
			usableAsTool: true,
			credentials: [
				{
					// eslint-disable-next-line n8n-nodes-base/node-class-description-credentials-name-unsuffixed
					name: 'gmailOAuth2',
					required: true,
				},
			],
			properties: [
				{
					displayName: 'Operation',
					name: 'operation',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Reply',
							value: 'reply',
							action: 'Reply using a Gmail send as identity',
						},
						{
							name: 'Send',
							value: 'send',
							action: 'Send an email using a Gmail send as identity',
						},
					],
					default: 'send',
				},
				{
					displayName: 'From / Send As Name or ID',
					name: 'fromEmail',
					type: 'options',
					typeOptions: {
						loadOptionsMethod: 'getSendAsIdentities',
					},
					default: '',
					required: true,
					description:
						'Choose from the list, or specify an ID using an <a href="https://docs.n8n.io/code/expressions/">expression</a>',
				},
				{
					displayName: 'Reply Target',
					name: 'replyTargetType',
					type: 'options',
					noDataExpression: true,
					options: [
						{
							name: 'Message ID',
							value: 'message',
							description: 'Reply to one specific Gmail message',
						},
						{
							name: 'Thread ID',
							value: 'thread',
							description: 'Reply using the newest message in a Gmail thread as the reference',
						},
					],
					default: 'message',
					displayOptions: { show: { operation: ['reply'] } },
				},
				{
					displayName: 'Message ID',
					name: 'messageId',
					type: 'string',
					default: '',
					required: true,
					placeholder: '172ce2c4a72cc243',
					description: 'Gmail message ID to reply to',
					displayOptions: {
						show: { operation: ['reply'], replyTargetType: ['message'] },
					},
				},
				{
					displayName: 'Thread ID',
					name: 'threadId',
					type: 'string',
					default: '',
					required: true,
					placeholder: '172ce2c4a72cc243',
					description:
						'Gmail thread ID. The newest message in the thread is used to derive recipients and RFC reply headers.',
					displayOptions: {
						show: { operation: ['reply'], replyTargetType: ['thread'] },
					},
				},
				{
					displayName: 'To',
					name: 'sendTo',
					type: 'string',
					default: '',
					required: true,
					placeholder: 'recipient@example.com',
					description: 'Recipient addresses separated by commas',
					displayOptions: { show: { operation: ['send'] } },
				},
				{
					displayName: 'Subject',
					name: 'subject',
					type: 'string',
					default: '',
					required: true,
					displayOptions: { show: { operation: ['send'] } },
				},
				{
					displayName: 'Email Format',
					name: 'emailFormat',
					type: 'options',
					noDataExpression: true,
					options: [
						{ name: 'Text', value: 'text' },
						{ name: 'HTML', value: 'html' },
						{ name: 'Text and HTML', value: 'both' },
					],
					default: 'html',
				},
				{
					displayName: 'Text Body',
					name: 'textBody',
					type: 'string',
					typeOptions: { rows: 8 },
					default: '',
					required: true,
					displayOptions: { show: { emailFormat: ['text', 'both'] } },
				},
				{
					displayName: 'HTML Body',
					name: 'htmlBody',
					type: 'string',
					typeOptions: { rows: 8, editor: 'htmlEditor' },
					default: '',
					required: true,
					displayOptions: { show: { emailFormat: ['html', 'both'] } },
				},
				{
					displayName: 'Options',
					name: 'options',
					type: 'collection',
					placeholder: 'Add option',
					default: {},
					options: [
						{
							displayName: 'Append n8n Attribution',
							name: 'appendAttribution',
							type: 'boolean',
							default: false,
							description:
								'Whether to append the phrase “This email was sent automatically with n8n” to the message. Disabled by default for backward compatibility.',
						},
						{
							displayName: 'Attachments',
							name: 'attachmentsUi',
							type: 'fixedCollection',
							typeOptions: { multipleValues: true },
							default: {},
							placeholder: 'Add Attachment',
							description: 'Binary properties from the current input item to attach',
							options: [
								{
									displayName: 'Attachment',
									name: 'attachmentsBinary',
									values: [
										{
											displayName: 'Attachment Field Name',
											name: 'property',
											type: 'string',
											default: 'data',
											description:
												'Binary property name from the input. Multiple names can be separated by commas.',
										},
									],
								},
							],
						},
						{
							displayName: 'BCC',
							name: 'bccList',
							type: 'string',
							default: '',
							placeholder: 'info@example.com',
							description: 'Blind-copy recipient addresses separated by commas',
						},
						{
							displayName: 'CC',
							name: 'ccList',
							type: 'string',
							default: '',
							placeholder: 'info@example.com',
							description: 'Copy recipient addresses separated by commas',
						},
						{
							displayName: 'Sender Name',
							name: 'senderName',
							type: 'string',
							default: '',
							placeholder: 'e.g. Support Team',
							description:
								'Optional display name override. When empty, the display name configured for the Gmail identity is used.',
						},
						{
							displayName: 'Send Replies To',
							name: 'replyTo',
							type: 'string',
							default: '',
							placeholder: 'reply@example.com',
							description: 'The email address that replies should be sent to',
							displayOptions: { show: { '/operation': ['send'] } },
						},
						{
							displayName: 'Reply to Sender Only',
							name: 'replyToSenderOnly',
							type: 'boolean',
							default: false,
							description:
								'Whether to reply only to the original sender/Reply-To address instead of replying to all visible recipients',
							displayOptions: { show: { '/operation': ['reply'] } },
						},
					],
				},
			],
		};
	}

	methods = {
		loadOptions: {
			async getSendAsIdentities(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const identities = await listSendAsIdentities(this);
				return sortSendAsIdentities(identities).map(formatSendAsOption);
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		if (items.length === 0) return [returnData];

		const identities = await listSendAsIdentities(this);
		const ownAddresses = identities.map((identity) => identity.sendAsEmail);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const operation = this.getNodeParameter('operation', itemIndex) as 'send' | 'reply';
				const selectedFromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
				const resolution = resolveSendAsIdentity(identities, selectedFromEmail);

				if (!resolution.ok) {
					throw new NodeOperationError(this.getNode(), 'Invalid Gmail Send As identity', {
						description: invalidIdentityDescription(resolution.reason),
						itemIndex,
					});
				}

				const options = this.getNodeParameter('options', itemIndex, {}) as IDataObject;
				const senderNameOverride = String(options.senderName ?? '').trim();
				const senderName = senderNameOverride || resolution.identity.displayName?.trim() || '';
				const manualCc = validateAddressList(String(options.ccList ?? ''), 'CC');
				const bcc = validateAddressList(String(options.bccList ?? ''), 'BCC');
				const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as EmailFormat;

				assertSafeHeaderValue(senderName, 'Sender Name');

				let text =
					emailFormat === 'text' || emailFormat === 'both'
						? (this.getNodeParameter('textBody', itemIndex) as string)
						: undefined;
				let html =
					emailFormat === 'html' || emailFormat === 'both'
						? (this.getNodeParameter('htmlBody', itemIndex) as string)
						: undefined;

				if (options.appendAttribution === true) {
					const attributed = appendN8nAttribution(emailFormat, text, html);
					text = attributed.text;
					html = attributed.html;
				}

				const attachmentsUi = (options.attachmentsUi ?? {}) as IDataObject;
				const attachments = await collectAttachments(this, itemIndex, attachmentsUi);

				let to = '';
				let cc = manualCc;
				let replyTo: string | undefined;
				let subject = '';
				let threadId: string | undefined;
				let inReplyTo: string | undefined;
				let references: string | undefined;
				let repliedToMessageId: string | undefined;

				if (operation === 'send') {
					to = validateAddressList(
						this.getNodeParameter('sendTo', itemIndex) as string,
						'To',
						{ required: true },
					);
					subject = this.getNodeParameter('subject', itemIndex) as string;
					replyTo = validateAddressList(String(options.replyTo ?? ''), 'Reply-To', {
						single: true,
					}) || undefined;
				} else {
					const targetType = this.getNodeParameter(
						'replyTargetType',
						itemIndex,
					) as ReplyTargetType;
					const targetIdParameter = targetType === 'message' ? 'messageId' : 'threadId';
					const targetId = String(this.getNodeParameter(targetIdParameter, itemIndex)).trim();
					if (!targetId) throw new Error(`${targetType === 'message' ? 'Message' : 'Thread'} ID is required`);

					const reference = await resolveReplyReference(this, targetType, targetId);
					const threadHeaders = buildReplyThreadHeaders(reference.message);
					const recipientLists = buildReplyRecipientLists(
						reference.message,
						ownAddresses,
						options.replyToSenderOnly === true,
					);

					to = recipientLists.to;
					cc = [recipientLists.cc, manualCc].filter(Boolean).join(', ');
					subject = threadHeaders.subject;
					threadId = reference.threadId;
					inReplyTo = threadHeaders.inReplyTo;
					references = threadHeaders.references;
					repliedToMessageId = reference.messageId || undefined;
				}

				assertSafeHeaderValue(subject, 'Subject');

				const raw = await buildRawMessage({
					fromEmail: resolution.identity.sendAsEmail,
					senderName: senderName || undefined,
					to,
					cc: cc || undefined,
					bcc: bcc || undefined,
					replyTo,
					subject,
					text,
					html,
					attachments,
					inReplyTo,
					references,
				});

				const body: IDataObject = { raw };
				if (threadId) body.threadId = threadId;

				const response = (await gmailApiRequest.call(
					this,
					'POST',
					SEND_MESSAGE_ENDPOINT,
					body,
				)) as GmailMessageResponse;

				returnData.push({
					json: {
						...response,
						operation,
						sendAs: resolution.identity.sendAsEmail,
						...(repliedToMessageId ? { repliedToMessageId } : {}),
						...(threadId ? { repliedToThreadId: threadId } : {}),
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (error as Error).message },
						pairedItem: { item: itemIndex },
					});
					continue;
				}

				throw new NodeOperationError(this.getNode(), error as Error, { itemIndex });
			}
		}

		return [returnData];
	}
}
