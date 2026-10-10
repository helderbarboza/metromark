import { test as base, expect } from '@playwright/test';
import type { Page } from '@playwright/test';
import type { AppData, BookmarkNode } from '../src/lib/types';

export const test = base.extend<{ noPageErrors: void }>({
  noPageErrors: [async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use();
    expect(errors, 'No unhandled browser exceptions, including dialog-close regressions').toEqual([]);
  }, { auto: true }],
});
export { expect };
export const group = (page: Page, title: string) => page.locator('.metro-group').filter({ has: page.getByRole('heading', { name: title, exact: true }) });
export const link = (page: Page, title: string) => page.getByRole('link', { name: new RegExp('^Open ' + title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '(?:$| )') });
export const draggable = (page: Page, id: string) => page.locator(`button[data-grid-id="${id}"]`);
export const presentation = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('metro.preview.presentation.v1') ?? '{}')) as Promise<AppData>;
export const tree = (page: Page) => page.evaluate(() => JSON.parse(localStorage.getItem('metro.preview.bookmarks.v1') ?? '[]')) as Promise<BookmarkNode[]>;
export function flat(nodes: BookmarkNode[]): BookmarkNode[] { return nodes.flatMap((node) => [node, ...flat(node.children ?? [])]); }
export async function start(page: Page) { await page.goto('/'); await expect(link(page, 'Figma')).toBeVisible(); }
export async function rightClick(page: Page, title: string) { await link(page, title).click({ button: 'right' }); }
