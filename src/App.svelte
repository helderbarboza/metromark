<script lang="ts">
	import { onMount } from "svelte";
	import { SnapGridGroup } from "@snapgridjs/svelte";
	import type {
		Client,
		Command,
		Layout,
		Notice,
		Snapshot,
		TileSize,
	} from "./lib/types";
	import {
		flatten,
		indexTree,
		isBookmark,
		projectGroups,
		countBookmarks,
	} from "./lib/tree";
	import { reconcileLayout, ROWS, DENSITY, cellsToPx } from "./lib/layout";
	import Icon from "./lib/components/Icon.svelte";
	import MetroGroup from "./lib/components/MetroGroup.svelte";
	import ContextMenu from "./lib/components/ContextMenu.svelte";
	import type { MenuItem } from "./lib/components/ContextMenu.svelte";
	import Editor from "./lib/components/Editor.svelte";
	import type { DialogSpec } from "./lib/components/Editor.svelte";
	import UndoToast from "./lib/components/UndoToast.svelte";
	import MetroAppBar from "./lib/components/MetroAppBar.svelte";

	let { client }: { client: Client } = $props();
	let snapshot = $state.raw<Snapshot | null>(null);
	let loadError = $state("");
	let query = $state("");
	let rootFilter = $state("all");
	let arranging = $state(false);
	let dragging = $state(false);
	let selectedId = $state<string | null>(null);
	let busy = $state(false);
	let now = $state(Date.now());
	let viewportHeight = $state(800);
	let scroller = $state<HTMLElement | null>(null);
	let searchInput: HTMLInputElement;
	let scrollProgress = $state(0);
	let canScroll = $state(false);
	let activeGroup = $state(0);
	let draftLayouts = $state.raw<Record<string, Layout>>({});
	let layoutTimer: ReturnType<typeof setTimeout> | undefined;
	let gestureTimer: ReturnType<typeof setTimeout> | undefined;
	let dialog = $state<DialogSpec | null>(null);
	let context = $state<{
		target: "tile" | "group" | "canvas";
		id: string;
		x: number;
		y: number;
	} | null>(null);
	let contextOrigin: HTMLElement | null = null;
	let notice = $state<Notice | null>(null);
	let noticeUntil = $state(0);

	const groups = $derived(snapshot ? projectGroups(snapshot) : []);
	const allTiles = $derived(
		Object.fromEntries(groups.flatMap((group) => Object.entries(group.tiles))),
	);
	const selectedTile = $derived(selectedId ? allTiles[selectedId] : undefined);
	const contextTile = $derived(
		context?.target === "tile" ? allTiles[context.id] : undefined,
	);
	const nodes = $derived(indexTree(snapshot?.tree ?? []));
	const roots = $derived(
		(snapshot?.tree ?? [])
			.flatMap((root) => root.children ?? [])
			.filter((node) => !isBookmark(node) && node.type !== "separator"),
	);
	const bookmarkCount = $derived(
		flatten(snapshot?.tree ?? []).filter(isBookmark).length,
	);
	const folderCount = $derived(
		groups.filter((group) => !group.isSystem).length,
	);
	const metrics = $derived(DENSITY[snapshot?.settings.density ?? "default"] ?? DENSITY.default);
	const gap = $derived(metrics.gap);
	const cell = $derived(
		Math.max(
			28,
			Math.min(
				metrics.cell,
				Math.floor((viewportHeight - 279 - (ROWS - 1) * metrics.gap) / ROWS),
			),
		),
	);
	const density = $derived(snapshot?.settings.density ?? "default");
	const normalizedQuery = $derived(query.trim().toLowerCase());
	const visibleGroups = $derived.by(() => {
		const filtered = groups.filter(
			(group) => rootFilter === "all" || group.rootId === rootFilter,
		);
		if (!normalizedQuery || !snapshot) return filtered;
		return filtered
			.map((group) => {
				const matchesPath = group.path
					.join(" / ")
					.toLowerCase()
					.includes(normalizedQuery);
				const matching = Object.values(group.tiles).filter(
					(tile) =>
						matchesPath ||
						`${tile.title} ${tile.url}`.toLowerCase().includes(normalizedQuery),
				);
				const sizes = Object.fromEntries(
					matching.map((tile) => [
						tile.id,
						{ ...snapshot!.appearance[tile.id], size: tile.size },
					]),
				);
				return {
					...group,
					layout: reconcileLayout(
						matching.map((tile) => ({
							id: tile.id,
							title: tile.title,
							url: tile.url,
						})),
						[],
						sizes,
					),
				};
			})
			.filter((group) => group.layout.length);
	});
	const resultCount = $derived(
		visibleGroups.reduce((count, group) => count + group.layout.length, 0),
	);
	const undo = $derived(
		notice?.undoId
			? snapshot?.undos.find(
					(entry) => entry.id === notice?.undoId && entry.expiresAt > now,
				)
			: undefined,
	);
	const today = $derived(
		new Date(now).toLocaleDateString("en", {
			weekday: "long",
			month: "long",
			day: "numeric",
		}),
	);

	function applySnapshot(value: Snapshot) {
		snapshot = value;
		if (
			selectedId &&
			!flatten(value.tree).some((node) => node.id === selectedId)
		)
			selectedId = null;
		if (
			rootFilter !== "all" &&
			!flatten(value.tree).some((node) => node.id === rootFilter)
		)
			rootFilter = "all";
	}
	function showNotice(value: Notice, expiration?: number) {
		notice = value;
		noticeUntil =
			expiration ?? Date.now() + (value.tone === "error" ? 9000 : 4500);
	}
	async function execute(command: Command): Promise<boolean> {
		busy = true;
		try {
			const result = await client.execute(command);
			applySnapshot(result.snapshot);
			if (result.notice)
				showNotice(
					result.notice,
					result.notice.undoId
						? result.snapshot.undos.find(
								(entry) => entry.id === result.notice?.undoId,
							)?.expiresAt
						: undefined,
				);
			return true;
		} catch (error) {
			showNotice({
				message:
					error instanceof Error ? error.message : "The operation failed.",
				tone: "error",
			});
			try {
				applySnapshot(await client.snapshot());
			} catch {
				/* The existing view remains visible while disconnected. */
			}
			return false;
		} finally {
			busy = false;
		}
	}
	onMount(() => {
		const unsubscribe = client.subscribe(applySnapshot);
		void client
			.snapshot()
			.then((value) => {
				applySnapshot(value);
				const pending = value.undos
					.filter((entry) => entry.expiresAt > Date.now())
					.at(-1);
				if (pending)
					showNotice(
						{ message: pending.label, undoId: pending.id },
						pending.expiresAt,
					);
			})
			.catch((error: unknown) => {
				loadError =
					error instanceof Error ? error.message : "Unable to load bookmarks.";
			});
		const resize = () => {
			viewportHeight = window.innerHeight;
			updateScroll();
		};
		resize();
		window.addEventListener("resize", resize);
		const clock = setInterval(() => {
			now = Date.now();
		}, 300);
		return () => {
			unsubscribe();
			client.dispose();
			window.removeEventListener("resize", resize);
			clearInterval(clock);
			clearTimeout(layoutTimer);
			clearTimeout(gestureTimer);
cancelSmoothScroll();
		};
	});
	$effect(() => {
		if (notice && now >= noticeUntil) notice = null;
	});
	$effect(() => {
		void visibleGroups;
		void cell;
		void gap;
		requestAnimationFrame(updateScroll);
	});

	function defaultFolder() {
		return (
			groups.find((group) => group.id === rootFilter && group.writable)?.id ??
			groups.find((group) => group.writable)?.id ??
			""
		);
	}
	function edit(spec: DialogSpec) {
		dialog = spec;
		selectedId = spec.id ?? selectedId;
	}
	function closeContext() {
		context = null;
		contextOrigin?.focus({ preventScroll: true });
	}
	function showContext(
		event: MouseEvent,
		target: "tile" | "group" | "canvas",
		id: string,
	) {
		event.preventDefault();
		event.stopPropagation();
		contextOrigin =
			(event.target as HTMLElement).closest<HTMLElement>("a, button") ?? null;
		const rect = contextOrigin?.getBoundingClientRect();
		const keyboardOrButton =
			event.type === "click" || (event.clientX === 0 && event.clientY === 0);
		context = {
			target,
			id,
			x: keyboardOrButton && rect ? rect.left : event.clientX,
			y: keyboardOrButton && rect ? rect.bottom + 7 : event.clientY,
		};
	}
	async function open(url: string, disposition: "tab" | "window") {
		try {
			await client.open(url, disposition);
		} catch (error) {
			showNotice({
				message:
					error instanceof Error
						? error.message
						: "Unable to open this address.",
				tone: "error",
			});
		}
	}
	async function copy(id: string) {
		const url = allTiles[id]?.url;
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			showNotice({ message: "Website address copied." });
		} catch {
			edit({ kind: "copy", id });
		}
	}
	const menuItems = $derived.by((): MenuItem[] => {
		if (!context) return [];
		const node = nodes.get(context.id);
		const tile = contextTile;
		if (context.target === "tile" && tile)
			return [
				{
					label: "Open in new tab",
					icon: "external",
					action: () => {
						void open(tile.url, "tab");
					},
				},
				{
					label: "Open in new window",
					icon: "desktop",
					action: () => {
						void open(tile.url, "window");
					},
				},
				{
					label: "Edit bookmark",
					icon: "edit",
					separator: true,
					disabled: !tile.writable,
					action: () => edit({ kind: "bookmark", id: tile.id }),
				},
				{
					label: "Move to folder",
					icon: "folder",
					disabled: !tile.writable,
					action: () => edit({ kind: "move", id: tile.id }),
				},
				{
					label: "Customize tile",
					icon: "arrange",
					action: () => edit({ kind: "appearance", id: tile.id }),
				},
				{
					label: "Copy website address",
					icon: "copy",
					action: () => {
						void copy(tile.id);
					},
				},
				{
					label: "Delete bookmark",
					icon: "trash",
					separator: true,
					danger: true,
					disabled: !tile.writable,
					action: () => {
						void execute({ type: "node.remove", id: tile.id });
					},
				},
			];
		if (context.target === "group" && node) {
			const group = groups.find((group) => group.id === node.id);
			return [
				{
					label: "Add bookmark here",
					icon: "plus",
					disabled: !group?.writable,
					action: () => edit({ kind: "bookmark", parentId: node.id }),
				},
				{
					label: "Create child folder",
					icon: "folder",
					disabled: !group?.writable,
					action: () => edit({ kind: "folder", parentId: node.id }),
				},
				{
					label: "Rename folder",
					icon: "edit",
					separator: true,
					disabled: !group?.mutable,
					action: () => edit({ kind: "rename", id: node.id }),
				},
				{
					label: "Move folder",
					icon: "folder",
					disabled: !group?.mutable,
					action: () => edit({ kind: "move", id: node.id }),
				},
				{
					label: "Delete folder",
					icon: "trash",
					separator: true,
					danger: true,
					disabled: !group?.mutable,
					action: () => edit({ kind: "delete", id: node.id }),
				},
			];
		}
		const parentId =
			groups.find((group) => group.id === context?.id && group.writable)?.id ??
			defaultFolder();
		return [
			{
				label: "Add bookmark",
				icon: "plus",
				disabled: !parentId,
				action: () => edit({ kind: "bookmark", parentId }),
			},
			{
				label: "Create folder / group",
				icon: "folder",
				disabled: !parentId,
				action: () => edit({ kind: "folder", parentId }),
			},
			{
				label: arranging ? "Finish arranging" : "Arrange tiles",
				icon: "arrange",
				separator: true,
				action: () => {
					arranging = !arranging;
					selectedId = null;
				},
			},
			{
				label: "Search bookmarks",
				icon: "search",
				action: () => searchInput.focus(),
			},
			{
				label: "Appearance & settings",
				icon: "settings",
				separator: true,
				action: () => edit({ kind: "settings" }),
			},
		];
	});
	function resizeTile(id: string, size: TileSize) {
		void execute({ type: "tile.appearance", id, patch: { size } });
	}
	function stageLayout(id: string, layout: Layout) {
		draftLayouts = { ...draftLayouts, [id]: layout };
		clearTimeout(layoutTimer);
		// Source and destination callbacks belong to one gesture. Never treat source removal as deletion.
		layoutTimer = setTimeout(() => {
			const committed = structuredClone(draftLayouts);
			void execute({ type: "layout.commit", layouts: committed }).finally(
				() => {
					draftLayouts = {};
				},
			);
		}, 35);
	}
	function dragStop() {
		clearTimeout(gestureTimer);
		gestureTimer = setTimeout(() => {
			dragging = false;
		}, 180);
	}
	function updateScroll() {
		if (!scroller) return;
		const max = scroller.scrollWidth - scroller.clientWidth;
		canScroll = max > 3;
		scrollProgress = max > 0 ? scroller.scrollLeft / max : 0;
if (smoothFrame === null) {
			targetScroll = scroller.scrollLeft;
			currentScroll = scroller.scrollLeft;
		}
		const elements = [
			...scroller.querySelectorAll<HTMLElement>(".metro-group"),
		];
		const left = scroller.scrollLeft + 80;
		activeGroup = Math.max(
			0,
			elements.findLastIndex((element) => element.offsetLeft <= left),
		);
	}

	let targetScroll = 0;
	let currentScroll = 0;
	let smoothFrame: number | null = null;

	function cancelSmoothScroll() {
		if (smoothFrame !== null) {
			cancelAnimationFrame(smoothFrame);
			smoothFrame = null;
		}
		if (scroller) scroller.style.scrollBehavior = "";
	}

	function smoothScroll() {
		if (!scroller) {
			smoothFrame = null;
			return;
		}
		const diff = targetScroll - currentScroll;

		// Stop when close enough
		if (Math.abs(diff) < 0.5) {
			currentScroll = targetScroll;
			scroller.scrollLeft = currentScroll;
			smoothFrame = null;
			scroller.style.scrollBehavior = "";
			return;
		}

		currentScroll += diff * 0.15; // easing factor (lower = smoother/slower)
		scroller.scrollLeft = currentScroll;
		smoothFrame = requestAnimationFrame(smoothScroll);
	}

	function wheel(event: WheelEvent) {
		if (
			!scroller ||
			event.ctrlKey ||
			!canScroll ||
			Math.abs(event.deltaX) >= Math.abs(event.deltaY)
		)
			return;
		
		if (scroller.scrollHeight > scroller.clientHeight + 4 && !event.shiftKey)
			return;

		event.preventDefault();
		
		const delta =
			event.deltaY *
			(event.deltaMode === 1
				? 16
				: event.deltaMode === 2
					? scroller.clientWidth
					: 1);
	
		if (snapshot?.settings.reducedMotion) {
			cancelSmoothScroll();
			scroller.scrollLeft += delta;
			targetScroll = scroller.scrollLeft;
			currentScroll = scroller.scrollLeft;
			return;
		}

		if (smoothFrame === null) {
			// Resync in case of external scrolls (scrollbar, keyboard, buttons).
			targetScroll = scroller.scrollLeft;
			currentScroll = scroller.scrollLeft;
			// Avoid CSS smooth behavior double-smoothing direct scrollLeft writes.
			scroller.style.scrollBehavior = "auto";
		}

		const maxScroll = scroller.scrollWidth - scroller.clientWidth;
		targetScroll = Math.min(Math.max(targetScroll + delta, 0), maxScroll);

		if (smoothFrame === null) {
			smoothFrame = requestAnimationFrame(smoothScroll);
		}
	}

	function scroll(direction: -1 | 1) {
cancelSmoothScroll();
		scroller?.scrollBy({
			left: direction * Math.max(250, scroller.clientWidth * 0.65),
			behavior: snapshot?.settings.reducedMotion ? "instant" : "smooth",
		});
	}
	function jump(index: number) {
		const element =
			scroller?.querySelectorAll<HTMLElement>(".metro-group")[index];
if (element && scroller) cancelSmoothScroll();
		if (element && scroller)
			scroller.scrollTo({
				left: Math.max(0, element.offsetLeft - 68),
				behavior: snapshot?.settings.reducedMotion ? "instant" : "smooth",
			});
	}
	function key(event: KeyboardEvent) {
		const input =
			event.target instanceof HTMLElement &&
			["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName);
		if (dialog || context) return;
		if (
			!input &&
			(event.key === "/" ||
				((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k"))
		) {
			event.preventDefault();
			searchInput.focus();
		}
		if (
			!input &&
			(event.metaKey || event.ctrlKey) &&
			event.key.toLowerCase() === "z"
		) {
			const recent = snapshot?.undos
				.filter((entry) => entry.expiresAt > now)
				.at(-1);
			if (recent) {
				event.preventDefault();
				performUndo(recent.id);
			}
		}
		if (event.key === "Escape" && !dragging) {
			selectedId = null;
			if (query) query = "";
			else arranging = false;
		}
	}
	function performUndo(id: string) {
		if (snapshot?.undos.find((entry) => entry.id === id)?.needsDestination)
			edit({ kind: "restore", undoId: id });
		else void execute({ type: "undo", id });
	}
</script>

<svelte:window onkeydown={key} />
<div
	class="theme-{snapshot?.settings.theme ??
		'midnight'} flex h-dvh w-full flex-col overflow-hidden relative bg-(--bg) text-(--text)"
	class:reduced={snapshot?.settings.reducedMotion}
>
	<header class="shrink-0 px-16 pt-8 max-lg:px-9 max-md:px-6 max-md:pt-6">
		<div class="flex h-5 items-center justify-between">
			<span
				class="text-xs uppercase tracking-widest text-(--muted) max-sm:hidden"
				>{today}</span
			>
		</div>
		<div
			class="flex items-center justify-between gap-7 py-8 max-md:items-end max-md:gap-4 max-sm:block max-sm:py-6"
		>
			<div
				class="flex items-center gap-2.5 pt-3.5 max-md:max-w-67 max-md:flex-wrap max-md:justify-end max-md:gap-1.5 max-md:pt-0 max-sm:mt-6 max-sm:max-w-none max-sm:flex-nowrap max-sm:justify-start"
			>
				<label
					class="flex h-10 w-60 items-center gap-2.5 rounded border border-(--line) bg-(--surface) px-3 text-(--muted) focus-within:border-(--accent) max-lg:w-55 max-md:h-9 max-md:w-46 max-sm:flex-1"
					><Icon name="search" size={17} /><input
						bind:this={searchInput}
						bind:value={query}
						type="search"
						aria-label="Search bookmarks"
						placeholder="Find a bookmark…"
						autocomplete="off"
						spellcheck="false"
						class="w-full min-w-0 bg-transparent p-0 text-xs text-(--text) outline-none placeholder:text-(--muted) [&::-webkit-search-cancel-button]:hidden"
					/>{#if query}<button
							aria-label="Clear search"
							class="bg-transparent p-1 text-(--muted)"
							onclick={() => {
								query = "";
								searchInput.focus();
							}}><Icon name="close" size={13} /></button
						>{:else}<kbd
							class="flex h-5 w-4 items-center justify-center rounded border border-(--line) font-inherit text-xs"
							>/</kbd
						>{/if}</label
				><button
					class="button primary px-4 text-xs max-md:h-9 max-md:w-9 max-md:p-0"
					disabled={!snapshot || !defaultFolder()}
						onclick={() =>
							edit({ kind: "bookmark", parentId: defaultFolder() })}
					><Icon name="plus" size={16} /><span class="max-md:hidden"
						>Add bookmark</span
					></button
				><button
					class="icon-button -mr-2 max-md:h-8 max-md:w-7 max-sm:ml-1"
					aria-label="Open settings"
					disabled={!snapshot}
					onclick={() => edit({ kind: "settings" })}
					><Icon name="settings" size={20} /></button
				>
			</div>
		</div>
		<div
			class="flex items-center justify-between gap-5 border-b border-(--line) pb-3.5 max-sm:pb-2.5"
		>
			<nav
				class="flex min-w-0 gap-1.5 overflow-x-auto p-0.5 scrollbar-thin"
				aria-label="Bookmark roots"
			>
				<button
					class={rootFilter === "all"
						? "flex h-7 items-center gap-2 rounded bg-(--surface-hover) px-2 text-xs whitespace-nowrap text-(--text)"
						: "flex h-7 items-center gap-2 rounded bg-transparent px-2 text-xs whitespace-nowrap text-(--muted) hover:text-(--text)"}
					aria-pressed={rootFilter === "all"}
					onclick={() => {
						rootFilter = "all";
							cancelSmoothScroll(); scroller?.scrollTo({ left: 0 });
					}}
					>All bookmarks <span
						class={rootFilter === "all"
							? "text-xs text-(--accent)"
							: "text-xs text-(--muted)"}>{bookmarkCount}</span
					></button
				>{#each roots as root (root.id)}<button
						class={rootFilter === root.id
							? "flex h-7 items-center gap-2 rounded bg-(--surface-hover) px-2 text-xs whitespace-nowrap text-(--text)"
							: "flex h-7 items-center gap-2 rounded bg-transparent px-2 text-xs whitespace-nowrap text-(--muted) hover:text-(--text)"}
						aria-pressed={rootFilter === root.id}
						onclick={() => {
							rootFilter = root.id;
								cancelSmoothScroll(); scroller?.scrollTo({ left: 0 });
						}}
						>{root.title}<span
							class={rootFilter === root.id
								? "text-xs text-(--accent)"
								: "text-xs text-(--muted)"}>{countBookmarks(root)}</span
						></button
					>{/each}
			</nav>
			<button
				class={arranging
					? "inline-flex items-center gap-2 bg-transparent py-1.5 pl-2.5 text-xs whitespace-nowrap text-(--accent)"
					: "inline-flex items-center gap-2 bg-transparent py-1.5 pl-2.5 text-xs whitespace-nowrap text-(--muted) hover:text-(--accent) disabled:opacity-40"}
				disabled={!snapshot || Boolean(normalizedQuery) || busy}
				aria-pressed={arranging}
				onclick={() => {
					arranging = !arranging;
					selectedId = null;
				}}
				><Icon name={arranging ? "check" : "arrange"} size={14} /><span
					class="max-md:hidden"
					>{arranging ? "Done arranging" : "Arrange tiles"}</span
				></button
			>
		</div>
	</header>

	<!-- Canvas right-click has a matching visible Add button and keyboard-accessible settings. -->
	<main
		id="canvas"
			class="relative min-h-0 flex-1 overflow-auto scroll-smooth pt-4 outline-none scrollbar-none] [&::-webkit-scrollbar]:hidden 2xl:pt-6"
		bind:this={scroller}
		onscroll={updateScroll}
		onwheel={wheel}
		oncontextmenu={(event) => showContext(event, "canvas", defaultFolder())}
		aria-label="Bookmark tile canvas"
		tabindex="-1"
	>
		{#if !snapshot}
			<div
				class="flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)"
			>
				{#if loadError}<Icon name="lock" size={28} />
					<h2
						class="mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)"
					>
						Let's reconnect.
					</h2>
					<p class="mb-6 px-5 text-xs leading-relaxed">{loadError}</p>
					<button class="button" onclick={() => window.location.reload()}
						>Reload page</button
					>{:else}<span
						class="mb-5 size-6 animate-spin rounded-full border border-(--line) border-t-(--accent)"
					></span>
					<p class="mb-6 px-5 text-xs leading-relaxed">
						Finding your favorites…
					</p>{/if}
			</div>
		{:else if normalizedQuery && !visibleGroups.length}
			<div
				class="flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)"
			>
				<Icon name="search" size={33} />
				<h2
					class="mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)"
				>
					No favorites found.
				</h2>
				<p class="mb-6 px-5 text-xs leading-relaxed">
					Nothing matches “{query}”. Try a title, website, or folder.
				</p>
					<button class="button" onclick={() => (query = "")}
						>Clear search</button
				>
			</div>
		{:else}
			<SnapGridGroup>
				<div
					class="flex w-max items-start gap-9 px-16 pb-7 max-lg:gap-7 max-lg:px-9 max-md:px-6"
				>
					{#each visibleGroups as group (group.id)}
						<MetroGroup
							{group}
							layout={draftLayouts[group.id] ?? group.layout}
							tiles={allTiles}
							{cell}
							{gap}
							{density}
							arranging={arranging && !normalizedQuery}
							{dragging}
							{selectedId}
							showDomains={snapshot.settings.showDomains}
							preview={client.mode === "preview"}
							onLayoutChange={stageLayout}
							onDragStart={() => {
								dragging = true;
								selectedId = null;
							}}
							onDragStop={dragStop}
							onSelect={(id) => (selectedId = id)}
							onContext={showContext}
							onAdd={(parentId) => edit({ kind: "bookmark", parentId })}
							onBlocked={(message) => showNotice({ message, tone: "error" })}
						/>
					{/each}
					{#if !normalizedQuery && defaultFolder()}<div class="w-48 shrink-0">
							<div
								class="flex h-15 items-center pt-2.5 text-xs tracking-widest text-(--muted)"
							>
								A LITTLE MORE SPACE
							</div>
							<button
								class="relative flex w-full flex-col items-center justify-center border border-dashed border-(--line) bg-transparent text-(--muted) transition-colors duration-150 hover:border-(--muted) hover:bg-(--surface) hover:text-(--text)"
								style:height="{cellsToPx(ROWS, cell, gap)}px"
								onclick={() =>
									edit({ kind: "folder", parentId: defaultFolder() })}
								><span
									class="mb-5 flex size-12 items-center justify-center rounded-full border border-(--line)"
									><Icon name="plus" size={23} /></span
								><strong class="text-sm font-medium text-(--text)"
									>New group</strong
									><span class="mt-2 text-xs">Create a bookmark folder</span
									><span class="absolute top-4 right-4 opacity-60"
									><Icon name="arrow" size={16} /></span
								></button
							>
						</div>{/if}
					{#if !visibleGroups.length && !normalizedQuery}<div
							class="flex h-full min-h-60 w-full flex-col items-center justify-center text-center text-(--muted)"
						>
							<h2
								class="mt-5 mb-2.5 text-2xl font-normal tracking-tight text-(--text)"
							>
								No bookmark folders available.
							</h2>
							<p class="mb-6 px-5 text-xs leading-relaxed">
								Create a writable browser bookmark folder to get started.
							</p>
						</div>{/if}
				</div>
			</SnapGridGroup>
		{/if}
	</main>

	<footer
		class="flex min-h-16 shrink-0 items-center justify-between gap-5 px-16 pb-1.5 max-lg:px-9 max-md:px-6"
	>
		<div
			class="flex items-center gap-1.5 text-xs whitespace-nowrap text-(--muted)"
		>
			<span
				class={busy
					? "mr-px size-1 animate-pulse rounded-full bg-(--accent)"
					: "mr-px size-1 rounded-full bg-[#95a980]"}
			></span><span
				>{busy
					? "Saving changes…"
					: client.mode === "preview"
						? "Demo workspace"
						: "Browser connected"}</span
			>{#if client.mode === "preview"}<span class="opacity-50">·</span><span
					class="text-xs max-lg:max-w-42 max-lg:truncate max-md:hidden"
					>saved locally, not your real bookmarks</span
				>{:else}<span class="opacity-50">·</span><span
					class="text-xs max-lg:max-w-42 max-lg:truncate max-md:hidden"
					>{bookmarkCount} bookmarks, {folderCount} folders</span
				>{/if}
		</div>
		<nav
			class="absolute left-1/2 flex -translate-x-1/2 gap-1.5 p-2.5 max-md:hidden"
			aria-label="Jump to bookmark group"
		>
			{#each visibleGroups as group, index (group.id)}<button
					class={activeGroup === index
						? "w-4 rounded-full bg-(--accent) p-0 transition-all"
						: "size-1 rounded-full bg-(--line) p-0 transition-all"}
					aria-label="Jump to {group.path.join(' / ')}"
					aria-current={activeGroup === index ? "true" : undefined}
					onclick={() => jump(index)}
				></button>{/each}
		</nav>
		<div class="flex items-center gap-7 text-(--muted)">
			<span class="flex items-center gap-2 text-xs max-lg:hidden"
				><Icon name="mouse" size={13} />Right-click to make it yours</span
			>
			<div class="flex items-center gap-0.5">
				<span class="mr-2.5 text-xs tracking-widest max-sm:hidden"
					>{normalizedQuery
						? `${resultCount} found`
						: canScroll
							? "SCROLL TO EXPLORE"
							: "ALL IN VIEW"}</span
				><button
					class="icon-button h-7 w-6 rounded disabled:opacity-25"
					aria-label="Scroll groups left"
					disabled={!canScroll || scrollProgress < 0.01}
					onclick={() => scroll(-1)}><Icon name="back" size={17} /></button
				><button
					class="icon-button h-7 w-6 rounded disabled:opacity-25"
					aria-label="Scroll groups right"
					disabled={!canScroll || scrollProgress > 0.99}
					onclick={() => scroll(1)}><Icon name="chevron" size={17} /></button
				>
			</div>
		</div>
	</footer>
	{#if arranging && selectedTile}<MetroAppBar
			title={selectedTile.title}
			size={selectedTile.size}
			writable={selectedTile.writable}
			onresize={(size) => resizeTile(selectedTile.id, size)}
			onedit={() => edit({ kind: "bookmark", id: selectedTile.id })}
			ondelete={() => {
				void execute({ type: "node.remove", id: selectedTile.id });
			}}
			onclear={() => (selectedId = null)}
		/>{/if}
	{#if context}<ContextMenu
			x={context.x}
			y={context.y}
			title={contextTile?.title ??
				(context.target === "group"
					? nodes.get(context.id)?.title
					: "Your canvas")}
			subtitle={contextTile?.domain}
			items={menuItems}
			onclose={closeContext}
			size={contextTile?.size}
			onresize={contextTile
				? (size) => {
						if (contextTile) resizeTile(contextTile.id, size);
					}
				: undefined}
		/>{/if}
	{#if dialog && snapshot}{#key JSON.stringify(dialog)}<Editor
				spec={dialog}
				{snapshot}
				oncommand={execute}
				onclose={() => (dialog = null)}
				onresetpreview={client.resetPreview
					? async () => {
							applySnapshot(await client.resetPreview!());
							showNotice({ message: "Sample bookmarks restored." });
						}
					: undefined}
			/>{/key}{/if}
	{#if notice}<UndoToast
			{notice}
			onundo={undo ? () => performUndo(undo.id) : undefined}
			onclose={() => (notice = null)}
		/>{/if}
</div>
