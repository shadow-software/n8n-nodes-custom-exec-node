/**
 * n8n community-node lint config.
 *
 * We deliberately run the STRICT `plugin:n8n-nodes-base/nodes` ruleset on the node
 * and credential sources, not the lenient `.../community` preset. The stricter set
 * is what n8n's own reviewers apply, so linting against anything weaker just defers
 * the findings to the review — which is the one place we do not want surprises.
 */
module.exports = {
	root: true,

	env: {
		browser: true,
		es6: true,
		node: true,
	},

	parser: '@typescript-eslint/parser',

	parserOptions: {
		project: ['./tsconfig.eslint.json'],
		sourceType: 'module',
		extraFileExtensions: ['.json'],
	},

	ignorePatterns: ['.eslintrc.js', '**/*.js', '**/node_modules/**', '**/dist/**'],

	overrides: [
		{
			files: ['package.json'],
			// package.json is JSON, not TypeScript — the typed parser must not try to
			// resolve it against a tsconfig, or every run fails on a parsing error.
			parser: 'jsonc-eslint-parser',
			parserOptions: { project: null },
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/community'],
			rules: {
				// The package is published from a monorepo directory, so the repo's own
				// name and the package name differ by design.
				'n8n-nodes-base/community-package-json-name-still-default': 'off',
			},
		},
		{
			files: ['./credentials/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/credentials'],
			rules: {
				// This rule wants `documentationUrl` camelCased into a docs-site SLUG. Its
				// own description says "Only applicable to nodes in the main repository" —
				// n8n's internal credentials link into docs.n8n.io by slug. A COMMUNITY
				// credential has no such slug, and the sibling rule
				// `cred-class-field-documentation-url-not-http-url` demands a real HTTP URL,
				// so the two directly contradict each other here. We ship the working link.
				'n8n-nodes-base/cred-class-field-documentation-url-miscased': 'off',
			},
		},
		{
			files: ['./nodes/**/*.ts'],
			plugins: ['eslint-plugin-n8n-nodes-base'],
			extends: ['plugin:n8n-nodes-base/nodes'],
		},
		{
			// Tests are not shipped and are not n8n nodes: they are full of fixture
			// objects that LOOK like node parameters. The node-shaped rules (title-case
			// display names, 'ID' casing, error classes) would fire on those fixtures and
			// force us to mangle test data to satisfy a rule that does not apply to it.
			// Lint them for correctness, not for node conventions.
			files: ['./nodes/**/*.test.ts'],
			extends: ['plugin:@typescript-eslint/recommended'],
			rules: {
				'n8n-nodes-base/node-param-display-name-miscased': 'off',
				'n8n-nodes-base/node-param-description-miscased-id': 'off',
				'n8n-nodes-base/node-execute-block-wrong-error-thrown': 'off',
				'n8n-nodes-base/node-param-default-missing': 'off',
				'@typescript-eslint/no-explicit-any': 'off',
				'@typescript-eslint/no-non-null-assertion': 'off',
			},
		},
	],
};
