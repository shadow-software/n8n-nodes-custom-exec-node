import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

/**
 * Custom Exec — runs a shell command inside the exec sidecar container.
 *
 * The n8n image is hardened (Docker Hardened Alpine) and intentionally lacks
 * package managers, shells with extra tooling, ffmpeg, etc.  This node POSTs
 * the user's command to the exec sidecar (sidecar/exec/), which has ffmpeg
 * and fonts installed and a /shared volume mounted at the same path in both
 * containers.
 *
 * Configuration via env on the n8n container:
 *   EXEC_SIDECAR_URL    default http://exec-sidecar:8080
 *   EXEC_SIDECAR_TOKEN  optional shared-secret; sent as X-EXEC-TOKEN
 */
export class CustomExecNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom Exec',
		name: 'customExecNode',
		icon: 'file:customExecNode.svg',
		group: ['transform'],
		version: 1,
		description:
			'Execute a shell command in the exec sidecar (ffmpeg + fonts). Supports n8n templating in the command field.',
		defaults: {
			name: 'Custom Exec',
		},
		inputs: ['main'],
		outputs: ['main'],
		properties: [
			{
				displayName: 'Command',
				name: 'command',
				type: 'string',
				typeOptions: { rows: 6 },
				default: '',
				placeholder: 'ffmpeg -i /shared/in.png -vf "drawtext=text=\'{{ $json.title }}\'" /shared/out.webp',
				description:
					'Shell command to run in the exec sidecar. The /shared volume is mounted at the same path in both containers, so paths line up.',
				required: true,
			},
			{
				displayName: 'Timeout (Seconds)',
				name: 'timeout',
				type: 'number',
				default: 300,
				description: 'Max execution time. The sidecar clamps this to 1800s.',
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

		const sidecarUrl = (process.env.EXEC_SIDECAR_URL || 'http://exec-sidecar:8080').replace(/\/$/, '');
		const sidecarToken = process.env.EXEC_SIDECAR_TOKEN || '';

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				const command = this.getNodeParameter('command', itemIndex, '') as string;
				const timeout = this.getNodeParameter('timeout', itemIndex, 300) as number;
				const ignoreErrors = this.getNodeParameter('ignoreErrors', itemIndex, false) as boolean;
				const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as {
					returnFullOutput?: boolean;
				};

				if (!command || command.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Command cannot be empty', {
						itemIndex,
					});
				}

				const headers: Record<string, string> = {
					'Content-Type': 'application/json',
				};
				if (sidecarToken) {
					headers['X-EXEC-TOKEN'] = sidecarToken;
				}

				let response: { exitCode: number; stdout: string; stderr: string; durationMs: number };
				try {
					response = (await this.helpers.httpRequest({
						method: 'POST',
						url: `${sidecarUrl}/exec`,
						headers,
						body: { command, timeout },
						json: true,
						// httpRequest has its own internal timeout; give it some slack over the sidecar's
						timeout: (timeout + 30) * 1000,
					})) as typeof response;
				} catch (err) {
					const e = err as Error & { statusCode?: number; httpCode?: string | number };
					const status = e.statusCode ?? e.httpCode;
					// A non-2xx status means the sidecar WAS reached and responded — that
					// is a different failure than "could not reach it at all" (DNS/refused/
					// timeout) and needs a different fix, so don't call it unreachable.
					const prefix = status
						? `Exec sidecar at ${sidecarUrl} returned HTTP ${status}`
						: `Failed to reach exec sidecar at ${sidecarUrl}`;
					throw new NodeOperationError(this.getNode(), `${prefix}: ${e.message}`, { itemIndex });
				}

				const { exitCode, stdout, stderr, durationMs } = response;

				if (exitCode !== 0 && !ignoreErrors) {
					throw new NodeOperationError(
						this.getNode(),
						`Command failed with exit code ${exitCode}: ${stderr || '(no stderr)'}`,
						{ itemIndex, description: `Command: ${command}` },
					);
				}

				const outputData: Record<string, unknown> = {
					command,
					exitCode,
					durationMs,
				};
				if (additionalOptions.returnFullOutput) {
					outputData.stdout = stdout;
					outputData.stderr = stderr;
				} else {
					outputData.output = stdout;
					if (stderr) outputData.stderr = stderr;
				}

				returnData.push({
					json: {
						...items[itemIndex].json,
						exec: outputData,
					},
					pairedItem: itemIndex,
				});
			} catch (err) {
				if (this.continueOnFail()) {
					returnData.push({
						json: { error: (err as Error).message },
						pairedItem: itemIndex,
					});
					continue;
				}
				throw err;
			}
		}

		return [returnData];
	}
}
