import { supabase } from '$lib/supabase';
import type { User } from '@supabase/supabase-js';

class AuthStore {
	user = $state<User | null>(null);
	loading = $state(true);

	constructor() {
		this.init();
	}

	async init() {
		const { data } = await supabase.auth.getSession();
		this.user = data.session?.user ?? null;
		this.loading = false;

		supabase.auth.onAuthStateChange((_event, session) => {
			this.user = session?.user ?? null;
		});
	}

	async login(email: string, password: string): Promise<string | null> {
		const { error } = await supabase.auth.signInWithPassword({ email, password });
		return error?.message ?? null;
	}

	async logout() {
		await supabase.auth.signOut();
		this.user = null;
	}

	get isAuthenticated() {
		return !!this.user;
	}
}

export const auth = new AuthStore();
