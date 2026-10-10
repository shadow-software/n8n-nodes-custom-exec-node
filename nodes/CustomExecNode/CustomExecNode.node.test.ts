import { describe, test, expect, vi, beforeEach } from 'vitest';

// Mock n8n-workflow so the test needs no n8n install. NodeOperationError just
// needs to be a throwable Error subclass that records its message.
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

import { CustomExecNode } from './CustomExecNode.node';

type ExecResponse = { exitCode: number; stdout: string; stderr: string; durationMs: number };

/**
 * Build a fake IExecuteFunctions `this` for the node. Lets each test control
 * input items, per-item parameters, the sidecar httpRequest result, and the
 * continueOnFail flag.
 */
function makeCtx(opts: {
  items: Array<{ json: Record<string, unknown> }>;
  params: Record<string, unknown> | ((name: string, i: number, dflt: unknown) => unknown);
  httpRequest: ReturnType<typeof vi.fn>;
  continueOnFail?: boolean;
}) {
  const getNodeParameter = vi.fn((name: string, i: number, dflt: unknown) => {
    if (typeof opts.params === 'function') return opts.params(name, i, dflt);
    return name in opts.params ? opts.params[name] : dflt;
  });
  return {
    getInputData: () => opts.items,
    getNodeParameter,
    getNode: () => ({ name: 'Custom Exec' }),
    continueOnFail: () => opts.continueOnFail ?? false,
    helpers: { httpRequest: opts.httpRequest },
    _getNodeParameter: getNodeParameter,
  } as unknown as Parameters<typeof CustomExecNode.prototype.execute>[0] extends never
    ? never
    : ThisParameterType<typeof CustomExecNode.prototype.execute>;
}

const okResponse: ExecResponse = { exitCode: 0, stdout: 'hello\n', stderr: '', durationMs: 12 };

function run(ctx: unknown) {
  // execute() reads `this`; call it with our fake context bound.
  return CustomExecNode.prototype.execute.call(ctx as never);
}

describe('CustomExecNode.execute', () => {
  beforeEach(() => {
    delete process.env.EXEC_SIDECAR_URL;
    delete process.env.EXEC_SIDECAR_TOKEN;
  });

  test('success: maps stdout to output and merges with input json', async () => {
    const httpRequest = vi.fn().mockResolvedValue(okResponse);
    const ctx = makeCtx({
      items: [{ json: { id: 7 } }],
      params: { command: 'echo hello', timeout: 300, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    const [out] = await run(ctx);
    expect(out).toHaveLength(1);
    expect(out[0].json).toMatchObject({ id: 7, exec: { command: 'echo hello', exitCode: 0, output: 'hello\n' } });
    // default sidecar URL + JSON body shape
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        method: 'POST',
        url: 'http://exec-sidecar:8080/exec',
        body: { command: 'echo hello', timeout: 300 },
      }),
    );
  });

  test('returnFullOutput exposes stdout + stderr instead of output', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ ...okResponse, stderr: 'warn' });
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'x', timeout: 10, ignoreErrors: false, additionalOptions: { returnFullOutput: true } },
      httpRequest,
    });
    const [out] = await run(ctx);
    expect(out[0].json.exec).toMatchObject({ stdout: 'hello\n', stderr: 'warn' });
    expect((out[0].json.exec as Record<string, unknown>).output).toBeUndefined();
  });

  test('non-fullOutput includes stderr only when present', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ ...okResponse, stderr: '' });
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'x', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    const [out] = await run(ctx);
    expect((out[0].json.exec as Record<string, unknown>).stderr).toBeUndefined();
  });

  test('empty command throws "Command cannot be empty"', async () => {
    const httpRequest = vi.fn();
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: '   ', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await expect(run(ctx)).rejects.toThrow('Command cannot be empty');
    expect(httpRequest).not.toHaveBeenCalled();
  });

  test('non-zero exit code throws when ignoreErrors is false', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ exitCode: 2, stdout: '', stderr: 'boom', durationMs: 5 });
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'false', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await expect(run(ctx)).rejects.toThrow('Command failed with exit code 2: boom');
  });

  test('non-zero exit with empty stderr uses the "(no stderr)" fallback', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ exitCode: 3, stdout: '', stderr: '', durationMs: 5 });
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'false', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await expect(run(ctx)).rejects.toThrow('Command failed with exit code 3: (no stderr)');
  });

  test('non-zero exit code is tolerated when ignoreErrors is true', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ exitCode: 2, stdout: 'partial', stderr: 'boom', durationMs: 5 });
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'false', timeout: 10, ignoreErrors: true, additionalOptions: {} },
      httpRequest,
    });
    const [out] = await run(ctx);
    expect(out[0].json.exec).toMatchObject({ exitCode: 2, output: 'partial' });
  });

  test('sidecar unreachable throws a wrapped error', async () => {
    const httpRequest = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'x', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await expect(run(ctx)).rejects.toThrow(/Failed to reach exec sidecar at http:\/\/exec-sidecar:8080: ECONNREFUSED/);
  });

  test('a sidecar HTTP error status is distinguished from "unreachable" — it responded', async () => {
    // The sidecar WAS reached and responded with a 500; that needs a different
    // fix than a network failure (DNS/refused/timeout), so the message must not
    // call it "unreachable" when it demonstrably wasn't.
    const err = Object.assign(new Error('Internal Server Error'), { statusCode: 500 });
    const httpRequest = vi.fn().mockRejectedValue(err);
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'x', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await expect(run(ctx)).rejects.toThrow(
      /Exec sidecar at http:\/\/exec-sidecar:8080 returned HTTP 500: Internal Server Error/,
    );
  });

  test('continueOnFail captures the error as an item instead of throwing', async () => {
    const httpRequest = vi.fn().mockResolvedValue({ exitCode: 1, stdout: '', stderr: 'nope', durationMs: 1 });
    const ctx = makeCtx({
      items: [{ json: { a: 1 } }],
      params: { command: 'false', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
      continueOnFail: true,
    });
    const [out] = await run(ctx);
    expect(out).toHaveLength(1);
    expect(out[0].json).toMatchObject({ error: 'Command failed with exit code 1: nope' });
  });

  test('respects EXEC_SIDECAR_URL and sends X-EXEC-TOKEN header when set', async () => {
    process.env.EXEC_SIDECAR_URL = 'http://my-sidecar:9000/';
    process.env.EXEC_SIDECAR_TOKEN = 'sekret';
    const httpRequest = vi.fn().mockResolvedValue(okResponse);
    const ctx = makeCtx({
      items: [{ json: {} }],
      params: { command: 'x', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    await run(ctx);
    expect(httpRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://my-sidecar:9000/exec', // trailing slash trimmed
        headers: { 'Content-Type': 'application/json', 'X-EXEC-TOKEN': 'sekret' },
      }),
    );
  });

  test('processes multiple input items independently', async () => {
    const httpRequest = vi
      .fn()
      .mockResolvedValueOnce({ ...okResponse, stdout: 'one' })
      .mockResolvedValueOnce({ ...okResponse, stdout: 'two' });
    const ctx = makeCtx({
      items: [{ json: { n: 1 } }, { json: { n: 2 } }],
      params: { command: 'echo', timeout: 10, ignoreErrors: false, additionalOptions: {} },
      httpRequest,
    });
    const [out] = await run(ctx);
    expect(out).toHaveLength(2);
    expect((out[0].json.exec as Record<string, unknown>).output).toBe('one');
    expect((out[1].json.exec as Record<string, unknown>).output).toBe('two');
  });
});
