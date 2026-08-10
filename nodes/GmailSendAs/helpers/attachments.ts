import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import type { EmailAttachment } from '../types';

export async function collectAttachments(
	context: IExecuteFunctions,
	itemIndex: number,
	attachmentsUi: IDataObject,
): Promise<EmailAttachment[]> {
	const configuredAttachments = (attachmentsUi.attachmentsBinary ?? []) as IDataObject[];
	const propertyNames = new Set<string>();

	for (const attachment of configuredAttachments) {
		for (const propertyName of String(attachment.property ?? '').split(',')) {
			const normalizedPropertyName = propertyName.trim();
			if (normalizedPropertyName) propertyNames.add(normalizedPropertyName);
		}
	}

	const attachments: EmailAttachment[] = [];

	for (const propertyName of propertyNames) {
		const binaryData = context.helpers.assertBinaryData(itemIndex, propertyName);
		const content = await context.helpers.getBinaryDataBuffer(itemIndex, propertyName);

		if (!Buffer.isBuffer(content)) {
			throw new NodeOperationError(context.getNode(), 'Attachment could not be read', {
				description: `The binary property '${propertyName}' does not contain a readable file`,
				itemIndex,
			});
		}

		attachments.push({
			filename: binaryData.fileName || propertyName,
			content,
			contentType: binaryData.mimeType || 'application/octet-stream',
		});
	}

	return attachments;
}
