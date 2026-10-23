import { describe, expect, it } from 'vitest';
import { groupHistory } from './history-log';

describe('groupHistory', () => {
	it('counts every event and orders by the latest created_at', () => {
		const rows = groupHistory([
			{
				mediaId: 'a',
				title: 'Arthur',
				year: 2011,
				posterUrl: null,
				createdAt: new Date('2020-01-01T00:00:00Z')
			},
			{
				mediaId: 'b',
				title: 'Love Actually',
				year: 2003,
				posterUrl: null,
				createdAt: new Date('2024-01-01T00:00:00Z')
			},
			{
				mediaId: 'a',
				title: 'Arthur',
				year: 2011,
				posterUrl: null,
				createdAt: new Date('2025-01-01T00:00:00Z')
			}
		]);
		expect(rows.map((row) => [row.id, row.count])).toEqual([
			['a', 2],
			['b', 1]
		]);
	});
});
