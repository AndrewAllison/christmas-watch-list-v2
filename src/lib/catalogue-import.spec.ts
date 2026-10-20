import { describe, expect, it } from 'vitest';
import { mapV1Media, summariseImports, type V1MediaRow } from './catalogue-import';

const row = (over: Partial<V1MediaRow> = {}): V1MediaRow => ({
	id: '11111111-1111-1111-1111-111111111111',
	title: 'Elf',
	year: 2003,
	description: 'Buddy',
	poster_url: 'https://image.tmdb.org/t/p/w342/elf.jpg',
	backdrop_url: null,
	source_ids: { tmdb: 10719 },
	genres: ['Comedy', 'Family'],
	runtime: 97,
	imdb_id: 'tt0319343',
	type: 'movie',
	holiday_relevance: 'christmas',
	visibility_status: 'visible',
	hidden: false,
	approval_status: 'approved',
	...over
});

describe('mapV1Media', () => {
	it('keeps an approved visible Christmas title and its V1 id', () => {
		const mapped = mapV1Media(row());
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;
		expect(mapped.row.id).toBe(row().id);
		expect(mapped.row.sourceIds).toEqual({ tmdb: 10719, imdb: 'tt0319343' });
		expect(mapped.row.holidayRelevance).toBe('christmas');
	});

	it('accepts a string TMDB id', () => {
		const mapped = mapV1Media(row({ source_ids: { tmdb: '10719' }, imdb_id: null }));
		expect(mapped.ok).toBe(true);
		if (!mapped.ok) return;
		expect(mapped.row.sourceIds).toEqual({ tmdb: 10719 });
	});

	it('skips anything the public guide would not show', () => {
		expect(mapV1Media(row({ hidden: true })).ok).toBe(false);
		expect(mapV1Media(row({ approval_status: 'pending' }))).toMatchObject({
			ok: false,
			reason: 'not-approved'
		});
		expect(mapV1Media(row({ visibility_status: 'deleted' }))).toMatchObject({
			ok: false,
			reason: 'not-visible'
		});
		expect(mapV1Media(row({ holiday_relevance: 'tradition' }))).toMatchObject({
			ok: false,
			reason: 'relevance',
			detail: 'tradition'
		});
		expect(mapV1Media(row({ holiday_relevance: null }))).toMatchObject({
			ok: false,
			detail: 'null'
		});
		expect(mapV1Media(row({ type: 'episode' }))).toMatchObject({ ok: false, reason: 'type' });
		expect(mapV1Media(row({ source_ids: {} }))).toMatchObject({
			ok: false,
			reason: 'missing-tmdb'
		});
	});
});

describe('summariseImports', () => {
	it('counts ready rows and skip reasons', () => {
		const summary = summariseImports([
			mapV1Media(row()),
			mapV1Media(row({ id: '2', holiday_relevance: 'adjacent' })),
			mapV1Media(row({ holiday_relevance: 'nonRelated' })),
			mapV1Media(row({ holiday_relevance: null }))
		]);
		expect(summary.ready).toBe(2);
		expect(summary.skipped).toEqual({ 'relevance:nonRelated': 1, 'relevance:null': 1 });
	});
});
