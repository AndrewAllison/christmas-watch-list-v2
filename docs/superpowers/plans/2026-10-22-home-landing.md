# Home Landing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Home a landing of three counts and two shelves, and move search to a standalone Discovery page at `/discovery`.

**Architecture:** Pure functions decide the three counts, Up next copy, the latest-shelf exclusion, Discovery membership, search, and the return URL. The pages load the guide, this year's `season_entries`, and watch events, then render those results. Add, remove, and mark watched stay on the existing actions.

**Tech Stack:** SvelteKit 3, Svelte 5 runes, Drizzle, Vitest, pnpm. No new dependencies.

## Global Constraints

- Route is `/discovery`, lowercase. Tab label is Discovery. Icon is a magnifying glass.
- Signed out, the bar is Home and Discovery. Signed in, the bar is Home, Discovery, and Season. History stays in the profile control.
- To watch counts this year's list titles that `watchedThisSeason` rejects.
- This season counts distinct titles `watchedThisSeason` accepts, on the list or off it.
- All time counts one History row per title. A repeat does not increase it. An unknown-date "I've seen it" counts here and does not count in This season.
- Up next is Still to watch, latest release year first, then title, with no cap. Open Season sits under that row.
- Latest releases is the first 12 titles with no watch event, excluding Up next ids. Signed out, Latest releases is the first 12 guide titles and is look-only.
- Discovery search is a GET form. An empty query shows the seen or unseen set. `seen` is ignored when signed out.
- Add does not write a watch. A watch does not insert a seasonal row or set `is_favourite`.
- No new table and no new dependency. Do not change `loadGuide`, `seasonListAction`, `recordTick`, or `watchedThisSeason`. Add still only inserts `season_entries`. A watch still only inserts `watch_events`. This slice does not add a database test for that existing split.
- Visible copy is exactly the strings in the spec `docs/superpowers/specs/2026-10-22-home-landing-design.md`.
- Time, audience, mood, richer search, collections, and traditions stay out.

## File structure

- `src/lib/discovery.ts` — guide membership, search narrowing, seen flag, status copy, Discovery return URL.
- `src/lib/home-landing.ts` — the three counts, their accessible names, Up next empty copy, Latest releases exclusion.
- `src/lib/season-list.ts` — Season's empty-card prompt. `partitionSeason` stays the source of Still to watch and Watched.
- `src/lib/navigation.ts` — Home, Discovery, Season tabs.
- `src/routes/discovery/+page.server.ts` and `+page.svelte` — the guide page.
- `src/routes/+page.server.ts` and `+page.svelte` — the landing.
- `src/routes/season/+page.svelte` — empty card points at Discovery.
- `src/lib/components/tab-bar.svelte` — third icon and a three-column pill.
- `AGENTS.md`, `.cursor/rules/scope-mvp.mdc`, `docs/product-roadmap.md`, and the spec status line — record the shipped map.

---

### Task 1: Discovery membership, search, and return URL

**Files:**
- Modify: `src/lib/discovery.ts`
- Test: `src/lib/discovery.spec.ts`

**Interfaces:**
- Consumes: `filterDiscovery`, `matchTitles` (already in `src/lib/discovery.ts`)
- Produces:
  - `discoverySeen(signedIn: boolean, raw: string | null): boolean`
  - `discoveryGuide<T extends { id: string }>(titles: readonly T[], signedIn: boolean, seen: boolean, watchedIds: ReadonlySet<string>, seasonIds: ReadonlySet<string>): T[]`
  - `discoveryResults<T extends { title: string }>(titles: readonly T[], query: string): T[]`
  - `discoveryNext(query: string, seen: boolean): string`
  - `discoveryStatus(count: number, query: string, signedIn: boolean): { kind: 'results'; label: string } | { kind: 'empty'; label: string } | { kind: 'guide' }`
  - Deletes `homeNext` and `homeListCopy`

- [ ] **Step 1: Write the failing tests**

Replace the `homeNext` and `homeListCopy` imports and describes in `src/lib/discovery.spec.ts` with:

```ts
import {
	type DiscoveryTitle,
	discoveryGuide,
	discoveryNext,
	discoveryResults,
	discoverySeen,
	discoveryStatus,
	filterDiscovery,
	matchTitles,
	orderByRelease,
	takeLatest
} from './discovery';
```

Keep the existing `orderByRelease`, `filterDiscovery`, `takeLatest`, and `matchTitles` describes. Add:

```ts
describe('discoverySeen', () => {
	it('is on only for a signed-in seen=1 request', () => {
		expect(discoverySeen(true, '1')).toBe(true);
		expect(discoverySeen(true, null)).toBe(false);
		expect(discoverySeen(false, '1')).toBe(false);
	});
});

describe('discoveryGuide', () => {
	const titles = [title({ id: 'new' }), title({ id: 'seen' }), title({ id: 'listed' })];
	const watched = new Set(['seen']);
	const season = new Set(['listed']);

	it('returns the whole guide when signed out, even with seen=1', () => {
		expect(discoveryGuide(titles, false, true, watched, season).map((item) => item.id)).toEqual([
			'new',
			'seen',
			'listed'
		]);
	});

	it('keeps an unwatched list title in the default guide', () => {
		expect(discoveryGuide(titles, true, false, watched, season).map((item) => item.id)).toEqual([
			'new',
			'listed'
		]);
	});

	it('uses the seen filter when signed in', () => {
		expect(discoveryGuide(titles, true, true, watched, season).map((item) => item.id)).toEqual([
			'seen'
		]);
	});
});

describe('discoveryResults', () => {
	const titles = [title({ id: 'love', title: 'Love Actually' }), title({ id: 'elf', title: 'Elf' })];

	it('returns the set for an empty query and narrows a typed one', () => {
		expect(discoveryResults(titles, '   ').map((item) => item.id)).toEqual(['love', 'elf']);
		expect(discoveryResults(titles, ' love ').map((item) => item.id)).toEqual(['love']);
	});
});

describe('discoveryNext', () => {
	it('keeps seen and the query on the discovery path', () => {
		expect(discoveryNext('', false)).toBe('/discovery');
		expect(discoveryNext(' Elf ', true)).toBe('/discovery?seen=1&q=Elf');
	});
});

describe('discoveryStatus', () => {
	it('names a non-empty search and an empty search', () => {
		expect(discoveryStatus(1, 'elf', true)).toEqual({ kind: 'results', label: '1 title' });
		expect(discoveryStatus(2, 'elf', true)).toEqual({ kind: 'results', label: '2 titles' });
		expect(discoveryStatus(0, 'elf', true)).toEqual({ kind: 'empty', label: 'No titles match that.' });
	});

	it('uses the empty-guide lines only when the query is blank', () => {
		expect(discoveryStatus(4, '  ', true)).toEqual({ kind: 'guide' });
		expect(discoveryStatus(0, '', true)).toEqual({ kind: 'empty', label: 'No titles in this view.' });
		expect(discoveryStatus(0, '', false)).toEqual({ kind: 'empty', label: 'The guide is empty.' });
	});
});
```

Delete the `homeNext` and `homeListCopy` describes.

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec vitest run src/lib/discovery.spec.ts`

Expected: FAIL because `discoverySeen` (and the other new names) are not exported.

- [ ] **Step 3: Implement the functions**

Delete `homeNext` and `homeListCopy` from `src/lib/discovery.ts`. Add:

```ts
/** Signed-out requests ignore `seen`. */
export function discoverySeen(signedIn: boolean, raw: string | null): boolean {
	return signedIn && raw === '1';
}

/** Signed out: the whole guide. Signed in: the seen or unseen filter. */
export function discoveryGuide<T extends { id: string }>(
	titles: readonly T[],
	signedIn: boolean,
	seen: boolean,
	watchedIds: ReadonlySet<string>,
	seasonIds: ReadonlySet<string>
): T[] {
	if (!signedIn) return [...titles];
	return filterDiscovery(titles, seen, watchedIds, seasonIds);
}

/** An empty query keeps the guide set. A query narrows it by title. */
export function discoveryResults<T extends { title: string }>(
	titles: readonly T[],
	query: string
): T[] {
	if (!query.trim()) return [...titles];
	return matchTitles(titles, query);
}

export function discoveryNext(query: string, seen: boolean): string {
	const params = new URLSearchParams();
	if (seen) params.set('seen', '1');
	const trimmed = query.trim();
	if (trimmed) params.set('q', trimmed);
	const search = params.toString();
	return search ? `/discovery?${search}` : '/discovery';
}

export type DiscoveryStatus =
	| { kind: 'results'; label: string }
	| { kind: 'empty'; label: string }
	| { kind: 'guide' };

/** Heading or empty line for the Discovery grid. A blank query with rows has neither. */
export function discoveryStatus(count: number, query: string, signedIn: boolean): DiscoveryStatus {
	if (query.trim()) {
		if (count === 0) return { kind: 'empty', label: 'No titles match that.' };
		return { kind: 'results', label: count === 1 ? '1 title' : `${count} titles` };
	}
	if (count === 0) {
		return { kind: 'empty', label: signedIn ? 'No titles in this view.' : 'The guide is empty.' };
	}
	return { kind: 'guide' };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec vitest run src/lib/discovery.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/discovery.ts src/lib/discovery.spec.ts
git commit -m "$(cat <<'EOF'
Replace the home search helpers with Discovery membership.

EOF
)"
```

---

### Task 2: Home counts, Up next copy, and Latest releases

**Files:**
- Create: `src/lib/home-landing.ts`
- Test: `src/lib/home-landing.spec.ts`

**Interfaces:**
- Consumes: `partitionSeason` from `src/lib/season-list.ts`, `groupHistory` from `src/lib/history-log.ts`, `latestShelfCount` from `src/lib/discovery.ts`
- Produces:
  - `homeCounts(stillToWatch: readonly unknown[], watchedThisSeason: readonly unknown[], allTime: number): { toWatch: number; thisSeason: number; allTime: number }`
  - `homeStatLabel(stat: 'toWatch' | 'thisSeason' | 'allTime', count: number): string`
  - `upNextCopy(listCount: number, stillCount: number): string | null`
  - `latestReleases<T extends { id: string }>(unwatched: readonly T[], upNextIds: ReadonlySet<string>, count?: number): T[]`

- [ ] **Step 1: Write the failing test**

Create `src/lib/home-landing.spec.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { groupHistory } from './history-log';
import { homeCounts, homeStatLabel, latestReleases, upNextCopy } from './home-landing';
import type { ListTitle } from './my-list';
import { seasonWindow } from './season';
import { partitionSeason } from './season-list';

const season = seasonWindow(2026);

const title = (id: string, watches: ListTitle['watches']): ListTitle => ({
	id,
	title: id,
	year: 2000,
	posterUrl: null,
	type: 'movie',
	watches
});

const unknown = [{ datePrecision: 'unknown' as const, watchedAt: null, watchedYear: null }];
const december = [
	{
		datePrecision: 'exact' as const,
		watchedAt: new Date('2026-12-01T12:00:00Z'),
		watchedYear: null
	}
];

describe('homeCounts', () => {
	it('counts list waiting, every this-season watch, and one history row per title', () => {
		const split = partitionSeason(
			[title('waiting', []), title('seen-on-list', unknown), title('done', december)],
			[title('extra', december)],
			season
		);
		const history = groupHistory([
			{
				mediaId: 'seen-on-list',
				title: 'seen-on-list',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2020-01-01T00:00:00Z')
			},
			{
				mediaId: 'done',
				title: 'done',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-01T00:00:00Z')
			},
			{
				mediaId: 'done',
				title: 'done',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-02T00:00:00Z')
			},
			{
				mediaId: 'extra',
				title: 'extra',
				year: 2000,
				posterUrl: null,
				createdAt: new Date('2026-12-03T00:00:00Z')
			}
		]);
		expect(split.stillToWatch.map((item) => item.id)).toEqual(['waiting', 'seen-on-list']);
		expect(split.watched.map((item) => item.id)).toEqual(['done', 'extra']);
		expect(homeCounts(split.stillToWatch, split.watched, history.length)).toEqual({
			toWatch: 2,
			thisSeason: 2,
			allTime: 3
		});
	});
});

describe('homeStatLabel', () => {
	it('uses the singular and the plural', () => {
		expect(homeStatLabel('toWatch', 1)).toBe("To watch, 1 title still on this year's list");
		expect(homeStatLabel('toWatch', 2)).toBe("To watch, 2 titles still on this year's list");
		expect(homeStatLabel('thisSeason', 1)).toBe('This season, 1 title watched');
		expect(homeStatLabel('thisSeason', 0)).toBe('This season, 0 titles watched');
		expect(homeStatLabel('allTime', 1)).toBe('All time, 1 title');
		expect(homeStatLabel('allTime', 4)).toBe('All time, 4 titles');
	});
});

describe('upNextCopy', () => {
	it('distinguishes an empty list from a finished list', () => {
		expect(upNextCopy(0, 0)).toBe('Nothing chosen for this season yet.');
		expect(upNextCopy(3, 0)).toBe('Nothing left to watch this season.');
		expect(upNextCopy(3, 2)).toBeNull();
	});
});

describe('latestReleases', () => {
	it('skips Up next ids and keeps the first dozen of what remains', () => {
		const unwatched = Array.from({ length: 14 }, (_, index) => ({ id: String(index) }));
		const picked = latestReleases(unwatched, new Set(['0', '1']));
		expect(picked).toHaveLength(12);
		expect(picked[0]?.id).toBe('2');
		expect(latestReleases(unwatched.slice(0, 3), new Set(['0']))).toEqual([{ id: '1' }, { id: '2' }]);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/home-landing.spec.ts`

Expected: FAIL because `src/lib/home-landing.ts` does not exist.

- [ ] **Step 3: Write the module**

Create `src/lib/home-landing.ts`:

```ts
import { latestShelfCount } from './discovery.js';

export interface HomeCounts {
	toWatch: number;
	thisSeason: number;
	allTime: number;
}

/** Lengths only. Callers pass Still to watch, Season's Watched set, and the History row count. */
export function homeCounts(
	stillToWatch: readonly unknown[],
	watchedThisSeason: readonly unknown[],
	allTime: number
): HomeCounts {
	return {
		toWatch: stillToWatch.length,
		thisSeason: watchedThisSeason.length,
		allTime
	};
}

export type HomeStat = 'toWatch' | 'thisSeason' | 'allTime';

export function homeStatLabel(stat: HomeStat, count: number): string {
	const titles = count === 1 ? 'title' : 'titles';
	switch (stat) {
		case 'toWatch':
			return `To watch, ${count} ${titles} still on this year's list`;
		case 'thisSeason':
			return `This season, ${count} ${titles} watched`;
		case 'allTime':
			return `All time, ${count} ${titles}`;
		default: {
			const never: never = stat;
			return never;
		}
	}
}

/** `listCount` is this year's seasonal rows only. Null when the shelf has cards. */
export function upNextCopy(listCount: number, stillCount: number): string | null {
	if (listCount === 0) return 'Nothing chosen for this season yet.';
	if (stillCount === 0) return 'Nothing left to watch this season.';
	return null;
}

/** Preserves the order it is given. Defaults to the latest-shelf cap. */
export function latestReleases<T extends { id: string }>(
	unwatched: readonly T[],
	upNextIds: ReadonlySet<string>,
	count = latestShelfCount
): T[] {
	const picked: T[] = [];
	for (const title of unwatched) {
		if (upNextIds.has(title.id)) continue;
		picked.push(title);
		if (picked.length === count) break;
	}
	return picked;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/home-landing.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/home-landing.ts src/lib/home-landing.spec.ts
git commit -m "$(cat <<'EOF'
Count the home landing from the season split and history.

EOF
)"
```

---

### Task 3: Season empty card prompt

**Files:**
- Modify: `src/lib/season-list.ts`
- Test: `src/lib/season-list.spec.ts`

**Interfaces:**
- Consumes: nothing new
- Produces: `emptySeasonPrompt(): { description: string; link: string; href: '/discovery' }`

- [ ] **Step 1: Write the failing test**

Add to `src/lib/season-list.spec.ts`:

```ts
import { emptySeasonPrompt, partitionSeason, seasonListCounts } from './season-list';

describe('emptySeasonPrompt', () => {
	it('sends an empty season to Discovery', () => {
		expect(emptySeasonPrompt()).toEqual({
			description: 'Add titles from Discovery. A new season starts empty.',
			link: 'Browse Discovery',
			href: '/discovery'
		});
	});
});
```

Keep the existing import path and add `emptySeasonPrompt` to it. Do not replace `partitionSeason` or `seasonListCounts` tests.

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/season-list.spec.ts`

Expected: FAIL because `emptySeasonPrompt` is not exported.

- [ ] **Step 3: Add the function**

Add to `src/lib/season-list.ts`:

```ts
export function emptySeasonPrompt() {
	return {
		description: 'Add titles from Discovery. A new season starts empty.',
		link: 'Browse Discovery',
		href: '/discovery' as const
	};
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `pnpm exec vitest run src/lib/season-list.spec.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/season-list.ts src/lib/season-list.spec.ts
git commit -m "$(cat <<'EOF'
Send an empty season to Discovery.

EOF
)"
```

The Season page edit is Task 5. `resolve('/discovery')` needs the route from Task 4.

---

### Task 4: Discovery tab and page

**Files:**
- Modify: `src/lib/navigation.ts`
- Test: `src/lib/navigation.spec.ts`
- Modify: `src/lib/components/tab-bar.svelte`
- Create: `src/routes/discovery/+page.server.ts`
- Create: `src/routes/discovery/+page.svelte`

**Interfaces:**
- Consumes: `discoveryGuide`, `discoveryNext`, `discoveryResults`, `discoverySeen`, `discoveryStatus`, `orderByRelease` from `src/lib/discovery.ts`; `loadGuide`, `loadSeasonYears`, `loadWatches`, `titlesFromWatches` from `src/lib/server/library.ts`; `seasonListAction` from `src/lib/server/season-entries.ts`; `activeSeasonYear` from `src/lib/season.ts`; `HomePoster`; `TickPanel`
- Produces: `discoveryTab` with `id: 'discovery'`, `label: 'Discovery'`, `href: '/discovery'`. `tabsFor(false)` is Home then Discovery. `tabsFor(true)` is Home, Discovery, Season. The page load returns `{ signedIn, seen, query, titles }`.

- [ ] **Step 1: Write the failing navigation test**

Replace the expectations in `src/lib/navigation.spec.ts`:

```ts
import { discoveryTab, homeTab, isTabActive, seasonTab, tabsFor } from './navigation';

describe('tabsFor', () => {
	it('shows Home and Discovery until the user is signed in', () => {
		expect(tabsFor(false).map((tab) => tab.label)).toEqual(['Home', 'Discovery']);
		expect(tabsFor(true).map((tab) => [tab.label, tab.href])).toEqual([
			['Home', '/'],
			['Discovery', '/discovery'],
			['Season', '/season']
		]);
	});
});

describe('isTabActive', () => {
	it('only matches Home on the root path', () => {
		expect(isTabActive(homeTab, '/')).toBe(true);
		expect(isTabActive(homeTab, '/season')).toBe(false);
		expect(isTabActive(homeTab, '/discovery')).toBe(false);
	});

	it('matches the season path', () => {
		expect(isTabActive(seasonTab, '/season')).toBe(true);
		expect(isTabActive(seasonTab, '/season/abc')).toBe(true);
		expect(isTabActive(seasonTab, '/seasonal')).toBe(false);
	});

	it('matches Discovery and not a path that only shares the prefix', () => {
		expect(isTabActive(discoveryTab, '/discovery')).toBe(true);
		expect(isTabActive(discoveryTab, '/discovery/abc')).toBe(true);
		expect(isTabActive(discoveryTab, '/discover')).toBe(false);
	});
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `pnpm exec vitest run src/lib/navigation.spec.ts`

Expected: FAIL because `discoveryTab` is not exported.

- [ ] **Step 3: Add the tab and the icon**

In `src/lib/navigation.ts`:

```ts
export const homeTab = { id: 'home', label: 'Home', href: '/' } as const;
export const discoveryTab = { id: 'discovery', label: 'Discovery', href: '/discovery' } as const;
export const seasonTab = { id: 'season', label: 'Season', href: '/season' } as const;

export function tabsFor(signedIn: boolean) {
	return signedIn ? [homeTab, discoveryTab, seasonTab] : [homeTab, discoveryTab];
}
```

Leave `isTabActive` as it is.

In `src/lib/components/tab-bar.svelte`, import `Search` from `@lucide/svelte/icons/search`. Set the icon map and the grid class:

```ts
const icons: Record<TabId, Component> = {
	home: Tv,
	discovery: Search,
	season: Snowflake
};
```

```svelte
class={cn(
	'mx-auto grid h-(--tab-bar-height) max-w-md rounded-full border border-border bg-midnight-deep/70 shadow-lg backdrop-blur-xl',
	tabs.length === 3 && 'grid-cols-3',
	tabs.length === 2 && 'grid-cols-2',
	tabs.length === 1 && 'grid-cols-1'
)}
```

- [ ] **Step 4: Run the navigation test**

Run: `pnpm exec vitest run src/lib/navigation.spec.ts`

Expected: PASS

- [ ] **Step 5: Create the Discovery server load**

Create `src/routes/discovery/+page.server.ts`:

```ts
import { activeSeasonYear } from '#lib/season.js';
import {
	type DiscoveryTitle,
	discoveryGuide,
	discoveryResults,
	discoverySeen,
	orderByRelease
} from '#lib/discovery.js';
import { loadGuide, loadSeasonYears, loadWatches, titlesFromWatches } from '#lib/server/library.js';
import { seasonListAction } from '#lib/server/season-entries.js';
import type { Actions, PageServerLoad } from './$types';

function poster(title: DiscoveryTitle, onSeason: boolean) {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		onSeason
	};
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const db = await locals.db();
	const guide = orderByRelease(await loadGuide(db));
	const query = url.searchParams.get('q') ?? '';
	if (!locals.user) {
		const titles = discoveryGuide(guide, false, false, new Set(), new Set());
		return {
			signedIn: false as const,
			seen: false,
			query,
			titles: discoveryResults(titles, query).map((title) => poster(title, false))
		};
	}

	const entries = await loadSeasonYears(db, locals.user.id);
	const watches = titlesFromWatches(await loadWatches(db, locals.user.id));
	const year = activeSeasonYear();
	const seasonIds = new Set(
		entries.filter((entry) => entry.seasonYear === year).map((entry) => entry.mediaId)
	);
	const watchedIds = new Set(watches.keys());
	const seen = discoverySeen(true, url.searchParams.get('seen'));
	const titles = discoveryGuide(guide, true, seen, watchedIds, seasonIds);
	return {
		signedIn: true as const,
		seen,
		query,
		titles: discoveryResults(titles, query).map((title) => poster(title, seasonIds.has(title.id)))
	};
};

export const actions = {
	add: (event) => seasonListAction(true, event),
	remove: (event) => seasonListAction(false, event)
} satisfies Actions;
```

`loadGuide` already drops `nonRelated` and orders by year. `orderByRelease` keeps that order if the query changes. Do not add a cap.

- [ ] **Step 6: Create the Discovery page**

Create `src/routes/discovery/+page.svelte`:

```svelte
<script lang="ts">
	import Search from '@lucide/svelte/icons/search';
	import HomePoster from '#lib/components/home-poster.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import { discoveryNext, discoveryStatus } from '#lib/discovery.js';
	import { goto } from '$app/navigation';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
	let typed = $state<string | null>(null);

	const query = $derived(typed ?? data.query);
	const status = $derived(discoveryStatus(data.titles.length, data.query, data.signedIn));
	const panelNext = $derived(discoveryNext(query, data.seen));

	function onsearch(value: string) {
		typed = value;
		const target = discoveryNext(value, data.seen);
		const search = target.includes('?') ? target.slice(target.indexOf('?')) : '';
		void goto(`${resolve('/discovery')}${search}`, {
			replaceState: true,
			keepFocus: true,
			noScroll: true
		});
	}
</script>

<svelte:head><title>Discovery · Christmas Watch List</title></svelte:head>

<div class="space-y-8">
	<div class="space-y-3">
		<h2 class="text-2xl font-bold tracking-tight">Discovery</h2>
		<form method="GET" action={resolve('/discovery')}>
			{#if data.seen}
				<input type="hidden" name="seen" value="1">
			{/if}
			<label class="sr-only" for="discovery-search">Search titles</label>
			<div class="relative">
				<Search
					class="text-muted-foreground pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2"
				/>
				<input
					id="discovery-search"
					name="q"
					type="search"
					placeholder="Search titles"
					value={query}
					oninput={(event) => onsearch(event.currentTarget.value)}
					class="border-border bg-midnight-deep/70 h-11 w-full rounded-full border pr-4 pl-11 text-base backdrop-blur-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
				>
			</div>
		</form>
		{#if data.signedIn}
			<form method="GET" action={resolve('/discovery')}>
				{#if query.trim()}
					<input type="hidden" name="q" value={query.trim()}>
				{/if}
				{#if !data.seen}
					<input type="hidden" name="seen" value="1">
				{/if}
				<button
					type="submit"
					aria-pressed={data.seen}
					class="border-border inline-flex min-h-11 items-center rounded-full border px-4 text-sm font-medium"
				>
					{data.seen ? 'Showing seen' : 'Show seen'}
				</button>
			</form>
		{/if}
	</div>

	{#if status.kind === 'results'}
		<h3 class="text-lg font-bold tracking-tight">{status.label}</h3>
	{/if}
	{#if status.kind === 'empty'}
		<p class="text-sm text-muted-foreground">{status.label}</p>
	{:else}
		<ul class="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
			{#each data.titles as item, index (item.id)}
				<li>
					<HomePoster
						{item}
						{index}
						layout="grid"
						signedIn={data.signedIn}
						ontick={() => panel?.open(item)}
					/>
				</li>
			{/each}
		</ul>
	{/if}
</div>

{#if data.signedIn}
	<TickPanel bind:this={panel} next={panelNext} />
{/if}
```

`goto` writes `q` into the address as the person types, so add and remove — which redirect to `pathname + search` — come back to the same search. The tick panel uses `discoveryNext` with the typed query, so mark watched comes back to that search even if the load has not finished. `resolve` does not take a query string; append only the `?` portion of `discoveryNext`.

The result heading uses `data.query` and `data.titles`, so it stays with the grid. The input uses `typed`. Do not filter again on the client.

- [ ] **Step 7: Commit**

```bash
git add src/lib/navigation.ts src/lib/navigation.spec.ts src/lib/components/tab-bar.svelte src/routes/discovery
git commit -m "$(cat <<'EOF'
Open the guide on its own Discovery tab.

EOF
)"
```

---

### Task 5: Point the Season empty card at Discovery

**Files:**
- Modify: `src/routes/season/+page.svelte`

**Interfaces:**
- Consumes: `emptySeasonPrompt()` from Task 3, and the `/discovery` route from Task 4
- Produces: the empty Season card description and link

- [ ] **Step 1: Use the prompt in the empty card**

In `src/routes/season/+page.svelte`, import `emptySeasonPrompt` from `#lib/season-list.js`. Inside the script, add `const prompt = emptySeasonPrompt();`.

Replace the empty-card description and link. Leave the title "Nothing chosen for this season yet". Leave the Still to watch and Watched empty lines inside the list card alone.

`resolve` needs a route literal, so the href in the template is `resolve('/discovery')`. That literal must stay equal to `prompt.href`.

```svelte
<Card.Description>{prompt.description}</Card.Description>
```

```svelte
<a
	href={resolve('/discovery')}
	class="text-gold inline-flex min-h-11 items-center text-sm font-medium"
>
	{prompt.link}
</a>
```

- [ ] **Step 2: Commit**

```bash
git add src/routes/season/+page.svelte
git commit -m "$(cat <<'EOF'
Point the empty season card at Discovery.

EOF
)"
```

---

### Task 6: Home landing page

**Files:**
- Modify: `src/routes/+page.server.ts`
- Modify: `src/routes/+page.svelte`

**Interfaces:**
- Consumes: `homeCounts`, `homeStatLabel`, `latestReleases`, `upNextCopy` from `src/lib/home-landing.ts`; `filterDiscovery`, `orderByRelease`, `takeLatest` from `src/lib/discovery.ts`; `partitionSeason` from `src/lib/season-list.ts`; `groupHistory` from `src/lib/history-log.ts`; `historyEvents`, `loadGuide`, `loadSeasonYears`, `loadWatches`, `titlesFromWatches` from `src/lib/server/library.ts`; `activeSeasonYear`, `seasonWindow` from `src/lib/season.ts`; `seasonListAction`
- Produces: signed-out load `{ signedIn: false, latest }`. Signed-in load `{ signedIn: true, counts, upNext, upNextMessage, latest }`. Home does not read `q` or `seen`.

- [ ] **Step 1: Replace the Home load**

Replace `src/routes/+page.server.ts` with:

```ts
import {
	type DiscoveryTitle,
	filterDiscovery,
	orderByRelease,
	takeLatest
} from '#lib/discovery.js';
import { groupHistory } from '#lib/history-log.js';
import { homeCounts, latestReleases, upNextCopy } from '#lib/home-landing.js';
import type { ListTitle } from '#lib/my-list.js';
import { activeSeasonYear, seasonWindow } from '#lib/season.js';
import { partitionSeason } from '#lib/season-list.js';
import {
	historyEvents,
	loadGuide,
	loadSeasonYears,
	loadWatches,
	titlesFromWatches
} from '#lib/server/library.js';
import { seasonListAction } from '#lib/server/season-entries.js';
import type { Actions, PageServerLoad } from './$types';

function poster(
	title: {
		id: string;
		title: string;
		year: number | null;
		posterUrl: string | null;
		type: DiscoveryTitle['type'];
	},
	onSeason: boolean
) {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		onSeason
	};
}

function asList(title: DiscoveryTitle): ListTitle {
	return {
		id: title.id,
		title: title.title,
		year: title.year,
		posterUrl: title.posterUrl,
		type: title.type,
		watches: []
	};
}

export const load: PageServerLoad = async ({ locals }) => {
	const db = await locals.db();
	const guide = orderByRelease(await loadGuide(db));
	if (!locals.user) {
		return {
			signedIn: false as const,
			latest: takeLatest(guide).map((title) => poster(title, false))
		};
	}

	const entries = await loadSeasonYears(db, locals.user.id);
	const stored = await loadWatches(db, locals.user.id);
	const watches = titlesFromWatches(stored);
	const year = activeSeasonYear();
	const seasonIds = new Set(
		entries.filter((entry) => entry.seasonYear === year).map((entry) => entry.mediaId)
	);
	const watchedIds = new Set(watches.keys());
	const listed = guide
		.filter((title) => seasonIds.has(title.id))
		.map((title) => watches.get(title.id) ?? asList(title));
	const others = [...watches.values()].filter((title) => !seasonIds.has(title.id));
	const split = partitionSeason(listed, others, seasonWindow(year));
	const upNextIds = new Set(split.stillToWatch.map((title) => title.id));
	const unwatched = filterDiscovery(guide, false, watchedIds, seasonIds);
	return {
		signedIn: true as const,
		counts: homeCounts(split.stillToWatch, split.watched, groupHistory(historyEvents(stored)).length),
		upNext: split.stillToWatch.map((title) => poster(title, true)),
		upNextMessage: upNextCopy(listed.length, split.stillToWatch.length),
		latest: latestReleases(unwatched, upNextIds).map((title) => poster(title, false))
	};
};

export const actions = {
	add: (event) => seasonListAction(true, event),
	remove: (event) => seasonListAction(false, event)
} satisfies Actions;
```

The load takes no `url`. A visit to `/?q=` or `/?seen=1` renders the normal landing. Up next is `split.stillToWatch`, which follows guide order: latest release year first, then title. It is not capped. Latest releases drops those ids and then takes 12. Titles on the latest shelf are not on the still-to-watch list, so `onSeason` is false.

- [ ] **Step 2: Replace the Home page**

Replace `src/routes/+page.svelte` with:

```svelte
<script lang="ts">
	import HomePoster from '#lib/components/home-poster.svelte';
	import TickPanel from '#lib/components/tick-panel.svelte';
	import { homeStatLabel } from '#lib/home-landing.js';
	import { resolve } from '$app/paths';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
	let panel = $state<TickPanel | undefined>();
</script>

<svelte:head><title>Home · Christmas Watch List</title></svelte:head>

<div class="space-y-8">
	{#if data.signedIn}
		<section class="grid grid-cols-3 gap-2 rounded-3xl border border-border bg-midnight-deep/70 p-4 shadow-lg backdrop-blur-xl">
			<a
				href="{resolve('/season')}#season-still"
				aria-label={homeStatLabel('toWatch', data.counts.toWatch)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.toWatch}</span>
				<span class="text-xs font-medium text-muted-foreground">To watch</span>
			</a>
			<a
				href="{resolve('/season')}#season-watched"
				aria-label={homeStatLabel('thisSeason', data.counts.thisSeason)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.thisSeason}</span>
				<span class="text-xs font-medium text-muted-foreground">This season</span>
			</a>
			<a
				href={resolve('/history')}
				aria-label={homeStatLabel('allTime', data.counts.allTime)}
				class="flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl text-center"
			>
				<span class="text-2xl font-black tracking-tight">{data.counts.allTime}</span>
				<span class="text-xs font-medium text-muted-foreground">All time</span>
			</a>
		</section>

		<section class="space-y-3" aria-labelledby="home-next">
			<h3 id="home-next" class="text-lg font-bold tracking-tight">Up next</h3>
			{#if data.upNextMessage}
				<p class="text-sm text-muted-foreground">{data.upNextMessage}</p>
			{:else}
				<ul class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:-mx-8 md:px-8">
					{#each data.upNext as item, index (item.id)}
						<li class="shrink-0">
							<HomePoster
								{item}
								{index}
								signedIn={data.signedIn}
								ontick={() => panel?.open(item)}
							/>
						</li>
					{/each}
				</ul>
			{/if}
			<a href={resolve('/season')} class="text-gold inline-flex min-h-11 items-center text-sm font-medium">
				Open Season
			</a>
		</section>
	{/if}

	<section class="space-y-3" aria-labelledby="home-latest">
		<h3 id="home-latest" class="text-lg font-bold tracking-tight">Latest releases</h3>
		{#if data.latest.length === 0}
			<p class="text-sm text-muted-foreground">
				{data.signedIn ? 'Nothing new in this view.' : 'The guide is empty.'}
			</p>
		{:else}
			<ul class="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 snap-x snap-mandatory md:-mx-8 md:px-8">
				{#each data.latest as item, index (item.id)}
					<li class="shrink-0">
						<HomePoster
							{item}
							{index}
							signedIn={data.signedIn}
							ontick={() => panel?.open(item)}
						/>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
</div>

{#if data.signedIn}
	<TickPanel bind:this={panel} next="/" />
{/if}
```

The hash is outside `resolve` because `resolve` takes a route id. `/season#season-still` still opens Season when the empty card is showing and those headings are absent. Mark watched on this page returns to `/`.

- [ ] **Step 3: Confirm nothing still imports the deleted helpers**

Run: `pnpm exec vitest run src/lib/discovery.spec.ts src/lib/home-landing.spec.ts src/lib/navigation.spec.ts src/lib/season-list.spec.ts`

Expected: PASS. If another file still imports `homeListCopy` or `homeNext`, the check in Task 7 will fail; delete that import. The only previous callers were `src/routes/+page.svelte` and `src/lib/discovery.spec.ts`.

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.server.ts src/routes/+page.svelte
git commit -m "$(cat <<'EOF'
Turn Home into counts, Up next, and Latest releases.

EOF
)"
```

---

### Task 7: Record the map and verify

**Files:**
- Modify: `AGENTS.md`
- Modify: `.cursor/rules/scope-mvp.mdc`
- Modify: `docs/product-roadmap.md`
- Modify: `docs/superpowers/specs/2026-10-22-home-landing-design.md` (status line only)

**Interfaces:**
- Consumes: the pages from Tasks 4 and 5
- Produces: docs that name Home, Discovery, Season, and History

- [ ] **Step 1: Update the baseline text**

In `AGENTS.md`, replace the numbered baseline items 1–3 with:

```md
1. **Home** (`/`) — three counts for a signed-in person (to watch, watched this season, watched all time), an Up next shelf, and Latest releases. Signed out, Latest releases is look-only.
2. **Discovery** (`/discovery`) — the Christmas and adjacent guide. Search and Show seen live here. Signed out this is look-only.
3. **Season** (`/season`, signed in) — this year's `season_entries` list, split into still to watch and watched. `/my-list` redirects here.
4. **History** (`/history`, signed in, opened from the profile control) — watch log with a count per title. The Watched panel records here. `/watched` and `/tick` redirect here.
```

Renumber the old items 4–6 to 5–7. Do not change their sentences.

Replace the learned preference and workspace fact:

```md
- The approved navigation is Home, Discovery, and Season. Discovery is `/discovery`, the guide. History stays in the profile control. My List folds into Season. The Watched tab stays off the bar. The earlier Home / Discover / My Lists / You proposal stays rejected.
- Signed-out Home and Discovery are look-only. Season, History, and list or watch actions appear after sign-in. No on-device queue for the seasonal list, and no mandatory onboarding questions.
```

```md
- Home shows three counts (To watch, This season, All time), an Up next shelf of this season's still-to-watch titles with Open Season under the cards, and a sideways shelf of the latest dozen releases. Search and Show seen live on Discovery. Add and Mark watched stay on the poster. `season_entries` is one row per user, title, and season year (D25, D26). Existing favourite rows are not copied into that list.
```

In `.cursor/rules/scope-mvp.mdc`, replace the first paragraph under the heading with:

```md
The shipped surfaces are **Home**, **Discovery**, **Season**, and **History** (D26). Home is the landing. Discovery at `/discovery` is the guide. Season is this year's list. History is the lifetime watch log, opened from the profile control. `/my-list` redirects to `/season`. `/watched` and `/tick` redirect to `/history`. Preserve these unless a later slice explicitly revises them.
```

In `docs/product-roadmap.md`, replace the current-baseline sentence with:

```md
SvelteKit on Cloudflare Workers, sign-in, migrated Christmas catalogue, Home / Discovery / Season / History, watch events, and a per-year seasonal list. History is opened from the profile control. `/watched` and `/tick` redirect to `/history`. Technical and cost constraints remain in AGENTS.md and docs/decisions.md.
```

In `docs/superpowers/specs/2026-10-22-home-landing-design.md`, set the status line to:

```md
**Status:** agreed for a first build. The plan is `docs/superpowers/plans/2026-10-22-home-landing.md`. Browser review may revise the layout. The rules below are the slice to build.
```

- [ ] **Step 2: Run the project check**

Run: `pnpm check`

Expected: format, lint, typecheck, and tests all pass. Fix formatting with `pnpm format` if the check reports format only, then re-run `pnpm check`.

- [ ] **Step 3: Browser pass**

With `pnpm dev` already running, walk these paths. A signed-in pass needs a real session. If sign-in is not available, say which signed-in rows were not exercised.

Signed out:

- `/` shows Latest releases only. No counts, no Up next, no search field. Posters have no add or mark-watched controls. The header still has Sign in.
- The tab bar is Home and Discovery.
- `/discovery` shows the guide grid and the search field. Typing a title updates the address with `q` and narrows the grid. There is no Show seen control.
- `/discovery?seen=1` while signed out still shows the guide, not the seen subset.
- A query with no match reads "No titles match that."
- `/season` redirects to sign-in.

Signed in:

- `/` shows To watch, This season, and All time, including a 0. The accessible names match `homeStatLabel`. To watch opens Season at Still to watch. This season opens Season at Watched. All time opens History.
- Up next lists only still-to-watch titles. Open Season is under the cards. An empty list reads "Nothing chosen for this season yet." A finished list reads "Nothing left to watch this season." The link stays in both cases.
- A title in Up next does not also appear in Latest releases.
- Home has no search field. `/?q=elf` does not filter Home.
- `/discovery` search keeps `q` after adding a title and after marking one watched. Show seen toggles with the address. Adding a title does not mark it watched.
- Season's empty card reads "Add titles from Discovery. A new season starts empty." and its link is Browse Discovery. The inner "Nothing left to watch this season." and "Nothing watched in this season yet." lines are unchanged.

- [ ] **Step 4: Commit**

```bash
git add AGENTS.md .cursor/rules/scope-mvp.mdc docs/product-roadmap.md docs/superpowers/specs/2026-10-22-home-landing-design.md docs/superpowers/plans/2026-10-22-home-landing.md
git commit -m "$(cat <<'EOF'
Record Home as the landing and Discovery as the guide.

EOF
)"
```

Include any source files the check formatted. Do not commit `.dev.vars` or other secrets.
