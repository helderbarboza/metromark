import { mount } from 'svelte'
import App from './App.svelte'
import { createPreviewClient } from './lib/adapters/preview'
import { loadSettings } from './lib/config'
import './styles.css'

const settings = loadSettings()
mount(App, { target: document.getElementById('app')!, props: { client: createPreviewClient(settings) } })
