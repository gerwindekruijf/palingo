import { redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const next = url.searchParams.get('next') ?? '/';
		redirect(302, next);
	}
	return {};
};

export const actions: Actions = {
	signOut: async ({ locals }) => {
		if (!locals.session) return;
		await auth.api.signOut({ headers: new Headers() });
		redirect(302, '/');
	}
};
