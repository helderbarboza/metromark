import { mount } from 'svelte'
import App from './App.svelte'
import { createPreviewClient } from './lib/adapters/preview'
import './styles.css'

mount(App, { target: document.getElementById('app')!, props: { client: createPreviewClient() } })
