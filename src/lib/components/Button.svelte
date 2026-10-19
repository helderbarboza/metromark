<script lang='ts'>
  import type { Snippet } from 'svelte'
  import type { HTMLButtonAttributes } from 'svelte/elements'

  type Variant = 'primary' | 'danger'

  interface Props extends HTMLButtonAttributes {
    variant?: Variant
    children: Snippet
  }

  const {
    variant,
    children,
    class: className = '',
    type = 'button',
    ...rest
  }: Props = $props()

  const classes = $derived(['button', variant, className].filter(Boolean).join(' '))
</script>

<button
  class={classes}
  {type}
  {...rest}
>
  {@render children()}
</button>

<style>
  .button {
    height: 42px;
    padding: 0 17px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    font-size: 12px;
    font-weight: 550;
    border: 1px solid var(--line);
    border-radius: 5px;
    background: var(--surface);
    color: var(--text);
    transition: background 140ms;
    white-space: nowrap;
  }
  .button:hover {
    background: var(--surface-hover);
  }
  .button.primary {
    background: var(--accent);
    border-color: var(--accent);
    color: var(--accent-ink);
  }
  .button.primary:hover {
    filter: brightness(1.06);
  }
  .button.danger {
    background: #7c302f;
    border-color: #954541;
    color: #fff;
  }
  .button:disabled {
    opacity: .45;
  }
</style>
