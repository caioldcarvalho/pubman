<script lang="ts">
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
			<svg viewBox="0 0 24 24" fill={filled ? 'var(--color-star)' : 'none'} stroke={filled ? 'var(--color-star)' : 'var(--color-text-muted)'} stroke-width="2">
				<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
			</svg>
		</button>
	{/each}
</div>
