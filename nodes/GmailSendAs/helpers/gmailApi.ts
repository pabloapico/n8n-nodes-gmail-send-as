import type {
	IDataObject,
	IExecuteFunctions,
	IHttpRequestMethods,
	IHttpRequestOptions,
	ILoadOptionsFunctions,
	JsonObject,
} from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

const GMAIL_API_BASE_URL = 'https://gmail.googleapis.com';

export async function gmailApiRequest<T extends IDataObject>(
	this: IExecuteFunctions | ILoadOptionsFunctions,
	method: IHttpRequestMethods,
	endpoint: string,
	body: IDataObject = {},
	query: IDataObject = {},
): Promise<T> {
	const options: IHttpRequestOptions = {
		headers: {
			Accept: 'application/json',
			'Content-Type': 'application/json',
		},
		method,
		url: `${GMAIL_API_BASE_URL}${endpoint}`,
		json: true,
	};

	if (Object.keys(body).length > 0) {
		options.body = body;
	}

	if (Object.keys(query).length > 0) {
		options.qs = query;
	}

	try {
		return (await this.helpers.httpRequestWithAuthentication.call(
			this,
			'gmailOAuth2',
			options,
		)) as T;
	} catch (error) {
		const apiError = error as { description?: string; message?: string };
		throw new NodeApiError(this.getNode(), error as JsonObject, {
			message: 'Gmail API request failed',
			description: apiError.description ?? apiError.message ?? 'The Gmail API returned an error.',
		});
	}
}
