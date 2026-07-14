import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Remote Exec — run a shell command on a remote execution service from n8n.
 *
 * POSTs `{ command, timeout }` to `{baseUrl}/exec` on a service you control (an
 * "exec sidecar": a small HTTP wrapper around a shell, typically bundled with
 * ffmpeg + fonts + whatever tooling a workflow needs). The service runs the
 * command and returns its exit code, stdout, stderr and wall-clock duration.
 *
 * The base URL and an optional shared secret come from a **Remote Exec API**
 * credential — never from the environment. n8n's community-node verification
 * forbids reading `process.env`, and putting the connection on a credential is
 * also what lets one n8n instance drive several exec services.
 */
export class RemoteExec implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Remote Exec',
		name: 'remoteExec',
		icon: 'file:remoteExec.svg',
		group: ['transform'],
		version: 1,
		description:
			'Execute a shell command on a remote execution service (e.g. an ffmpeg/tooling sidecar). Supports n8n templating in the command field.',
		defaults: { name: 'Remote Exec' },
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'remoteExecApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				placeholder:
					'ffmpeg -i /shared/in.png -vf "drawtext=text=\'{{ $json.title }}\'" /shared/out.webp',
				description:
					'Shell command to run on the remote exec service. If a /shared volume is mounted at the same path in both containers, paths line up.',
				required: true,
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Max execution time. The service may clamp this to its own ceiling.',
			},
			{
				displayName: 'Ignore Errors',
				name: 'ignoreErrors',
				type: 'boolean',
				default: false,
				description: 'Whether to continue the workflow even if the command exits non-zero',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Return Full Output',
						name: 'returnFullOutput',
						type: 'boolean',
						default: false,
						description:
							'Whether to return stdout and stderr in separate fields rather than a single output field',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const credentials = await this.getCredentials('remoteExecApi');
		const baseUrl = String(credentials.baseUrl ?? '')
			.trim()
			.replace(/\/$/, '');
		const token = String(credentials.token ?? '');

		if (!baseUrl) {
			throw new NodeOperationError(
				this.getNode(),
				'The Remote Exec API credential has no base URL set',
			);
		}

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const command = this.getNodeParameter('command', itemIndex, '') as string;
				const timeout = this.getNodeParameter('timeout', itemIndex, 300) as number;
				const ignoreErrors = this.getNodeParameter('ignoreErrors', itemIndex, false) as boolean;
				const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as {
					returnFullOutput?: boolean;
				};

				if (!command || command.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Command cannot be empty', { itemIndex });
				}

				const headers: Record<string, string> = { 'Content-Type': 'application/json' };
				if (token) {
					headers['X-EXEC-TOKEN'] = token;
				}

				let response: { exitCode: number; stdout: string; stderr: string; durationMs: number };
				try {
					response = (await this.helpers.httpRequest({
						method: 'POST',
						url: `${baseUrl}/exec`,
						headers,
						body: { command, timeout },
						json: true,
						timeout: (timeout + 30) * 1000,
					})) as typeof response;
				} catch (err) {
					const e = err as Error;
					throw new NodeOperationError(
						this.getNode(),
						`Failed to reach the remote exec service at ${baseUrl}: ${e.message}`,
						{ itemIndex },
					);
				}

				const { exitCode, stdout, stderr, durationMs } = response;

				if (exitCode !== 0 && !ignoreErrors) {
					throw new NodeOperationError(
						this.getNode(),
						`Command failed with exit code ${exitCode}: ${stderr || '(no stderr)'}`,
						{ itemIndex, description: `Command: ${command}` },
					);
				}

				const outputData: Record<string, unknown> = { command, exitCode, durationMs };
				if (additionalOptions.returnFullOutput) {
					outputData.stdout = stdout;
					outputData.stderr = stderr;
				} else {
					outputData.output = stdout;
					if (stderr) outputData.stderr = stderr;
				}

				returnData.push({
					json: { ...items[itemIndex].json, exec: outputData },
					pairedItem: itemIndex,
				});
			} catch (err) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (err as Error).message }, pairedItem: itemIndex });
					continue;
				}
				throw err;
			}
		}

		return [returnData];
	}
}
