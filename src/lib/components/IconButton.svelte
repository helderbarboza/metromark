<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  interface Props extends Omit<HTMLButtonAttributes, 'aria-label'> {
    label: string
    children: Snippet
    class?: string
  }

  const {
    label,
    children,
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props()

  const classes = $derived(['icon-button', className].filter(Boolean).join(' '))
</script>

<button
  class={classes}
  aria-label={label}
  {type}
  {...rest}
>
  {@render children()}
</button>

<style>
  .icon-button {
    width: 38px;
    height: 38px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--muted);
    border: 1px solid transparent;
    border-radius: 6px;
  }
  .icon-button:hover {
    color: var(--text);
    background: var(--surface-hover);
  }
</style>
