import type { INodeTypeBaseDescription, IVersionedNodeType } from 'n8n-workflow';
import { VersionedNodeType } from 'n8n-workflow';

import { GmailSendAsV1 } from './V1/GmailSendAsV1.node';
import { GmailSendAsV2 } from './V2/GmailSendAsV2.node';

export class GmailSendAs extends VersionedNodeType {
	constructor() {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Gmail Send As',
			name: 'gmailSendAs',
			icon: { light: 'file:gmailSendAs.svg', dark: 'file:gmailSendAs.dark.svg' },
			group: ['output'],
			description: 'Send and reply to Gmail messages from a configured Gmail Send As identity',
			defaultVersion: 2,
		};

		const nodeVersions: IVersionedNodeType['nodeVersions'] = {
			1: new GmailSendAsV1(baseDescription),
			2: new GmailSendAsV2(baseDescription),
		};

		super(nodeVersions, baseDescription);
	}
}
