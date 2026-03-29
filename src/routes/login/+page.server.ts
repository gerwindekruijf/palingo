import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import { APIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	if (locals.user) {
		const next = url.searchParams.get('next') ?? '/';
		redirect(302, next);
	}
	return {};
};

export const actions: Actions = {
	signIn: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const next = formData.get('next')?.toString() ?? '/';

		if (!email || !password) {
			return fail(400, { error: 'Email y contraseña requeridos', email });
		}

		try {
			await auth.api.signInEmail({ body: { email, password } });
		} catch (e) {
			if (e instanceof APIError) {
				return fail(400, { error: 'Email o contraseña incorrectos', email });
			}
			return fail(500, { error: 'Error inesperado', email });
		}

		redirect(302, next);
	},

	signUp: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const name = formData.get('name')?.toString().trim() ?? '';
		const next = formData.get('next')?.toString() ?? '/';

		if (!email || !password || !name) {
			return fail(400, { error: 'Todos los campos son obligatorios', email, name });
		}
		if (password.length < 8) {
			return fail(400, { error: 'La contraseña debe tener al menos 8 caracteres', email, name });
		}

		try {
			await auth.api.signUpEmail({ body: { email, password, name } });
		} catch (e) {
			if (e instanceof APIError) {
				return fail(400, { error: 'Este email ya está registrado', email, name });
			}
			return fail(500, { error: 'Error inesperado', email, name });
		}

		redirect(302, next);
	},

	signOut: async ({ locals }) => {
		if (!locals.session) return;
		await auth.api.signOut({ headers: new Headers() });
		redirect(302, '/');
	}
};
