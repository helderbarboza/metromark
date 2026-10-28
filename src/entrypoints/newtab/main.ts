import { createNativeClient } from '$lib/adapters/native'
import { mount } from 'svelte'
import App from '../../App.svelte'
import '../../styles.css'

mount(App, { target: document.getElementById('app')!, props: { client: createNativeClient() } })
