<script lang="ts">
	import Star from '@lucide/svelte/icons/star';

	interface Props {
		value: number;
		max?: number;
		readonly?: boolean;
		size?: 'sm' | 'md' | 'lg';
		onchange?: (value: number) => void;
	}

	let { value, max = 5, readonly = false, size = 'md', onchange }: Props = $props();

	const sizes = { sm: 'h-4 w-4', md: 'h-5 w-5', lg: 'h-6 w-6' };

	function handleClick(star: number) {
		if (readonly) return;
		const newValue = value === star ? star - 1 : star;
		onchange?.(newValue);
	}
</script>

<div class="flex gap-0.5" role={readonly ? 'img' : 'radiogroup'} aria-label="Avaliação: {value} de {max}">
	{#each Array(max) as _, i}
		{@const filled = i < value}
		<button
			type="button"
			class="{sizes[size]} transition-transform {readonly ? 'cursor-default' : 'cursor-pointer active:scale-125'}"
			disabled={readonly}
			onclick={() => handleClick(i + 1)}
			aria-label="Estrela {i + 1}"
		>
			<Star class="h-full w-full {filled ? 'fill-star text-star' : 'text-muted-foreground'}" />
		</button>
	{/each}
</div>
