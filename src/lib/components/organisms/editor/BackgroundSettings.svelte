<script lang='ts'>
  import type { ImageBackgroundSettings, Settings, ShaderBackgroundSettings } from '$lib/config'

  import {
    clampDimensions,
    isDataImageUri,
    isMediaKey,
    validateBackgroundUrl,
    validateUploadFile,
  } from '$lib/background-image'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { Slider } from '$lib/components/ui/slider'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { deleteBackgroundMedia, saveBackgroundMedia } from '$lib/media-store'
  import { getSettingsContext } from '$lib/settings-context'
  import { NONE_SHADER_ID, shaders } from '$lib/shaders'
  import { BENCHMARK_LEVELS } from '$lib/shaders/benchmark'
  import { BENCHMARK_PRESENTATION } from '$lib/shaders/benchmark-ui'
  import {
    cancelShaderBenchmarks,
    runShaderBenchmarks,
    shaderBenchmark,
  } from '$lib/shaders/benchmark.svelte'
  import { shaderMetrics } from '$lib/shaders/metrics.svelte'
  import { levelFps, levelFrame, levelWorst } from '$lib/shaders/quality'
  import BaseColorMode from '../../molecules/BaseColorMode.svelte'
  import CollapsibleSection from '../../molecules/CollapsibleSection.svelte'
  import SettingsRow from '../../molecules/SettingsRow.svelte'
  import ShaderThumb from '../../molecules/ShaderThumb.svelte'

  type BackgroundType = Settings['background']['type']
  const BACKGROUND_TYPES = ['color', 'image', 'shader'] as const satisfies readonly BackgroundType[]
  const BACKGROUND_TYPE_LABELS: Record<BackgroundType, string> = {
    color: 'Color',
    image: 'Image',
    shader: 'Shader',
  }
  const SHADERS = Object.values(shaders)
  const IMAGE_FITS = ['cover', 'contain', 'fill', 'none'] as const

  // The provider (SettingsDialog) owns the values; the closure stays reactive.
  const ctx = getSettingsContext()
  const settings = $derived(ctx().settings)
  const busy = $derived(ctx().busy)
  const onchange = (patch: Partial<Settings>) => ctx().update(patch)

  const nonePressed = $derived(
    settings.background.type === 'shader' && settings.background.shaderId === NONE_SHADER_ID,
  )
  const currentBenchmarkName = $derived(
    shaderBenchmark.currentShaderId === null
      ? null
      : (SHADERS.find(shader => shader.id === shaderBenchmark.currentShaderId)?.name ?? null),
  )

  const autoColor = $derived(
    settings.background.type === 'color' ? settings.background.auto !== false : true,
  )

  function isBackgroundType(value: string): value is BackgroundType {
    return BACKGROUND_TYPES.some(type => type === value)
  }

  function selectBackground(type: BackgroundType) {
    if (settings.background.type === type)
      return
    // Replace the whole variant so the object shape matches the new `type`.
    onchange({ background: { ...BACKGROUND_DEFAULTS[type] } })
  }

  function setColorMode(auto: boolean, color?: string) {
    if (settings.background.type !== 'color')
      return
    onchange({ background: { ...settings.background, auto, color } })
  }

  function updateShader(patch: Partial<ShaderBackgroundSettings>) {
    if (settings.background.type !== 'shader')
      return
    onchange({ background: { ...settings.background, ...patch } })
  }

  function updateImage(patch: Partial<ImageBackgroundSettings>) {
    if (settings.background.type !== 'image')
      return
    onchange({ background: { ...settings.background, ...patch } })
  }

  // Draft state keeps the sliders responsive while settings changes round-trip
  // through the async command queue. The parent owns the persisted values;
  // these mirror what the user sees while dragging. A closure captures the
  // mount-time value on purpose; the effect below keeps them in sync after.
  const initialShader = () =>
    settings.background.type === 'shader' ? settings.background : undefined
  let speedDraft = $state(initialShader()?.speed ?? 1)
  let opacityDraft = $state(initialShader()?.opacity ?? 1)
  let renderScaleDraft = $state(initialShader()?.renderScale ?? 0.5)
  let dragging = $state(false)
  // Target of the last commit, so a stale in-flight snapshot does not pull the
  // drafts back before the coordinator persists and republishes.
  let pending = $state<{ speed: number, opacity: number, renderScale: number } | null>(null)

  const COMMIT_INTERVAL_MS = 125
  let lastCommitAt = 0
  let trailingTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const bg = settings.background
    if (bg.type !== 'shader') {
      // Switching away from the shader tab cancels any in-flight commit tracking
      // so the drafts re-sync when the user comes back.
      pending = null
      dragging = false
      return
    }
    if (pending) {
      if (
        (bg.speed ?? 1) === pending.speed
        && (bg.opacity ?? 1) === pending.opacity
        && (bg.renderScale ?? 0.5) === pending.renderScale
      ) {
        pending = null
      }
      return
    }
    if (dragging)
      return
    speedDraft = bg.speed ?? 1
    opacityDraft = bg.opacity ?? 1
    renderScaleDraft = bg.renderScale ?? 0.5
  })

  $effect(() => () => clearTimeout(trailingTimer))

  function commitDrafts() {
    const bg = settings.background
    if (bg.type !== 'shader')
      return
    clearTimeout(trailingTimer)
    trailingTimer = undefined
    lastCommitAt = Date.now()
    pending = { speed: speedDraft, opacity: opacityDraft, renderScale: renderScaleDraft }
    onchange({ background: { ...bg, ...pending } })
  }

  function scheduleCommit() {
    const elapsed = Date.now() - lastCommitAt
    if (elapsed >= COMMIT_INTERVAL_MS) {
      commitDrafts()
      return
    }
    clearTimeout(trailingTimer)
    trailingTimer = setTimeout(commitDrafts, COMMIT_INTERVAL_MS - elapsed)
  }

  function dragSpeed(value: number) {
    speedDraft = value
    dragging = true
    scheduleCommit()
  }

  function dragOpacity(value: number) {
    opacityDraft = value
    dragging = true
    scheduleCommit()
  }

  function dragRenderScale(value: number) {
    renderScaleDraft = value
    dragging = true
    scheduleCommit()
  }

  function finishDrag() {
    dragging = false
    commitDrafts()
  }

  // --- image background -----------------------------------------------------
  function isStoredMedia(url?: string): boolean {
    return isDataImageUri(url ?? '') || isMediaKey(url ?? '')
  }
  const initialImage = () =>
    settings.background.type === 'image' ? settings.background : undefined
  let urlDraft = $state(
    isStoredMedia(initialImage()?.url) ? '' : (initialImage()?.url ?? ''),
  )
  let urlDirty = $state(false)
  let urlError = $state('')
  let checking = $state(false)
  let uploading = $state(false)
  let imageOpacityDraft = $state(initialImage()?.opacity ?? 1)
  let opacityDragging = $state(false)
  let opacityPending = $state<number | null>(null)
  let zoomDraft = $state(initialImage()?.parallaxZoom ?? 1.5)
  let zoomDragging = $state(false)
  let zoomPending = $state<number | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  type ImageSourceTab = 'upload' | 'url'
  const initialSourceTab = (): ImageSourceTab => {
    const url = initialImage()?.url ?? ''
    // A stored upload belongs to the Upload tab; a remote or data address belongs to From URL.
    return url !== '' && !isStoredMedia(url) ? 'url' : 'upload'
  }
  let sourceTab = $state<ImageSourceTab>(initialSourceTab())
  let dragOver = $state(false)
  let dragDepth = 0

  $effect(() => {
    const bg = settings.background
    if (bg.type !== 'image') {
      opacityPending = null
      opacityDragging = false
      zoomPending = null
      zoomDragging = false
      urlDirty = false
      urlError = ''
      return
    }
    // Never show a multi-megabyte data URI or an opaque media key in the text field.
    if (!urlDirty)
      urlDraft = isStoredMedia(bg.url) ? '' : (bg.url ?? '')
    if (opacityPending !== null) {
      if ((bg.opacity ?? 1) === opacityPending)
        opacityPending = null
    }
    if (zoomPending !== null && (bg.parallaxZoom ?? 1.5) === zoomPending)
      zoomPending = null
    if (opacityDragging || zoomDragging) {
      if (!opacityDragging && opacityPending === null)
        imageOpacityDraft = bg.opacity ?? 1
      if (!zoomDragging && zoomPending === null)
        zoomDraft = bg.parallaxZoom ?? 1.5
      return
    }
    if (opacityPending === null)
      imageOpacityDraft = bg.opacity ?? 1
    if (zoomPending === null)
      zoomDraft = bg.parallaxZoom ?? 1.5
  })

  const COMMIT_OPACITY_INTERVAL_MS = 125
  let lastOpacityCommitAt = 0
  let opacityTrailingTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => () => clearTimeout(opacityTrailingTimer))

  function commitImageOpacity() {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    clearTimeout(opacityTrailingTimer)
    opacityTrailingTimer = undefined
    lastOpacityCommitAt = Date.now()
    opacityPending = imageOpacityDraft
    onchange({ background: { ...bg, opacity: imageOpacityDraft } })
  }

  function scheduleImageOpacityCommit() {
    const elapsed = Date.now() - lastOpacityCommitAt
    if (elapsed >= COMMIT_OPACITY_INTERVAL_MS) {
      commitImageOpacity()
      return
    }
    clearTimeout(opacityTrailingTimer)
    opacityTrailingTimer = setTimeout(commitImageOpacity, COMMIT_OPACITY_INTERVAL_MS - elapsed)
  }

  function dragImageOpacity(value: number) {
    imageOpacityDraft = value
    opacityDragging = true
    scheduleImageOpacityCommit()
  }

  function finishImageOpacityDrag() {
    opacityDragging = false
    commitImageOpacity()
  }

  const COMMIT_ZOOM_INTERVAL_MS = 125
  let lastZoomCommitAt = 0
  let zoomTrailingTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => () => clearTimeout(zoomTrailingTimer))

  function commitZoom() {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    clearTimeout(zoomTrailingTimer)
    zoomTrailingTimer = undefined
    lastZoomCommitAt = Date.now()
    zoomPending = zoomDraft
    onchange({ background: { ...bg, parallaxZoom: zoomDraft } })
  }

  function scheduleZoomCommit() {
    const elapsed = Date.now() - lastZoomCommitAt
    if (elapsed >= COMMIT_ZOOM_INTERVAL_MS) {
      commitZoom()
      return
    }
    clearTimeout(zoomTrailingTimer)
    zoomTrailingTimer = setTimeout(commitZoom, COMMIT_ZOOM_INTERVAL_MS - elapsed)
  }

  function dragZoom(value: number) {
    zoomDraft = value
    zoomDragging = true
    scheduleZoomCommit()
  }

  function finishZoomDrag() {
    zoomDragging = false
    commitZoom()
  }

  function loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error('That file could not be decoded as an image.'))
      image.src = src
    })
  }

  /** Draw at (width, height) and re-encode. WebP when the engine supports it, JPEG otherwise. */
  function encodeAt(image: HTMLImageElement, width: number, height: number): Promise<Blob> {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context)
      return Promise.reject(new Error('Canvas is unavailable in this window.'))
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(image, 0, 0, width, height)
    const webP = (quality: number) =>
      new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/webp', quality))
    const jpeg = (quality: number) =>
      new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', quality))
    return webP(0.85).then((blob) => {
      if (blob && blob.type === 'image/webp')
        return blob
      return jpeg(0.88).then((fallback) => {
        if (!fallback)
          throw new Error('The image could not be encoded.')
        return fallback
      })
    })
  }

  /**
   * Produce a Blob to store. SVG passes through untouched (vectors are compact
   * and rasterizing loses the format); everything else keeps the original file
   * when it already fits, otherwise downscales and re-encodes.
   */
  async function encodeForStorage(
    file: File,
    image: HTMLImageElement,
  ): Promise<Blob> {
    if (file.type === 'image/svg+xml')
      return file
    const MAX_STORED_BYTES = 24 * 1024 * 1024
    const clamped = clampDimensions(image.naturalWidth, image.naturalHeight)
    if (!clamped.scaled && file.size <= MAX_STORED_BYTES)
      return file
    for (const step of [1, 0.75, 0.5]) {
      const blob = await encodeAt(
        image,
        Math.max(1, Math.round(clamped.width * step)),
        Math.max(1, Math.round(clamped.height * step)),
      )
      if (blob.size <= MAX_STORED_BYTES)
        return blob
    }
    throw new Error('That image is still too large after resizing. Choose a simpler image.')
  }

  async function uploadFile(file: File) {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    urlError = ''
    uploading = true
    try {
      validateUploadFile(file)
      const probeUrl = URL.createObjectURL(file)
      let image: HTMLImageElement
      try {
        image = await loadImageElement(probeUrl)
      }
      finally {
        URL.revokeObjectURL(probeUrl)
      }
      if (image.naturalWidth === 0 || image.naturalHeight === 0)
        throw new Error('That file could not be decoded as an image.')
      const blob = await encodeForStorage(file, image)
      const key = await saveBackgroundMedia(blob)
      onchange({ background: { ...bg, url: key } })
      urlDirty = false
    }
    catch (error) {
      urlError = error instanceof Error ? error.message : 'That image could not be used.'
    }
    finally {
      uploading = false
    }
  }

  async function handleUpload(event: Event & { currentTarget: HTMLInputElement }) {
    const input = event.currentTarget
    const file = input.files?.[0]
    // Reset so picking the same file twice still fires `change`.
    input.value = ''
    if (!file)
      return
    await uploadFile(file)
  }

  function handleDragEnter(event: DragEvent) {
    if (busy || uploading)
      return
    event.preventDefault()
    dragDepth += 1
    dragOver = true
  }

  function handleDragOver(event: DragEvent) {
    // Required so the browser allows a drop.
    if (busy || uploading)
      return
    event.preventDefault()
  }

  function handleDragLeave(event: DragEvent) {
    event.preventDefault()
    dragDepth = Math.max(0, dragDepth - 1)
    if (dragDepth === 0)
      dragOver = false
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragDepth = 0
    dragOver = false
    if (busy || uploading)
      return
    const file = event.dataTransfer?.files?.[0]
    if (file)
      void uploadFile(file)
  }

  /** Confirm a remote address decodes as an image before persisting it. */
  function preflightImage(url: string, timeoutMs = 10000): Promise<void> {
    return new Promise((resolve, reject) => {
      const probe = new Image()
      const timer = setTimeout(() => {
        probe.onload = null
        probe.onerror = null
        reject(new Error('timeout'))
      }, timeoutMs)
      probe.onload = () => {
        clearTimeout(timer)
        resolve()
      }
      probe.onerror = () => {
        clearTimeout(timer)
        reject(new Error('load'))
      }
      probe.referrerPolicy = 'no-referrer'
      probe.src = url
    })
  }

  async function commitUrl() {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    urlError = ''
    let validated: string
    try {
      validated = validateBackgroundUrl(urlDraft)
    }
    catch (error) {
      urlError = error instanceof Error ? error.message : 'That address is not valid.'
      return
    }
    const current = bg.url ?? ''
    if (validated === current) {
      urlDirty = false
      return
    }
    if (validated !== '' && !isDataImageUri(validated)) {
      checking = true
      try {
        await preflightImage(validated)
      }
      catch {
        urlError = 'That address did not load as an image. Check the URL and try again.'
        checking = false
        return
      }
      checking = false
    }
    onchange({ background: { ...bg, url: validated } })
    urlDirty = false
  }

  function removeImage() {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    const current = bg.url ?? ''
    onchange({ background: { ...BACKGROUND_DEFAULTS.image } })
    urlDraft = ''
    urlDirty = false
    urlError = ''
    if (isMediaKey(current)) {
      // Orphaned blobs are reclaimed by the startup sweep, so a failure here is safe to ignore.
      deleteBackgroundMedia(current).catch(() => {})
    }
  }
</script>

<CollapsibleSection
  open={true}
  title='Background type'
  helpText='Choose what renders behind your tiles'
  icon='layer'
>
  {#snippet control()}
    <Select.Root
      type='single'

      value={settings.background.type}
      onValueChange={(tab) => {
        if (isBackgroundType(tab))
          selectBackground(tab)
      }}
    >
      <Select.Trigger
        class='w-20'
        aria-label='Background type'
      >
        {BACKGROUND_TYPE_LABELS[settings.background.type]}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each BACKGROUND_TYPES as type (type)}
            <Select.Item value={type}>{BACKGROUND_TYPE_LABELS[type]}</Select.Item>
          {/each}
        </Select.Group>
      </Select.Content>
    </Select.Root>
  {/snippet}
  {#if settings.background.type === 'color'}
    <BaseColorMode
      auto={autoColor}
      color={settings.background.color}
      {busy}
      idPrefix='background'
      onchange={setColorMode}
    />
  {/if}
  {#if settings.background.type === 'shader'}
    <div class='p-4'>
      <div class='grid grid-cols-2 gap-2'>
        <ShaderThumb
          shader={null}
          pressed={nonePressed}
          disabled={busy}
          reducedMotion={settings.reducedMotion}
          onselect={() => updateShader({ shaderId: NONE_SHADER_ID })}
        />
        {#each SHADERS as shader (shader.id)}
          <ShaderThumb
            {shader}
            pressed={settings.background.shaderId === shader.id}
            disabled={busy}
            reducedMotion={settings.reducedMotion}
            benchmark={shaderBenchmark.resultFor(shader.id)}
            onselect={() => updateShader({ shaderId: shader.id })}
          />
        {/each}
      </div>
    </div>
    <div class='border-t border-(--border) p-4'>
      <div class='flex flex-wrap items-center justify-between gap-2'>
        <p class='text-xs font-semibold'>Shader performance</p>
        <Button
          variant='secondary'
          size='sm'
          class='h-8'
          disabled={busy}
          onclick={() => (shaderBenchmark.running
            ? cancelShaderBenchmarks()
            : void runShaderBenchmarks())}
        >
          <Icon name={shaderBenchmark.running ? 'close' : 'gauge'} size={14} />
          {shaderBenchmark.running
            ? 'Cancel'
            : shaderBenchmark.hasResults() ? 'Re-run benchmark' : 'Run benchmark'}
        </Button>
      </div>
      <p class='mt-1.5 text-[10px] leading-relaxed text-(--muted-foreground)'>
        Your GPU re-renders the background on every new tab, and shader cost differs
        a lot between shaders. This test renders each shader offscreen at a fixed
        size on this PC and measures the frame time, so you can pick one that keeps
        your new tab fast. Results are kept in memory and disappear on reload.
      </p>
      <div
        class='
          mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px]
          text-(--muted-foreground)
        '
      >
        {#each BENCHMARK_LEVELS as level (level)}
          <span class='flex items-center gap-1'>
            <Icon name={BENCHMARK_PRESENTATION[level].icon} size={12} class={BENCHMARK_PRESENTATION[level].class} />
            {BENCHMARK_PRESENTATION[level].short}
          </span>
        {/each}
      </div>
      <div aria-live='polite' class='mt-1.5 text-[10px] text-(--muted-foreground)'>
        {#if shaderBenchmark.running && currentBenchmarkName !== null}
          Testing {shaderBenchmark.done + 1} of {shaderBenchmark.total}: {currentBenchmarkName}…
        {:else if shaderBenchmark.cancelled}
          Benchmark cancelled.
        {:else if shaderBenchmark.failure !== null}
          <span class='text-(--destructive)'>{shaderBenchmark.failure}</span>
        {/if}
      </div>
    </div>
    <SettingsRow
      title='Performance priority'
      helpText='Prioritize frame rate or render resolution'
      controlId='shader-quality'
      disabled={busy}
    >
      <ToggleGroup.Root
        type='single'
        id='shader-quality'
        aria-labelledby='shader-quality-title'
        aria-describedby='shader-quality-help'
        value={(
          settings.background.type === 'shader'
            ? settings.background.quality
            : 'motion')}
        disabled={busy}
        onValueChange={(v) => {
          if (v !== 'motion' && v !== 'detail')
            return
          updateShader({ quality: v })
        }}
      >
        <ToggleGroup.Item value='motion' class='grow'>Frame rate</ToggleGroup.Item>
        <ToggleGroup.Item value='detail' class='grow'>Resolution</ToggleGroup.Item>
      </ToggleGroup.Root>
    </SettingsRow>
    <BaseColorMode
      auto={settings.background.auto ?? true}
      color={settings.background.color}
      {busy}
      idPrefix='shader-background'
      onchange={(auto, color) => updateShader({ auto, color })}
    />
    <SettingsRow
      title='Shader speed'
      helpText='How fast the shader animates'
      controlId='shader-speed'
    >
      <span>{speedDraft.toFixed(1)}x</span>
      <Slider
        id='shader-speed'
        aria-labelledby='shader-speed-title'
        aria-describedby='shader-speed-help'
        class='w-32'
        type='single'
        value={speedDraft}
        min={0.1}
        max={4}
        step={0.1}
        onValueChange={dragSpeed}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    <SettingsRow
      title='Maximum FPS'
      helpText='Cap frames per second. Auto removes the cap'
      controlId='shader-fps'
    >
      <ToggleGroup.Root
        type='single'
        value={String(settings.background.targetFps ?? 60)}
        onValueChange={v => updateShader({ targetFps: Number(v) })}
        id='shader-fps'
        aria-labelledby='shader-fps-title'
        aria-describedby='shader-fps-help'
      >
        {#each [15, 30, 60, 120, 0] as value (value)}
          <ToggleGroup.Item value={String(value)} class='grow'>
            {value === 0 ? 'Auto' : value}
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <SettingsRow
      title='Opacity'
      helpText='How visible the shader is'
      controlId='shader-opacity'
    >
      <span>{Math.round(opacityDraft * 100)}%</span>
      <Slider
        id='shader-opacity'
        aria-labelledby='shader-opacity-title'
        aria-describedby='shader-opacity-help'
        type='single'
        value={opacityDraft}
        min={0.0}
        max={1.0}
        step={0.1}
        class='w-32'
        onValueChange={dragOpacity}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    <SettingsRow
      title='Maximum render scale'
      helpText='Render below display resolution to save GPU'
      controlId='shader-render-scale'
    >
      <span>{renderScaleDraft}x</span>
      <Slider
        id='shader-render-scale'
        aria-labelledby='shader-render-scale-title'
        aria-describedby='shader-render-scale-help'
        type='single'
        value={renderScaleDraft}
        min={0.25}
        max={1.0}
        step={[0.25, 0.5, 0.75, 1.0]}
        class='w-32'
        onValueChange={dragRenderScale}
        onValueCommit={finishDrag}
      />
    </SettingsRow>
    {@const metrics = shaderMetrics.current}
    {#if metrics}
      <div
        class='grid grid-cols-2 gap-2 p-4 text-xs'
        aria-label='Animated background performance'
      >
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>FPS</div>
          <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--destructive)' : levelFps(metrics.fps, metrics.targetFps) === 'danger' ? 'text-(--destructive)' : levelFps(metrics.fps, metrics.targetFps) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
            {metrics.level === 'frozen' ? '—' : metrics.fps.toFixed(0)}
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>Frame</div>
          <div class='font-mono tabular-nums {levelFrame(metrics.frameMs, metrics.nominalMs) === 'danger' ? 'text-(--destructive)' : levelFrame(metrics.frameMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
            {metrics.frameMs.toFixed(1)} ms
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>Worst</div>
          <div class='font-mono tabular-nums {levelWorst(metrics.worstMs, metrics.nominalMs) === 'danger' ? 'text-(--destructive)' : levelWorst(metrics.worstMs, metrics.nominalMs) === 'warn' ? 'text-(--warn)' : 'text-(--foreground)'}'>
            {metrics.worstMs.toFixed(1)} ms
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>Priority</div>
          <div class='font-mono tabular-nums {metrics.level === 'frozen' ? 'text-(--destructive)' : metrics.level === 'reduced' ? 'text-(--warn)' : 'text-(--foreground)'}'>
            {metrics.quality === 'motion' ? 'Frame rate' : 'Resolution'} · {metrics.level}
          </div>
        </div>
      </div>
    {:else}
      <p class='p-4 text-[10px] leading-relaxed text-(--muted-foreground)'>
        No animated background is running.
      </p>
    {/if}
    <SettingsRow
      title='Mouse interaction'
      helpText='Let the shader follow your pointer'
      controlId='shader-mouse'
      disabled={busy}
    >
      <input
        id='shader-mouse'
        type='checkbox'
        role='switch'
        aria-describedby='shader-mouse-help'
        checked={settings.background.mouseInteraction ?? true}
        disabled={busy}
        onchange={event => updateShader({ mouseInteraction: event.currentTarget.checked })}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
      />
    </SettingsRow>
  {/if}

  {#if settings.background.type === 'image'}
    {@const bg = settings.background}
    <div class='px-4 py-3'>
      <ToggleGroup.Root
        type='single'
        id='image-source'
        aria-label='Image source'
        value={sourceTab}
        class='w-full'
        disabled={busy || uploading}
        onValueChange={(v) => {
          if (v === 'upload' || v === 'url')
            sourceTab = v
        }}
      >
        <ToggleGroup.Item value='upload' class='grow'>Upload</ToggleGroup.Item>
        <ToggleGroup.Item value='url' class='grow'>From URL</ToggleGroup.Item>
      </ToggleGroup.Root>

      {#if sourceTab === 'upload'}
        <p
          class='
            mt-4 mb-2 text-[0.5rem] font-semibold tracking-widest
            text-(--muted-foreground)
          '
        >
          IMAGE FILE
        </p>
        <button
          id='image-upload'
          type='button'
          class='
            flex w-full flex-col items-center justify-center gap-1.5 rounded-md border
            border-dashed border-(--border) px-4 py-6 text-center text-(--foreground)
            transition-colors
            hover:border-(--muted-foreground) hover:bg-(--muted)/30
            focus-visible:outline-2 focus-visible:outline-offset-2
            focus-visible:outline-ring
            disabled:cursor-not-allowed disabled:opacity-50
            {dragOver ? 'border-(--primary) bg-(--muted)/40' : ''}
          '
          disabled={busy || uploading}
          aria-describedby='image-upload-help'
          onclick={() => fileInput?.click()}
          ondragenter={handleDragEnter}
          ondragover={handleDragOver}
          ondragleave={handleDragLeave}
          ondrop={handleDrop}
        >
          <Icon name='imageAdd' size={32} class='text-(--muted-foreground)' />
          <span class='text-sm font-semibold'>
            {uploading ? 'Reading…' : 'Click to browse or drop an image'}
          </span>
          <span id='image-upload-help' class='text-xs text-(--muted-foreground)'>
            PNG, JPG, WebP, GIF or SVG · max 25 MB
          </span>
        </button>
        <input
          bind:this={fileInput}
          id='image-upload-input'
          name='image-upload'
          type='file'
          accept='image/png,image/jpeg,image/webp,image/gif,image/svg+xml'
          class='hidden'
          tabindex='-1'
          aria-hidden='true'
          onchange={handleUpload}
        />
      {:else}
        <label
          for='image-url'
          class='
            mt-4 mb-2 block text-[0.5rem] font-semibold tracking-widest
            text-(--muted-foreground)
          '
        >
          IMAGE URL
        </label>
        <div class='flex items-center gap-2'>
          <Input
            id='image-url'
            type='text'
            inputmode='url'
            placeholder={isStoredMedia(bg.url)
              ? 'Uploaded image in use'
              : 'https://example.com/photo.jpg'}
            class='min-w-0 flex-1 text-sm'
            value={urlDraft}
            disabled={busy || uploading}
            aria-invalid={urlError !== '' ? 'true' : undefined}
            aria-describedby={urlError !== '' ? 'image-url-help image-url-error' : 'image-url-help'}
            oninput={(event) => {
              urlDraft = event.currentTarget.value
              urlDirty = true
              urlError = ''
            }}
            onkeydown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                void commitUrl()
              }
            }}
          />
          <Button
            variant='default'
            size='sm'
            class='h-9 px-4'
            disabled={busy || uploading || checking}
            onclick={() => void commitUrl()}
          >
            {checking ? 'Checking…' : 'Apply'}
          </Button>
        </div>
        <p id='image-url-help' class='mt-2 text-xs text-(--muted-foreground)'>
          An address that points directly at an image file
        </p>
      {/if}
    </div>

    {#if urlError !== ''}
      <p id='image-url-error' role='alert' class='border-t border-(--border) px-4 py-2 text-xs text-(--destructive)'>
        {urlError}
      </p>
    {/if}
    <SettingsRow
      title='Fit'
      helpText='How the image fills the page'
      controlId='image-fit'
      disabled={busy || uploading}
    >
      <ToggleGroup.Root
        type='single'
        id='image-fit'
        aria-labelledby='image-fit-title'
        aria-describedby='image-fit-help'
        value={bg.fit ?? 'cover'}
        disabled={busy || uploading}
        onValueChange={(v) => {
          const fit = IMAGE_FITS.find(candidate => candidate === v)
          if (fit)
            updateImage({ fit })
        }}
      >
        {#each IMAGE_FITS as fit (fit)}
          <ToggleGroup.Item value={fit} class='grow capitalize'>{fit}</ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <BaseColorMode
      auto={bg.auto ?? true}
      color={bg.color}
      busy={busy || uploading}
      idPrefix='image-background'
      onchange={(auto, color) => updateImage({ auto, color })}
    />
    <SettingsRow
      title='Opacity'
      helpText='How visible the image is'
      controlId='image-opacity'
      disabled={busy || uploading}
    >
      <span>{Math.round(imageOpacityDraft * 100)}%</span>
      <Slider
        id='image-opacity'
        aria-labelledby='image-opacity-title'
        aria-describedby='image-opacity-help'
        type='single'
        value={imageOpacityDraft}
        min={0.0}
        max={1.0}
        step={0.1}
        class='w-32'
        onValueChange={dragImageOpacity}
        onValueCommit={finishImageOpacityDrag}
      />
    </SettingsRow>
    <SettingsRow
      title='Parallax'
      helpText={settings.reducedMotion
        ? 'Disabled because reduced motion is on'
        : 'Nudge the image as you scroll'}
      controlId='image-parallax'
      disabled={busy || uploading || settings.reducedMotion}
    >
      <input
        id='image-parallax'
        type='checkbox'
        role='switch'
        aria-describedby='image-parallax-help'
        checked={bg.parallax ?? false}
        disabled={busy || uploading || settings.reducedMotion}
        onchange={event => updateImage({ parallax: event.currentTarget.checked })}
        class='
          h-4.5 w-7.75 shrink-0 cursor-pointer appearance-none rounded-full bg-(--border)
          p-0.75
          before:block before:size-3 before:rounded-full before:bg-(--muted-foreground)
          before:transition-transform before:duration-130
          checked:bg-(--primary)
          checked:before:translate-x-3.25 checked:before:bg-(--primary-foreground)
          disabled:cursor-not-allowed disabled:opacity-50
        '
      />
    </SettingsRow>
    {@const parallaxDisabled = busy || uploading || settings.reducedMotion
      || !(bg.parallax ?? false)}
    <SettingsRow
      title='Parallax zoom'
      helpText='More zoom gives the image room to shift'
      controlId='image-parallax-zoom'
      disabled={parallaxDisabled}
    >
      <span>{String(Number(zoomDraft.toFixed(2)))}x</span>
      <Slider
        id='image-parallax-zoom'
        aria-labelledby='image-parallax-zoom-title'
        aria-describedby='image-parallax-zoom-help'
        type='single'
        value={zoomDraft}
        min={1}
        max={4}
        step={0.25}
        class='w-32'
        disabled={parallaxDisabled}
        onValueChange={dragZoom}
        onValueCommit={finishZoomDrag}
      />
    </SettingsRow>
    {#if (bg.url ?? '') !== ''}
      <SettingsRow
        title='Remove image'
        helpText='Removes the image from the background'
        controlId='image-remove'
        disabled={busy || uploading}
      >
        <Button
          id='image-remove'
          variant='secondary'
          size='sm'
          disabled={busy || uploading}
          onclick={removeImage}
        >
          Remove image
        </Button>
      </SettingsRow>
    {/if}
  {/if}

</CollapsibleSection>
