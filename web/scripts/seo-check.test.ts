import { describe, expect, it } from 'vitest';
import { isDevOnlyPath } from './seo-check';

describe('isDevOnlyPath', () => {
	it.each(['/_design', '/_design.html', '/_internal/route.js', '/_private.js', '/foo/_bar.css'])(
		'%s is a dev-only path',
		(path) => {
			expect(isDevOnlyPath(path)).toBe(true);
		}
	);

	it('allows underscore-prefixed filenames under the application asset path', () => {
		expect(isDevOnlyPath('/_app/immutable/chunks/_SW5ZK_L.js')).toBe(false);
	});
});
