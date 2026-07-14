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
	// The node calls this.helpers.httpRequestWithAuthentication.call(this, credName, opts):
	// the credential type is arg 0, the request options arg 1. Auth (the X-EXEC-TOKEN
	// header) is applied by n8n from the credential's IAuthenticateGeneric, NOT by the
	// node — so the node no longer builds that header, and the tests assert the
	// credential TYPE is passed rather than inspecting a hand-built header.
	const httpRequestWithAuthentication = opts.httpRequest ?? vi.fn(async () => ok());
	const ctx = {
		getInputData: () => items,
		getNodeParameter: vi.fn((name: string, _i: number, dflt: unknown) =>
			name in opts.params ? opts.params[name] : dflt,
		),
		getNode: () => ({ name: 'Remote Exec' }),
		continueOnFail: () => opts.continueOnFail ?? false,
		getCredentials: vi.fn(async () => {
			if (opts.credential instanceof Error) throw opts.credential;
			return opts.credential ?? { baseUrl: 'http://exec-sidecar:8080', token: 'sekret' };
		}),
		helpers: { httpRequestWithAuthentication },
	};
	return { ctx, httpRequest: httpRequestWithAuthentication };
}

/** The request options the node passed — arg 1 of httpRequestWithAuthentication. */
const reqOf = (spy: ReturnType<typeof vi.fn>, call = 0) => spy.mock.calls[call][1];
/** The credential type the node passed — arg 0. */
const credOf = (spy: ReturnType<typeof vi.fn>, call = 0) => spy.mock.calls[call][0];

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
		const call = reqOf(httpRequest);
		expect(credOf(httpRequest)).toBe('remoteExecApi'); // auth via the credential
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
			// auth is delegated to the credential type; the node passes it by name
			expect(credOf(httpRequest)).toBe('remoteExecApi');
			const call = reqOf(httpRequest);
			expect(call.url).toBe('http://from-cred:8080/exec');
			// nothing from the environment leaked through
			expect(call.url).not.toContain('env-should-be-ignored');
			expect(JSON.stringify(call)).not.toContain('env-token');
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
		expect(reqOf(httpRequest).url).toBe('http://exec-sidecar:8080/exec');
	});

	test('auth is delegated to the credential, so the node never hand-builds a token header', async () => {
		// The whole point of the httpRequestWithAuthentication switch: the node must
		// NOT put the token in a header itself (the scanner rule
		// no-http-request-with-manual-auth). n8n applies the credential's
		// IAuthenticateGeneric (X-EXEC-TOKEN = {{$credentials.token}}) for us.
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080', token: 'tok123' },
		});
		await run(ctx);
		expect(credOf(httpRequest)).toBe('remoteExecApi');
		const call = reqOf(httpRequest);
		// the node sets only Content-Type; the token header is the credential's job
		expect(call.headers).toEqual({ 'Content-Type': 'application/json' });
		expect(JSON.stringify(call)).not.toContain('tok123');
	});

	test('a credential with no token field at all still works (unauthenticated)', async () => {
		// The node never reads the token, so a missing one is a non-event: it just
		// calls through, and the credential (empty token) applies no meaningful header.
		const { ctx, httpRequest } = makeCtx({
			params: BASE_PARAMS,
			credential: { baseUrl: 'http://exec-sidecar:8080' },
		});
		const [out] = await run(ctx);
		expect(credOf(httpRequest)).toBe('remoteExecApi');
		expect(reqOf(httpRequest).headers).toEqual({ 'Content-Type': 'application/json' });
		expect(out[0].json.exec).toMatchObject({ exitCode: 0 });
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
