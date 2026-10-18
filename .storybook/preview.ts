import type { Preview } from '@storybook/svelte'
import '../src/styles.css'

const preview: Preview = {
  parameters: {
    layout: 'centered',
    backgrounds: { options: { midnight: { name: 'Midnight', value: '#101216' }, paper: { name: 'Paper', value: '#eeece8' } } },
    a11y: { test: 'error', config: { rules: [{ id: 'region', enabled: false }] } },
  },
  initialGlobals: { backgrounds: { value: 'midnight' } },
}
export default preview
