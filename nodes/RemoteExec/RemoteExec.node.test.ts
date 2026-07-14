import { describe, test, expect, vi } from 'vitest';

// Mock n8n-workflow so the test needs no n8n install (same idiom as the sibling's
// HuggingFaceSpace.node.test.ts — a hand-rolled NodeOperationError that records the
// message and context).
vi.mock('n8n-workflow', () => {
	class NodeOperationError extends Error {
		context: unknown;
		constructor(_node: unknown, message: string, context?: unknown) {
			super(message);
			this.name = 'NodeOperationError';
			this.context = context;
		}
	}
	return { NodeOperationError };
});

import { RemoteExec } from './RemoteExec.node';

/** A successful sidecar reply: the shape the node destructures. */
function ok(overrides: Partial<{ exitCode: number; stdout: string; stderr: string; durationMs: number }> = {}) {
	return { exitCode: 0, stdout: 'hello\n', stderr: '', durationMs: 42, ...overrides };
}

function makeCtx(opts: {
	items?: Array<{ json: Record<string, unknown> }>;
	params: Record<string, unknown>;
	credential?: Record<string, unknown> | Error;
	httpRequest?: ReturnType<typeof vi.fn>;
	continueOnFail?: boolean;
}) {
	const items = opts.items ?? [{ json: {} }];
	const httpRequest = opts.httpRequest ?? vi.fn(async () => ok());
	const ctx = {
		getInputData: () => items,
		getNodeParameter: vi.fn((name: string, _i: number, dflt: unknown) =>
			name in opts.params ? opts.params[name] : dflt,
		),
		getNode: () => ({ name: 'Remote Exec' }),
		continueOnFail: () => opts.continueOnFail ?? false,
		getCredentials: vi.fn(async () => {
			if (opts.credential instanceof Error) throw opts.credential;
			// Default: a base URL and a token unless the test overrides.
			return opts.credential ?? { baseUrl: 'http://exec-sidecar:8080', token: 'sekret' };
		}),
		helpers: { httpRequest },
	};
	return { ctx, httpRequest };
}

const run = (ctx: unknown) => RemoteExec.prototype.execute.call(ctx as never);

describe('RemoteExec.description', () => {
	test('declares the node identity, icon and a required Remote Exec API credential', () => {
		const node = new RemoteExec();
		const d = node.description;
		expect(d.name).toBe('remoteExec');
		expect(d.displayName).toBe('Remote Exec');
		expect(d.icon).toBe('file:remoteExec.svg');
		expect(d.credentials).toEqual([{ name: 'remoteExecApi', required: true }]);
		// the exact parameter surface carried over from the internal node
		const params = d.properties.map((p) => p.name);
		expect(params).toEqual(['command', 'timeout', 'ignoreErrors', 'additionalOptions']);
	});
});

const BASE_PARAMS = {
	command: 'echo hello',
	timeout: 300,
	ignoreErrors: false,
	additionalOptions: {},
};

describe('RemoteExec.execute', () => {
	test('happy path: POSTs {command,timeout} to {baseUrl}/exec and returns exec.output on exit 0', async () => {
		const { ctx, httpRequest } = makeCtx({ params: BASE_PARAMS });
		const [out] = await run(ctx);

		expect(httpRequest).toHaveBeenCalledTimes(1);
		const call = httpRequest.mock.calls[0][0];
		expect(call.method).toBe('POST');
		expect(call.url).toBe('http://exec-sidecar:8080/exec');
		expect(call.body).toEqual({ command: 'echo hello', timeout: 300 });
		expect(call.json).toBe(true);
		// timeout budget = (timeout + 30) * 1000
		expect(call.timeout).toBe(330000);

		expect(out[0].json.exec).toEqual({
			command: 'echo hello',
			exitCode: 0,
			durationMs: 42,
			output: 'hello\n',
		});
	});

	test('reads baseUrl and token from the credential, not the environment', async () => {
		// Prove no env coupling: EXEC_SIDECAR_* set in the environment must be ignored.
		const OLD_URL = process.env.EXEC_SIDECAR_URL;
		const OLD_TOK = process.env.EXEC_SIDECAR_TOKEN;
		process.env.EXEC_SIDECAR_URL = 'http://env-should-be-ignored:9999';
		process.env.EXEC_SIDECAR_TOKEN = 'env-token-should-be-ignored';
		try {
			const { ctx, httpRequest } = makeCtx({
				params: BASE_PARAMS,
				credential: { baseUrl: 'http://from-cred:8080', token: 'cred-token' },
			});
			await run(ctx);

			expect(ctx.getCredentials).toHaveBeenCalledWith('remoteExecApi');
			const call = httpRequest.mock.calls[0][0];
			expect(call.url).toBe('http://from-cred:8080/exec');
			expect(call.headers['X-EXEC-TOKEN']).toBe('cred-token');
			// nothing from the environment leaked through
			expect(call.url).not.toContain('env-should-be-ignored');
			expect(call.headers['X-EXEC-TOKEN']).not.toContain('env-token');
		} finally {
			OLD_URL === undefined ? delete process.env.EXEC_SIDECAR_URL : (process.env.EXEC_SIDECAR_URL = OLD_URL);
			OLD_TOK === undefined ? delete process.env.EXEC_SIDECAR_TOKEN : (process.env.EXEC_SIDECAR_TOKEN = OLD_TOK);
		}
	});

	test('a trailing slash on the credential base URL is stripped', async () => {
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080/', token: '' },
		});
		await run(ctx);
		expect(httpRequest.mock.calls[0][0].url).toBe('http://exec-sidecar:8080/exec');
	});

	test('the X-EXEC-TOKEN header is present when a token is set', async () => {
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080', token: 'tok123' },
		});
		await run(ctx);
		expect(httpRequest.mock.calls[0][0].headers['X-EXEC-TOKEN']).toBe('tok123');
	});

	test('the X-EXEC-TOKEN header is absent when the token is empty', async () => {
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080', token: '' },
		});
		await run(ctx);
		const headers = httpRequest.mock.calls[0][0].headers;
		expect('X-EXEC-TOKEN' in headers).toBe(false);
	});

	test('a credential with no token field at all is treated as unauthenticated', async () => {
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080' },
		});
		await run(ctx);
		expect('X-EXEC-TOKEN' in httpRequest.mock.calls[0][0].headers).toBe(false);
	});

	test('a non-zero exit throws a NodeOperationError with the exit code and stderr', async () => {
		const httpRequest = vi.fn(async () => ok({ exitCode: 1, stderr: 'boom' }));
		const { ctx } = makeCtx({ params: BASE_PARAMS, httpRequest });
		const err = await run(ctx).catch((e) => e);
		expect(err.name).toBe('NodeOperationError');
		expect(err.message).toMatch(/exit code 1: boom/);
	});

	test('a non-zero exit with no stderr still reports "(no stderr)"', async () => {
		const httpRequest = vi.fn(async () => ok({ exitCode: 2, stderr: '' }));
		const { ctx } = makeCtx({ params: BASE_PARAMS, httpRequest });
		const err = await run(ctx).catch((e) => e);
		expect(err.message).toMatch(/exit code 2: \(no stderr\)/);
	});

	test('ignoreErrors=true lets a non-zero exit through as data', async () => {
		const httpRequest = vi.fn(async () => ok({ exitCode: 3, stdout: 'partial', stderr: 'warn' }));
		const { ctx } = makeCtx({
			params: { ...BASE_PARAMS, ignoreErrors: true },
			httpRequest,
		});
		const [out] = await run(ctx);
		expect(out[0].json.exec).toMatchObject({ exitCode: 3, output: 'partial', stderr: 'warn' });
	});

	test('a non-empty stderr is surfaced alongside output even on success', async () => {
		const httpRequest = vi.fn(async () => ok({ stdout: 'done', stderr: 'a warning' }));
		const { ctx } = makeCtx({ params: BASE_PARAMS, httpRequest });
		const [out] = await run(ctx);
		expect(out[0].json.exec).toMatchObject({ output: 'done', stderr: 'a warning' });
	});

	test('returnFullOutput splits stdout and stderr into separate fields', async () => {
		const httpRequest = vi.fn(async () => ok({ stdout: 'OUT', stderr: 'ERR' }));
		const { ctx } = makeCtx({
			params: { ...BASE_PARAMS, additionalOptions: { returnFullOutput: true } },
			httpRequest,
		});
		const [out] = await run(ctx);
		expect(out[0].json.exec).toEqual({
			command: 'echo hello',
			exitCode: 0,
			durationMs: 42,
			stdout: 'OUT',
			stderr: 'ERR',
		});
		// no single `output` field in full-output mode
		expect((out[0].json.exec as Record<string, unknown>).output).toBeUndefined();
	});

	test('an empty command throws before any request is made', async () => {
		const { ctx, httpRequest } = makeCtx({ params: { ...BASE_PARAMS, command: '   ' } });
		const err = await run(ctx).catch((e) => e);
		expect(err.name).toBe('NodeOperationError');
		expect(err.message).toMatch(/Command cannot be empty/);
		expect(httpRequest).not.toHaveBeenCalled();
	});

	test('an unreachable service throws a NodeOperationError naming the base URL', async () => {
		const httpRequest = vi.fn(async () => {
			throw new Error('connect ECONNREFUSED 10.0.0.1:8080');
		});
		const { ctx } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080', token: '' },
			httpRequest,
		});
		const err = await run(ctx).catch((e) => e);
		expect(err.name).toBe('NodeOperationError');
		expect(err.message).toMatch(/Failed to reach the remote exec service at http:\/\/exec-sidecar:8080/);
		expect(err.message).toMatch(/ECONNREFUSED/);
	});

	test('a credential with a blank base URL fails loudly before running anything', async () => {
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: '   ', token: '' },
		});
		const err = await run(ctx).catch((e) => e);
		expect(err.name).toBe('NodeOperationError');
		expect(err.message).toMatch(/no base URL set/);
		expect(httpRequest).not.toHaveBeenCalled();
	});

	test('continueOnFail captures the error as an item instead of throwing', async () => {
		const httpRequest = vi.fn(async () => ok({ exitCode: 1, stderr: 'nope' }));
		const { ctx } = makeCtx({
			params: BASE_PARAMS,
			httpRequest,
			continueOnFail: true,
		});
		const [out] = await run(ctx);
		expect(out[0].json.error).toMatch(/exit code 1: nope/);
	});

	test('input json is preserved alongside the exec result', async () => {
		const { ctx } = makeCtx({ items: [{ json: { postId: 9 } }], params: BASE_PARAMS });
		const [out] = await run(ctx);
		expect(out[0].json).toMatchObject({ postId: 9 });
		expect(out[0].json.exec).toBeDefined();
	});

	test('processes multiple items independently', async () => {
		const { ctx, httpRequest } = makeCtx({
			items: [{ json: { n: 1 } }, { json: { n: 2 } }],
			params: BASE_PARAMS,
		});
		const [out] = await run(ctx);
		expect(out).toHaveLength(2);
		expect(out[0].json.n).toBe(1);
		expect(out[1].json.n).toBe(2);
		expect(httpRequest).toHaveBeenCalledTimes(2);
	});

	test('with continueOnFail, one bad item does not stop the others', async () => {
		let call = 0;
		const httpRequest = vi.fn(async () => {
			call += 1;
			return call === 1 ? ok({ exitCode: 5, stderr: 'first failed' }) : ok({ stdout: 'ok' });
		});
		const { ctx } = makeCtx({
			items: [{ json: { n: 1 } }, { json: { n: 2 } }],
			params: BASE_PARAMS,
			httpRequest,
			continueOnFail: true,
		});
		const [out] = await run(ctx);
		expect(out).toHaveLength(2);
		expect(out[0].json.error).toMatch(/first failed/);
		expect(out[1].json.exec).toMatchObject({ output: 'ok' });
	});
});
