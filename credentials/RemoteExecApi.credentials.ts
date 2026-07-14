import {
	IAuthenticateGeneric,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

/**
 * Remote execution service connection.
 *
 * Holds the base URL of the exec service (an HTTP endpoint that runs a shell
 * command and returns its exit code + output) and an optional shared secret. The
 * secret, when set, is sent as the `X-EXEC-TOKEN` header on every request so the
 * service can reject callers that do not hold it.
 *
 * The URL and token live on the credential — never in `process.env` — so the node
 * carries no environment coupling and passes n8n's verification, which forbids
 * reading the environment.
 */
export class RemoteExecApi implements ICredentialType {
	name = 'remoteExecApi';

	displayName = 'Remote Exec API';

	icon = 'file:remoteExecApi.svg' as const;

	documentationUrl = 'https://github.com/shadow-software/n8n-nodes-custom-exec-node';

	properties: INodeProperties[] = [
		{
			displayName: 'Base URL',
			name: 'baseUrl',
			type: 'string',
			default: 'http://exec-sidecar:8080',
			required: true,
			placeholder: 'http://exec-sidecar:8080',
			description:
				'The base URL of the remote exec service, e.g. http://exec-sidecar:8080. Commands are POSTed to {baseUrl}/exec.',
		},
		{
			displayName: 'Token',
			name: 'token',
			type: 'string',
			typeOptions: { password: true },
			default: '',
			description:
				'Shared secret sent as the X-EXEC-TOKEN header. Leave empty if the service is unauthenticated.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'X-EXEC-TOKEN': '={{$credentials.token}}',
			},
		},
	};

	// "Test" button target: a GET against {baseUrl}/health. The exec sidecar exposes
	// a /health probe that returns 200 without running anything, so testing the
	// credential never executes a command.
	test: ICredentialTestRequest = {
		request: {
			baseURL: '={{$credentials.baseUrl.replace(/\\/$/, "")}}',
			url: '/health',
		},
	};
}
