export const homeTab = { id: 'home', label: 'Home', href: '/' } as const;
export const discoveryTab = { id: 'discovery', label: 'Discovery', href: '/discovery' } as const;
export const seasonTab = { id: 'season', label: 'Season', href: '/season' } as const;

export function tabsFor(signedIn: boolean) {
	return signedIn ? [homeTab, discoveryTab, seasonTab] : [homeTab, discoveryTab];
}

export type Tab = ReturnType<typeof tabsFor>[number];
export type TabId = Tab['id'];

export function isTabActive(tab: Tab, pathname: string): boolean {
	if (tab.href === '/') return pathname === '/';
	return pathname === tab.href || pathname.startsWith(`${tab.href}/`);
}
