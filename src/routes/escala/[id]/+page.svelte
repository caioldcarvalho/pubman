<script lang="ts">
	import { page } from '$app/state';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StarRating from '$lib/components/StarRating.svelte';
	import { collaborators } from '$lib/stores/collaborators.svelte';
	import { schedule } from '$lib/stores/schedule.svelte';
	import { toast } from '$lib/stores/toast.svelte';
	import { formatDate, getDayName } from '$lib/utils';

	const period = $derived(schedule.periods.find((p) => p.id === page.params.id));
	const dates = $derived(period ? schedule.getDatesByPeriod(period.id) : []);
	const assignmentCounts = $derived(period ? schedule.getAssignmentCountByCollaborator(period.id) : new Map());

	let tab = $state<'availability' | 'schedule'>('availability');

	const dayLabels: Record<number, string> = { 5: 'Sex', 6: 'Sáb' };

	async function toggleAvail(dateId: string, collabId: string, current: boolean) {
		await schedule.setAvailability(dateId, collabId, !current);
	}

	async function toggleAssign(dateId: string, collabId: string) {
		const wasAssigned = schedule.isAssigned(dateId, collabId);
		await schedule.toggleAssignment(dateId, collabId);
		const name = collaborators.getById(collabId)?.name ?? '';
		if (!wasAssigned) {
			toast.success(`${name} escalado`);
		}
	}
</script>

{#if period}
	<PageHeader title="{formatDate(period.start_date)} - {formatDate(period.end_date)}" backHref="/escala" />

	<div class="flex border-b border-surface-2">
		<button
			onclick={() => (tab = 'availability')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'availability' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}"
		>
			Disponibilidade
		</button>
		<button
			onclick={() => (tab = 'schedule')}
			class="flex-1 py-3 text-center text-sm font-medium transition-all
				{tab === 'schedule' ? 'border-b-2 border-accent text-accent' : 'text-text-muted'}"
		>
			Montar Escala
		</button>
	</div>

	{#if tab === 'availability'}
		<div class="px-4 py-4">
			<p class="mb-4 text-sm text-text-muted">Toque no nome para alternar disponibilidade.</p>

			<div class="stagger space-y-5">
				{#each dates as schedDate}
					<div>
						<div class="mb-2 flex items-center gap-2">
							<span class="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-accent/20 text-accent' : ''}">
								{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
							</span>
							<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
							<span class="text-xs text-text-muted">({schedDate.required_count} necessários)</span>
						</div>
						<div class="grid grid-cols-2 gap-1.5">
							{#each collaborators.active as collab}
								{@const avail = schedule.getAvailability(schedDate.id).find((a) => a.collaborator_id === collab.id)}
								{@const isAvailable = avail?.available ?? false}
								<button
									onclick={() => toggleAvail(schedDate.id, collab.id, isAvailable)}
									class="pressable rounded-xl px-3 py-2.5 text-left text-sm font-medium transition-all
										{isAvailable ? 'bg-success/15 text-success ring-1 ring-success/30' : 'bg-surface text-text-muted'}"
								>
									{collab.name}
								</button>
							{/each}
						</div>
					</div>
				{/each}
			</div>
		</div>

	{:else}
		<div class="px-4 py-4">
			<!-- Assignment counts -->
			<div class="animate-in mb-5 rounded-2xl bg-surface p-4 shadow-md shadow-black/10">
				<div class="mb-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">Dias convocados</div>
				<div class="flex flex-wrap gap-1.5">
					{#each collaborators.sorted as collab}
						{@const count = assignmentCounts.get(collab.id) ?? 0}
						<div class="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium
							{count > 0 ? 'bg-accent/15 text-accent ring-1 ring-accent/30' : 'bg-surface-2 text-text-muted'}">
							<span>{collab.name}</span>
							<span class="font-bold">{count}</span>
						</div>
					{/each}
				</div>
			</div>

			<div class="stagger space-y-5">
				{#each dates as schedDate}
					{@const available = schedule.getAvailableCollaborators(schedDate.id)}
					{@const assigned = schedule.getAssignments(schedDate.id)}
					{@const isFull = assigned.length >= schedDate.required_count}
					<div>
						<div class="mb-2 flex items-center gap-2">
							<span class="rounded-lg bg-surface-2 px-2 py-1 text-xs font-bold {schedDate.day_of_week === 6 ? 'bg-accent/20 text-accent' : ''}">
								{dayLabels[schedDate.day_of_week] ?? getDayName(schedDate.date)}
							</span>
							<span class="text-sm font-semibold">{formatDate(schedDate.date)}</span>
							<span class="rounded-full px-2 py-0.5 text-xs font-bold {isFull ? 'bg-success/15 text-success' : 'bg-warning/15 text-warning'}">
								{assigned.length}/{schedDate.required_count}
							</span>
						</div>
						{#if available.length === 0}
							<p class="rounded-xl bg-surface px-4 py-3 text-center text-xs text-text-muted">Ninguém disponível</p>
						{:else}
							<div class="grid grid-cols-2 gap-1.5">
								{#each collaborators.sorted as collab}
									{@const isAvail = available.some((a) => a.collaborator_id === collab.id)}
									{@const isAssigned = schedule.isAssigned(schedDate.id, collab.id)}
									{#if isAvail}
										<button
											onclick={() => toggleAssign(schedDate.id, collab.id)}
											class="pressable flex items-center gap-1.5 rounded-xl px-3 py-2.5 text-left text-sm transition-all
												{isAssigned ? 'bg-accent text-white shadow-md shadow-accent/30' : 'bg-surface text-text ring-1 ring-surface-2'}"
										>
											<StarRating value={collab.stars} size="sm" readonly />
											<span class="font-medium">{collab.name}</span>
										</button>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/each}
			</div>
		</div>
	{/if}
{:else}
	<PageHeader title="Não encontrada" backHref="/escala" />
	<p class="py-8 text-center text-text-muted">Escala não encontrada.</p>
{/if}
