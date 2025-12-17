import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';
import { exec } from 'child_process';
import { promisify } from 'util';

const execPromise = promisify(exec);

export class CustomExecNode implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Custom Exec',
		name: 'customExecNode',
		icon: 'fa:terminal',
		group: ['transform'],
		version: 1,
		description: 'Execute bash commands inside the n8n container with templating support',
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
				typeOptions: {
					rows: 4,
				},
				default: '',
				placeholder: 'echo "Processing {{ $json.slug }}"',
				description: 'The bash command to execute. Use {{ $json.field }} for templating.',
				required: true,
			},
			{
				displayName: 'Working Directory',
				name: 'cwd',
				type: 'string',
				default: '/home/node',
				description: 'Working directory for command execution',
			},
			{
				displayName: 'Timeout (ms)',
				name: 'timeout',
				type: 'number',
				default: 60000,
				description: 'Maximum execution time in milliseconds',
			},
			{
				displayName: 'Ignore Errors',
				name: 'ignoreErrors',
				type: 'boolean',
				default: false,
				description: 'Whether to continue execution even if the command fails',
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Environment Variables',
						name: 'env',
						type: 'fixedCollection',
						typeOptions: {
							multipleValues: true,
						},
						default: {},
						options: [
							{
								name: 'values',
								displayName: 'Values',
								values: [
									{
										displayName: 'Name',
										name: 'name',
										type: 'string',
										default: '',
										description: 'Environment variable name',
									},
									{
										displayName: 'Value',
										name: 'value',
										type: 'string',
										default: '',
										description: 'Environment variable value',
									},
								],
							},
						],
					},
					{
						displayName: 'Return Full Output',
						name: 'returnFullOutput',
						type: 'boolean',
						default: false,
						description: 'Whether to return both stdout and stderr in separate fields',
					},
				],
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
			try {
				// Get parameters
				const commandTemplate = this.getNodeParameter('command', itemIndex, '') as string;
				const cwd = this.getNodeParameter('cwd', itemIndex, '/home/node') as string;
				const timeout = this.getNodeParameter('timeout', itemIndex, 60000) as number;
				const ignoreErrors = this.getNodeParameter('ignoreErrors', itemIndex, false) as boolean;
				const additionalOptions = this.getNodeParameter('additionalOptions', itemIndex, {}) as any;

				// Replace n8n expressions in command
				// This supports {{ $json.field }}, {{ $node.name.json.field }}, etc.
				let command = commandTemplate;

				// Simple expression replacement for $json fields
				const jsonData = items[itemIndex].json;
				command = command.replace(/\{\{\s*\$json\.(\w+)\s*\}\}/g, (match, field) => {
					return jsonData[field] !== undefined ? String(jsonData[field]) : '';
				});

				// Also support direct field references like $json.slug
				command = command.replace(/\$json\.(\w+)/g, (match, field) => {
					return jsonData[field] !== undefined ? String(jsonData[field]) : '';
				});

				if (!command || command.trim() === '') {
					throw new NodeOperationError(this.getNode(), 'Command cannot be empty', {
						itemIndex,
					});
				}

				// Prepare environment variables
				const env = { ...process.env };
				if (additionalOptions.env?.values) {
					for (const envVar of additionalOptions.env.values) {
						if (envVar.name) {
							env[envVar.name] = envVar.value || '';
						}
					}
				}

				// Execute command
				const execOptions = {
					cwd,
					timeout,
					env,
					maxBuffer: 10 * 1024 * 1024, // 10MB buffer
				};

				let stdout = '';
				let stderr = '';
				let exitCode = 0;

				try {
					const result = await execPromise(command, execOptions);
					stdout = result.stdout;
					stderr = result.stderr;
				} catch (err) {
					const error = err as any;
					stdout = error.stdout || '';
					stderr = error.stderr || '';
					exitCode = error.code || 1;

					if (!ignoreErrors) {
						throw new NodeOperationError(
							this.getNode(),
							`Command failed with exit code ${exitCode}: ${stderr || error.message}`,
							{
								itemIndex,
								description: `Command: ${command}`,
							}
						);
					}
				}

				// Build output
				const outputData: any = {
					command,
					exitCode,
				};

				if (additionalOptions.returnFullOutput) {
					outputData.stdout = stdout;
					outputData.stderr = stderr;
				} else {
					outputData.output = stdout;
					if (stderr) {
						outputData.stderr = stderr;
					}
				}

				// Include original input data
				returnData.push({
					json: {
						...jsonData,
						exec: outputData,
					},
					pairedItem: itemIndex,
				});

			} catch (err) {
				if (this.continueOnFail()) {
					const error = err as Error;
					returnData.push({
						json: {
							error: error.message,
						},
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
