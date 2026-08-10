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
];
