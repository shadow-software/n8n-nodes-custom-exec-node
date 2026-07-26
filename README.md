<p align="center">
  <img src="https://raw.githubusercontent.com/shadow-software/n8n-nodes-custom-exec-node/main/.github/assets/banner.svg" alt="Custom Exec — community node for n8n, by Shadow Software" width="880">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/n8n-nodes-custom-exec"><img alt="npm" src="https://img.shields.io/npm/v/n8n-nodes-custom-exec?color=8fd468&labelColor=0d0d0d"></a>
  <a href="LICENSE.md"><img alt="license" src="https://img.shields.io/badge/license-MIT-8fd468?labelColor=0d0d0d"></a>
  <img alt="n8n community node" src="https://img.shields.io/badge/n8n-community%20node-8fd468?labelColor=0d0d0d">
  <img alt="runtime dependencies" src="https://img.shields.io/badge/runtime%20deps-0-8fd468?labelColor=0d0d0d">
</p>

# n8n-nodes-custom-exec

Run a shell command in an **exec sidecar** from n8n, over HTTP.

Some jobs need a real shell and real tooling — `ffmpeg`, `imagemagick`, `pandoc`,
`yt-dlp`, a font stack — that a hardened n8n image deliberately does not ship. The
usual answer is to stand up a small sidecar: an HTTP service that accepts a command,
runs it, and returns the result. This node is the n8n end of that arrangement. Give
it a command (n8n expressions and all) and it hands back the exit code, output and
duration.

The sidecar's URL and an optional shared secret are read from environment variables
on the n8n container — `EXEC_SIDECAR_URL` and `EXEC_SIDECAR_TOKEN` — not from a
credential, so there's nothing to configure per-workflow beyond the command itself.

> Built and maintained by **[Shadow Software](https://shadowsoftware.com)** — we run
> n8n in production across a family of products and open-source the nodes we rely on.
> See our other node, **[n8n-nodes-huggingface-space](https://www.npmjs.com/package/n8n-nodes-huggingface-space)**,
> for running AI models from any Hugging Face Space.

[Installation](#installation) · [Configuration](#configuration) · [The exec sidecar](#the-exec-sidecar) · [Usage](#usage) · [Response](#response) · [Security](#security) · [Compatibility](#compatibility)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/),
then search for **`n8n-nodes-custom-exec`**.

Self-hosted, from the CLI:

```bash
npm install n8n-nodes-custom-exec
```

## Configuration

Set these environment variables on the **n8n container** (not per-workflow):

- **`EXEC_SIDECAR_URL`** — where your exec sidecar lives, e.g.
  `http://exec-sidecar:8080`. Defaults to that value if unset. Commands are
  POSTed to `{EXEC_SIDECAR_URL}/exec`.
- **`EXEC_SIDECAR_TOKEN`** *(optional)* — a shared secret. When set, it is sent
  as the `X-EXEC-TOKEN` header on every request; leave it unset if the sidecar
  is unauthenticated.

## The exec sidecar

The sidecar is yours to run — the node is only the n8n client. Any HTTP server
works as long as it honours this tiny contract:

| Route | Purpose |
| --- | --- |
| `POST /exec` | body `{ "command": string, "timeout": number }` → `{ "exitCode": number, "stdout": string, "stderr": string, "durationMs": number }` |

A minimal reference implementation is a few dozen lines. For example, in Node:

```js
import express from 'express';
import { exec } from 'node:child_process';

const app = express();
app.use(express.json());
const TOKEN = process.env.EXEC_TOKEN; // set the same value as EXEC_SIDECAR_TOKEN

app.post('/exec', (req, res) => {
  if (TOKEN && req.get('X-EXEC-TOKEN') !== TOKEN) return res.sendStatus(401);
  const { command, timeout = 300 } = req.body ?? {};
  const started = Date.now();
  exec(command, { timeout: Math.min(timeout, 1800) * 1000, maxBuffer: 64 << 20 },
    (err, stdout, stderr) => res.json({
      exitCode: err?.code ?? 0,
      stdout, stderr,
      durationMs: Date.now() - started,
    }));
});

app.listen(8080);
```

Run it in a container that has the tooling you need (`ffmpeg`, fonts, `imagemagick`,
…) alongside n8n, mount a shared volume into both, and point `EXEC_SIDECAR_URL` at
it. Read the **[Security](#security)** section before you expose it anywhere.

## Usage

Set **Command** to whatever you want to run. n8n expressions are interpolated, so
you can build the command from earlier items:

```
ffmpeg -y -i /shared/{{ $json.inputFile }} \
  -vf "scale=1280:-1" /shared/{{ $json.outputFile }}
```

If both the sidecar and n8n mount the same `/shared` volume at the same path,
files written by one are visible to the other, so a workflow can drop a file, run a
command against it, and pick the result back up.

- **Timeout (seconds)** — the budget passed to the sidecar. The node allows an
  extra 30 seconds on the HTTP call itself so a job that runs right up to its
  deadline still returns its result rather than being cut off in transit.
- **Ignore Errors** — when on, a non-zero exit is returned as data instead of
  failing the node.
- **Additional Options → Return Full Output** — return `stdout` and `stderr` as
  separate fields rather than a single `output` field.

## Response

Each item gains an `exec` object:

```jsonc
{
  "exec": {
    "command": "ffmpeg -i /shared/in.png … /shared/out.webp",
    "exitCode": 0,
    "durationMs": 1834,
    "output": "…stdout…",     // single-field mode (default)
    "stderr": "…"             // present only when the command wrote to stderr
  }
}
```

With **Return Full Output** on, `output` is replaced by separate `stdout` and
`stderr` fields. The item's existing JSON is preserved alongside `exec`.

## Security

**This node runs arbitrary shell commands on whatever sidecar `EXEC_SIDECAR_URL`
points at.** Anyone who can edit the workflow can run any command that sidecar
allows, with that sidecar's privileges and filesystem access.

- Only point `EXEC_SIDECAR_URL` at a sidecar **you control**, on a network you
  trust — never a shared or public endpoint.
- Set `EXEC_SIDECAR_TOKEN` and have the sidecar reject requests without a
  matching `X-EXEC-TOKEN`. Do not expose the sidecar unauthenticated.
- Run the sidecar with the least privilege it needs (a non-root user, a scoped
  volume, no host networking), and enforce your own timeout ceiling on its side —
  the client-supplied timeout is a request, not a guarantee.

Treat the exec sidecar as a remote shell, because that is exactly what it is.

## Compatibility

- **n8n** 1.60.0 or later
- **Node.js** 20.15 or later

Tested against n8n 1.x.

### Dependencies

The node has **zero runtime dependencies** — nothing is shipped but the compiled
node itself, so a plain `npm audit --omit=dev` reports no vulnerabilities.

A plain `npm audit` does report advisories. Every one of them comes from
`n8n-workflow`, which is a **peer** dependency: n8n supplies it at runtime from its
own tree, so those advisories are resolved by upgrading n8n, not this package.

## Links

- **npm** — [n8n-nodes-custom-exec](https://www.npmjs.com/package/n8n-nodes-custom-exec)
- **Source** — [github.com/shadow-software/n8n-nodes-custom-exec-node](https://github.com/shadow-software/n8n-nodes-custom-exec-node)
- **n8n community nodes** — [installation & docs](https://docs.n8n.io/integrations/community-nodes/)
- **Also by us** — [n8n-nodes-huggingface-space](https://www.npmjs.com/package/n8n-nodes-huggingface-space): run image, video, music, speech, text and moderation models from any Hugging Face Space.

We also build and open-source a family of WordPress plugins and themes for
WooCommerce stores: [Broadside](https://github.com/shadow-software/broadside-theme-for-woocommerce)
(theme) and [Broadside Blocks](https://github.com/shadow-software/broadside-blocks-for-woocommerce),
[Crypto for WooCommerce](https://github.com/shadow-software/crypto-for-woocommerce), and
[AGT for WooCommerce](https://github.com/shadow-software/agt-for-woocommerce).

## About

Made by **[Shadow Software](https://shadowsoftware.com)** — we build and run
automation-heavy SaaS products and open-source the n8n nodes we depend on. If you
need custom n8n nodes, workflow automation, or a platform built around it, get in
touch at **[shadowsoftware.com](https://shadowsoftware.com)**.

## License

[MIT](LICENSE.md) © [Shadow Software](https://shadowsoftware.com)
