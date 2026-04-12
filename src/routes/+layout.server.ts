import type { LayoutServerLoad } from './$types';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const pkgPath = resolve(dirname(fileURLToPath(import.meta.url)), '../../package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));

export const load: LayoutServerLoad = async ({ locals }) => {
	return {
		user: locals.user ?? null,
		version: pkg.version as string
	};
};
