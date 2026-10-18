import type { AppData, BookmarkNode, Layout } from './types'
import { emptyData } from './coordinator'
import { sizeOf } from './layout'

const link = (id: string, title: string, url: string): BookmarkNode => ({ id, title, url })
const folder = (id: string, title: string, children: BookmarkNode[], folderType?: string): BookmarkNode => ({ id, title, children, folderType })
export function demoTree(): BookmarkNode[] {
  return [folder('root', '', [
    folder('bar', 'Bookmarks bar', [
      link('figma', 'Figma', 'https://www.figma.com/'),
      link('linear', 'Linear', 'https://linear.app/'),
      link('github', 'GitHub', 'https://github.com/'),
      link('notion', 'Notion', 'https://www.notion.so/'),
      link('gmail', 'Gmail', 'https://mail.google.com/'),
      folder('work', 'Work', [
        link('slack', 'Slack', 'https://slack.com/'),
        link('drive', 'Google Drive', 'https://drive.google.com/'),
        link('calendar', 'Calendar', 'https://calendar.google.com/'),
        link('meet', 'Google Meet', 'https://meet.google.com/'),
      ]),
      folder('inspiration', 'Inspiration', [
        link('pinterest', 'Pinterest', 'https://pinterest.com/'),
        link('arena', 'Are.na', 'https://www.are.na/'),
        link('dribbble', 'Dribbble', 'https://dribbble.com/'),
        link('behance', 'Behance', 'https://www.behance.net/'),
        link('layers', 'Layers', 'https://layers.to/'),
      ]),
      folder('learning', 'Learning', [
        link('mdn', 'MDN Web Docs', 'https://developer.mozilla.org/'),
        link('svelte', 'Svelte', 'https://svelte.dev/'),
        link('typescript', 'TypeScript', 'https://www.typescriptlang.org/'),
        link('tailwind', 'Tailwind CSS', 'https://tailwindcss.com/'),
        folder('tools', 'Tools', [
          link('storybook', 'Storybook', 'https://storybook.js.org/'),
          link('snapgrid', 'Snapgrid', 'https://snapgrid.dev/'),
        ]),
      ]),
    ], 'bookmarks-bar'),
    folder('other', 'Other bookmarks', [
      link('youtube', 'YouTube', 'https://www.youtube.com/'),
      link('spotify', 'Spotify', 'https://open.spotify.com/'),
      link('wikipedia', 'Wikipedia', 'https://www.wikipedia.org/'),
      link('unsplash', 'Unsplash', 'https://unsplash.com/'),
    ], 'other'),
    folder('mobile', 'Mobile bookmarks', [], 'mobile'),
  ])]
}
const item = (i: string, x: number, y: number, w: number, h: number) => ({ i, x, y, w, h })
export function demoData(): AppData {
  const layouts: Record<string, Layout> = {
    bar: [item('figma', 0, 0, 4, 4), item('linear', 4, 0, 2, 2), item('github', 4, 2, 2, 2), item('notion', 0, 4, 2, 2), item('gmail', 2, 4, 4, 2)],
    work: [item('slack', 0, 0, 4, 2), item('drive', 0, 2, 2, 2), item('calendar', 2, 2, 2, 2), item('meet', 0, 4, 4, 2)],
    inspiration: [item('pinterest', 0, 0, 4, 4), item('arena', 4, 0, 2, 2), item('dribbble', 4, 2, 2, 2), item('behance', 0, 4, 4, 2), item('layers', 4, 4, 2, 2)],
    learning: [item('mdn', 0, 0, 4, 2), item('svelte', 0, 2, 2, 2), item('typescript', 2, 2, 2, 2), item('tailwind', 0, 4, 4, 2)],
    tools: [item('storybook', 0, 0, 2, 2), item('snapgrid', 0, 2, 2, 2)],
    other: [item('youtube', 0, 0, 4, 2), item('spotify', 0, 2, 2, 2), item('wikipedia', 2, 2, 2, 2), item('unsplash', 0, 4, 4, 2)],
  }
  return { ...emptyData(), layouts, appearance: Object.fromEntries(Object.values(layouts).flatMap(layout => layout.map(entry => [entry.i, { size: sizeOf(entry) }]))) }
}
