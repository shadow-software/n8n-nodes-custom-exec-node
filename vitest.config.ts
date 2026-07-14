import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		include: ['nodes/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['nodes/**/*.ts'],
			exclude: ['nodes/**/*.test.ts'],
		},
	},
});
