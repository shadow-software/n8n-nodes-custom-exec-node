<p align="center">
  <img src="https://raw.githubusercontent.com/shadow-software/n8n-nodes-custom-exec-node/main/.github/assets/banner.svg" alt="Remote Exec — community node for n8n, by Shadow Software" width="880">
</p>

<p align="center">
  <a href="https://www.npmjs.com/package/n8n-nodes-custom-exec"><img alt="npm" src="https://img.shields.io/npm/v/n8n-nodes-custom-exec?color=8fd468&labelColor=0d0d0d"></a>
  <a href="LICENSE.md"><img alt="license" src="https://img.shields.io/badge/license-MIT-8fd468?labelColor=0d0d0d"></a>
  <img alt="n8n community node" src="https://img.shields.io/badge/n8n-community%20node-8fd468?labelColor=0d0d0d">
  <img alt="runtime dependencies" src="https://img.shields.io/badge/runtime%20deps-0-8fd468?labelColor=0d0d0d">
</p>

# n8n-nodes-custom-exec

Run a command on a **remote execution service** from n8n, over HTTP.

Some jobs need a real shell and real tooling — `ffmpeg`, `imagemagick`, `pandoc`,
`yt-dlp`, a font stack — that the n8n image deliberately does not ship. The usual
answer is to stand up a small sidecar: an HTTP service that accepts a command,
runs it, and returns the result. This node is the n8n end of that arrangement. You
point it at your service with a credential, give it a command (n8n expressions and
all), and it hands back the exit code, output and duration.

The connection lives entirely on a **Remote Exec API** credential — base URL plus
an optional shared secret — so the node reads nothing from the environment. That is
both what n8n's node verification requires and what lets one n8n instance talk to
several exec services.

[Installation](#installation) · [Credentials](#credentials) · [Usage](#usage) · [Response](#response) · [Security](#security) · [Compatibility](#compatibility)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/),
then search for **`n8n-nodes-custom-exec`**.

Self-hosted, from the CLI:

```bash
npm install n8n-nodes-custom-exec
```

## Credentials

The node requires a **Remote Exec API** credential with two fields:

- **Base URL** — where your exec service lives, e.g. `http://exec-sidecar:8080`.
  Commands are POSTed to `{baseUrl}/exec`.
- **Token** *(optional)* — a shared secret. When set, it is sent as the
  `X-EXEC-TOKEN` header on every request; leave it empty if the service is
  unauthenticated.

The credential's **Test** button issues a `GET {baseUrl}/health`, so your service
should answer that path with a 200 for the test to pass. Testing never runs a
command.

The exec service itself is yours to run. It must accept
`POST {baseUrl}/exec` with a JSON body of `{ "command": "...", "timeout": 300 }`
and reply with JSON:

```jsonc
{ "exitCode": 0, "stdout": "…", "stderr": "…", "durationMs": 1234 }
```

## Usage

Set **Command** to whatever you want to run. n8n expressions are interpolated, so
you can build the command from earlier items:

```
ffmpeg -y -i /shared/{{ $json.inputFile }} \
  -vf "scale=1280:-1" /shared/{{ $json.outputFile }}
```

If both the exec service and n8n mount the same `/shared` volume at the same path,
files written by one are visible to the other, so a workflow can drop a file, run a
command against it, and pick the result back up.

- **Timeout (Seconds)** — the budget passed to the service. The node allows an
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

**This node runs arbitrary shell commands on whatever service the credential points
at.** Anyone who can edit the workflow can run any command that service allows,
with that service's privileges and filesystem access.

- Only point the credential at an exec service **you control**, on a network you
  trust — never a shared or public endpoint.
- Set a **Token** and have the service reject requests without a matching
  `X-EXEC-TOKEN`. Do not expose the service unauthenticated.
- Run the service with the least privilege it needs (a non-root user, a scoped
  volume, no host networking), and enforce your own timeout ceiling on its side —
  the client-supplied timeout is a request, not a guarantee.

Treat the exec service as a remote shell, because that is exactly what it is.

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

## Resources

- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)
- [Creating an HTTP exec sidecar](https://github.com/shadow-software/n8n-nodes-custom-exec-node)

## License

[MIT](LICENSE.md) © [Shadow Software](https://shadowsoftware.com)
