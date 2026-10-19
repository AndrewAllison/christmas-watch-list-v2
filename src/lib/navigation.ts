export const tabs = [
	{ id: 'browse', label: 'Browse', href: '/' },
	{ id: 'my-list', label: 'My List', href: '/my-list' },
	{ id: 'tick', label: 'Tick', href: '/tick' },
	{ id: 'season', label: 'Season', href: '/season' }
] as const;

export type Tab = (typeof tabs)[number];
export type TabId = Tab['id'];

export function isTabActive(tab: Tab, pathname: string): boolean {
	if (tab.href === '/') return pathname === '/';
	return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
