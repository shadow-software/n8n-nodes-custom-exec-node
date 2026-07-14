const { src, dest } = require('gulp');

/**
 * Copy node/credential SVG icons into dist/.
 *
 * tsc only emits .js — n8n resolves an `icon: 'file:foo.svg'` relative to the
 * COMPILED file, so without this step the node ships with a broken icon.
 */
function buildIcons() {
	return src('{nodes,credentials}/**/*.{png,svg}').pipe(dest('dist'));
}

exports['build:icons'] = buildIcons;
