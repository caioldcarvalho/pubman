export interface Toast {
	id: string;
	message: string;
	type: 'success' | 'error' | 'info';
	exiting?: boolean;
}

class ToastStore {
	list = $state<Toast[]>([]);

	show(message: string, type: Toast['type'] = 'success', duration = 2000) {
		const id = Date.now().toString(36);
		this.list.push({ id, message, type });

		setTimeout(() => {
			const toast = this.list.find((t) => t.id === id);
			if (toast) toast.exiting = true;
			setTimeout(() => {
				this.list = this.list.filter((t) => t.id !== id);
			}, 200);
		}, duration);
	}

	success(message: string) { this.show(message, 'success'); }
	error(message: string) { this.show(message, 'error', 3000); }
	info(message: string) { this.show(message, 'info'); }
}

export const toast = new ToastStore();
