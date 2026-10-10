<script lang="ts">
  import type { Notice } from '../types';
  import Icon from './Icon.svelte';
  let { notice, onundo, onclose }: { notice: Notice; onundo?: () => void; onclose: () => void } = $props();
</script>
<div class="toast" class:error={notice.tone === 'error'}>
  <span class="toast-icon"><Icon name={notice.tone === 'error' ? 'close' : 'check'} size={16} /></span>
  <span class="toast-message" role="status" aria-live="polite">{notice.message}</span>
  {#if onundo}<button class="undo-button" onclick={onundo}><Icon name="undo" size={14} />Undo</button>{/if}
  <button class="icon-button toast-close" aria-label="Dismiss notification" onclick={onclose}><Icon name="close" size={14} /></button>
</div>
<style>
  .toast { position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; max-width: calc(100vw - 32px); padding: 11px 12px 11px 16px; border: 1px solid var(--line); background: var(--surface); color: var(--text); border-radius: 6px; box-shadow: var(--shadow); z-index: 80; }
  .toast-icon { color: #99b594; display: flex; }
  .toast.error .toast-icon { color: var(--danger); }
  .toast-message { font-size: 11px; line-height: 1.6; max-width: 420px; }
  .undo-button { display: flex; align-items: center; gap: 6px; border-left: 1px solid var(--line); padding: 0 13px 0 16px; margin-left: 4px; background: transparent; color: var(--accent); font-size: 11px; height: 26px; white-space: nowrap; }
  .toast-close { width: 25px; height: 25px; flex-shrink: 0; }
</style>
