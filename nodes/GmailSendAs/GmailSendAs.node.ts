import type {
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

import { assertSafeHeaderValue, validateAddressList } from './helpers/addresses';
import { collectAttachments } from './helpers/attachments';
import { gmailApiRequest } from './helpers/gmailApi';
import { buildRawMessage } from './helpers/mime';
import {
	formatSendAsOption,
	resolveSendAsIdentity,
	sortSendAsIdentities,
} from './helpers/sendAs';
import type {
	EmailFormat,
	GmailMessageResponse,
	GmailSendAsIdentity,
	GmailSendAsListResponse,
} from './types';

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

export class GmailSendAs implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Gmail Send As',
		name: 'gmailSendAs',
		icon: { light: 'file:gmailSendAs.svg', dark: 'file:gmailSendAs.dark.svg' },
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"]}}',
		description: 'Send Gmail messages from a configured Gmail Send As identity',
		defaults: {
			name: 'Gmail Send As',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		usableAsTool: true,
		credentials: [
			{
				// Reuse n8n's built-in Gmail credential intentionally for self-hosted instances.
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
				displayName: 'Sender Name',
				name: 'senderName',
				type: 'string',
				default: '',
				placeholder: 'e.g. Support Team',
				description:
					'Optional display name override. When empty, the display name configured for the Gmail identity is used.',
			},
			{
				displayName: 'To',
				name: 'sendTo',
				type: 'string',
				default: '',
				required: true,
				placeholder: 'recipient@example.com',
				description: 'Recipient addresses separated by commas',
			},
			{
				displayName: 'CC',
				name: 'ccList',
				type: 'string',
				default: '',
				placeholder: 'copy@example.com',
				description: 'Copy recipient addresses separated by commas',
			},
			{
				displayName: 'BCC',
				name: 'bccList',
				type: 'string',
				default: '',
				placeholder: 'blind-copy@example.com',
				description: 'Blind-copy recipient addresses separated by commas',
			},
			{
				displayName: 'Reply-To',
				name: 'replyTo',
				type: 'string',
				default: '',
				placeholder: 'replies@example.com',
				description: 'Optional address where replies should be delivered',
			},
			{
				displayName: 'Subject',
				name: 'subject',
				type: 'string',
				default: '',
				required: true,
			},
			{
				displayName: 'Email Format',
				name: 'emailFormat',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Text',
						value: 'text',
					},
					{
						name: 'HTML',
						value: 'html',
					},
					{
						name: 'Text and HTML',
						value: 'both',
					},
				],
				default: 'html',
			},
			{
				displayName: 'Text Body',
				name: 'textBody',
				type: 'string',
				typeOptions: {
					rows: 8,
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						emailFormat: ['text', 'both'],
					},
				},
			},
			{
				displayName: 'HTML Body',
				name: 'htmlBody',
				type: 'string',
				typeOptions: {
					rows: 8,
					editor: 'htmlEditor',
				},
				default: '',
				required: true,
				displayOptions: {
					show: {
						emailFormat: ['html', 'both'],
					},
				},
			},
			{
				displayName: 'Attachments',
				name: 'attachmentsUi',
				type: 'fixedCollection',
				typeOptions: {
					multipleValues: true,
				},
				default: {},
				placeholder: 'Add Attachment',
				description: 'Binary properties from the current input item to attach',
				options: [
					{
						displayName: 'Attachment',
						name: 'attachmentsBinary',
						values: [
							{
								displayName: 'Input Binary Field',
								name: 'property',
								type: 'string',
								default: 'data',
								placeholder: 'data',
								description:
									'Binary property name from the input. Multiple names can be separated by commas.',
							},
						],
					},
				],
			},
		],
	};

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

		// Fetch once per node execution, then validate each item against the live account settings.
		const identities = await listSendAsIdentities(this);

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const selectedFromEmail = this.getNodeParameter('fromEmail', itemIndex) as string;
				const resolution = resolveSendAsIdentity(identities, selectedFromEmail);

				if (!resolution.ok) {
					const descriptions = {
						missing:
							'The selected address is not configured as a Send As identity for the authenticated Gmail account.',
						pending:
							'The selected Gmail Send As identity is pending verification. Verify it in Gmail before sending.',
						unverified:
							'The selected Gmail Send As identity is not verified and cannot be used for sending.',
					};
					throw new NodeOperationError(this.getNode(), 'Invalid Gmail Send As identity', {
						description: descriptions[resolution.reason],
						itemIndex,
					});
				}

				const senderNameOverride = String(
					this.getNodeParameter('senderName', itemIndex, ''),
				).trim();
				const senderName = senderNameOverride || resolution.identity.displayName?.trim() || '';
				const to = validateAddressList(
					this.getNodeParameter('sendTo', itemIndex) as string,
					'To',
					{ required: true },
				);
				const cc = validateAddressList(
					this.getNodeParameter('ccList', itemIndex, '') as string,
					'CC',
				);
				const bcc = validateAddressList(
					this.getNodeParameter('bccList', itemIndex, '') as string,
					'BCC',
				);
				const replyTo = validateAddressList(
					this.getNodeParameter('replyTo', itemIndex, '') as string,
					'Reply-To',
					{ single: true },
				);
				const subject = this.getNodeParameter('subject', itemIndex) as string;
				const emailFormat = this.getNodeParameter('emailFormat', itemIndex) as EmailFormat;

				assertSafeHeaderValue(senderName, 'Sender Name');
				assertSafeHeaderValue(subject, 'Subject');

				const text =
					emailFormat === 'text' || emailFormat === 'both'
						? (this.getNodeParameter('textBody', itemIndex) as string)
						: undefined;
				const html =
					emailFormat === 'html' || emailFormat === 'both'
						? (this.getNodeParameter('htmlBody', itemIndex) as string)
						: undefined;

				const attachmentsUi = this.getNodeParameter(
					'attachmentsUi',
					itemIndex,
					{},
				) as IDataObject;
				const attachments = await collectAttachments(this, itemIndex, attachmentsUi);

				const raw = await buildRawMessage({
					fromEmail: resolution.identity.sendAsEmail,
					senderName: senderName || undefined,
					to,
					cc: cc || undefined,
					bcc: bcc || undefined,
					replyTo: replyTo || undefined,
					subject,
					text,
					html,
					attachments,
				});

				const response = (await gmailApiRequest.call(
					this,
					'POST',
					SEND_MESSAGE_ENDPOINT,
					{ raw },
				)) as GmailMessageResponse;

				returnData.push({
					json: {
						...response,
						sendAs: resolution.identity.sendAsEmail,
					},
					pairedItem: { item: itemIndex },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: (error as Error).message,
						},
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
