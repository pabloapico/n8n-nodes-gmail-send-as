import { configWithoutCloudSupport } from '@n8n/node-cli/eslint';

export default [
	...configWithoutCloudSupport,
	{
		rules: {
			'@n8n/community-nodes/no-credential-reuse': 'off',
			'@n8n/community-nodes/no-runtime-dependencies': 'off',
			'n8n-nodes-base/node-param-operation-option-action-miscased': 'off',
		},
	},
	{
		files: [
			'nodes/GmailSendAs/V1/GmailSendAsV1.node.ts',
			'nodes/GmailSendAs/V2/GmailSendAsV2.node.ts',
		],
		rules: {
			// These are internal implementations instantiated by the registered
			// VersionedNodeType wrapper. Their icon is inherited from the wrapper,
			// but the community-node icon rule only recognizes a literal icon in
			// each *.node.ts class description.
			'@n8n/community-nodes/icon-validation': 'off',
		},
	},
];
