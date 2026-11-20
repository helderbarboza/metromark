<script lang='ts'>
  import type {
    ImageBackgroundSettings,
    Settings,
    ShaderBackgroundSettings,
    YoutubeBackgroundSettings,
  } from '$lib/config'

  import LL from '$i18n/i18n-svelte'
  import {
    clampDimensions,
    isDataImageUri,
    isMediaKey,
    validateBackgroundUrl,
    validateUploadFile,
  } from '$lib/background-image'
  import Icon from '$lib/components/atoms/Icon.svelte'
  import BaseColorMode from '$lib/components/molecules/BaseColorMode.svelte'
  import CollapsibleSection from '$lib/components/molecules/CollapsibleSection.svelte'
  import SettingsRow from '$lib/components/molecules/SettingsRow.svelte'
  import ShaderThumb from '$lib/components/molecules/ShaderThumb.svelte'
  import { Button } from '$lib/components/ui/button'
  import { Input } from '$lib/components/ui/input'
  import * as Select from '$lib/components/ui/select'
  import { Slider } from '$lib/components/ui/slider'
  import * as ToggleGroup from '$lib/components/ui/toggle-group'
  import { BACKGROUND_DEFAULTS } from '$lib/config'
  import { getT } from '$lib/locale'
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
  import { validateYoutubeUrl } from '$lib/youtube'

  type BackgroundType = Settings['background']['type']

  const BACKGROUND_TYPES = [
    'color',
    'image',
    'shader',
    'youtube',
  ] as const satisfies readonly BackgroundType[]

  const SHADERS = Object.values(shaders)
  const FITS = ['cover', 'contain', 'fill'] as const

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
    settings.background.type === 'color'
      ? settings.background.auto !== false
      : true,
  )

  function isBackgroundType(value: string): value is BackgroundType {
    return BACKGROUND_TYPES.some(type => type === value)
  }

  function selectBackground(type: BackgroundType) {
    if (settings.background.type === type)
      return
    // Replace the whole variant so the object shape matches the new `type`.
    onchange({
      background: { ...BACKGROUND_DEFAULTS[type] },
    })
  }

  function setColorMode(auto: boolean, color?: string) {
    if (settings.background.type !== 'color')
      return
    onchange({
      background: { ...settings.background, auto, color },
    })
  }

  function updateShader(patch: Partial<ShaderBackgroundSettings>) {
    if (settings.background.type !== 'shader')
      return
    onchange({
      background: {
        ...settings.background,
        ...patch,
      },
    })
  }

  function updateImage(patch: Partial<ImageBackgroundSettings>) {
    if (settings.background.type !== 'image')
      return
    onchange({
      background: {
        ...settings.background,
        ...patch,
      },
    })
  }

  function updateYoutube(patch: Partial<YoutubeBackgroundSettings>) {
    if (settings.background.type !== 'youtube')
      return
    onchange({
      background: {
        ...settings.background,
        ...patch,
      },
    })
  }

  // Draft state keeps the sliders responsive while settings changes round-trip
  // through the async command queue. The parent owns the persisted values;
  // these mirror what the user sees while dragging. A closure captures the
  // mount-time value on purpose; the effect below keeps them in sync after.
  const initialShader = () =>
    settings.background.type === 'shader'
      ? settings.background
      : undefined
  let speedDraft = $state(initialShader()?.speed ?? BACKGROUND_DEFAULTS.shader.speed)
  let opacityDraft = $state(initialShader()?.opacity ?? BACKGROUND_DEFAULTS.shader.opacity)
  let renderScaleDraft = $state(
    initialShader()?.renderScale ?? BACKGROUND_DEFAULTS.shader.renderScale,
  )
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
        (bg.speed ?? BACKGROUND_DEFAULTS.shader.speed) === pending.speed
        && (bg.opacity ?? BACKGROUND_DEFAULTS.shader.opacity) === pending.opacity
        && (bg.renderScale ?? BACKGROUND_DEFAULTS.shader.renderScale) === pending.renderScale
      ) {
        pending = null
      }
      return
    }
    if (dragging)
      return
    speedDraft = bg.speed ?? BACKGROUND_DEFAULTS.shader.speed
    opacityDraft = bg.opacity ?? BACKGROUND_DEFAULTS.shader.opacity
    renderScaleDraft = bg.renderScale ?? BACKGROUND_DEFAULTS.shader.renderScale
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
    onchange({
      background: {
        ...bg,
        ...pending,
      },
    })
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
    settings.background.type === 'image'
      ? settings.background
      : undefined
  let urlDraft = $state(
    isStoredMedia(initialImage()?.url)
      ? ''
      : (initialImage()?.url ?? ''),
  )
  let urlDirty = $state(false)
  let urlError = $state('')
  let checking = $state(false)
  let uploading = $state(false)
  let imageOpacityDraft = $state(initialImage()?.opacity ?? BACKGROUND_DEFAULTS.image.opacity)
  let opacityDragging = $state(false)
  let opacityPending = $state<number | null>(null)
  let zoomDraft = $state(initialImage()?.parallaxZoom ?? BACKGROUND_DEFAULTS.image.parallaxZoom)
  let zoomDragging = $state(false)
  let zoomPending = $state<number | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  type ImageSourceTab = 'upload' | 'url'
  const initialSourceTab = (): ImageSourceTab => {
    const url = initialImage()?.url ?? ''
    // A stored upload belongs to the Upload tab; a remote or data address belongs to From URL.
    return url !== '' && !isStoredMedia(url)
      ? 'url'
      : 'upload'
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
    if (!urlDirty) {
      urlDraft = isStoredMedia(bg.url)
        ? ''
        : (bg.url ?? '')
    }
    if (opacityPending !== null) {
      if ((bg.opacity ?? BACKGROUND_DEFAULTS.image.opacity) === opacityPending)
        opacityPending = null
    }
    if (zoomPending !== null
      && (bg.parallaxZoom ?? BACKGROUND_DEFAULTS.image.parallaxZoom) === zoomPending) {
      zoomPending = null
    }
    if (opacityDragging || zoomDragging) {
      if (!opacityDragging && opacityPending === null)
        imageOpacityDraft = bg.opacity ?? BACKGROUND_DEFAULTS.image.opacity
      if (!zoomDragging && zoomPending === null)
        zoomDraft = bg.parallaxZoom ?? BACKGROUND_DEFAULTS.image.parallaxZoom
      return
    }
    if (opacityPending === null)
      imageOpacityDraft = bg.opacity ?? BACKGROUND_DEFAULTS.image.opacity
    if (zoomPending === null)
      zoomDraft = bg.parallaxZoom ?? BACKGROUND_DEFAULTS.image.parallaxZoom
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
    onchange({
      background: { ...bg, opacity: imageOpacityDraft },
    })
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
    onchange({
      background: { ...bg, parallaxZoom: zoomDraft },
    })
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

  // --- youtube background -----------------------------------------------------
  const initialYoutube = () =>
    settings.background.type === 'youtube'
      ? settings.background
      : undefined
  let youtubeUrlDraft = $state(initialYoutube()?.url ?? '')
  let youtubeUrlDirty = $state(false)
  let youtubeUrlError = $state('')

  $effect(() => {
    const bg = settings.background
    if (bg.type !== 'youtube') {
      youtubeUrlDirty = false
      youtubeUrlError = ''
      return
    }
    if (!youtubeUrlDirty)
      youtubeUrlDraft = bg.url ?? ''
  })

  // Drafts for the opacity and parallax-zoom sliders, mirroring the image tab.
  const PLAYBACK_RATES = [0.25, 0.5, 1, 1.5, 2] as const
  const PLAYLIST_ORDERS = ['shuffle', 'sequential'] as const
  let youtubeOpacityDraft = $state(initialYoutube()?.opacity ?? BACKGROUND_DEFAULTS.youtube.opacity)
  let youtubeOpacityDragging = $state(false)
  let youtubeOpacityPending = $state<number | null>(null)
  let youtubeZoomDraft = $state(
    initialYoutube()?.parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom,
  )
  let youtubeZoomDragging = $state(false)
  let youtubeZoomPending = $state<number | null>(null)

  const COMMIT_YOUTUBE_OPACITY_INTERVAL_MS = 125
  let lastYoutubeOpacityCommitAt = 0
  let youtubeOpacityTrailingTimer: ReturnType<typeof setTimeout> | undefined
  const COMMIT_YOUTUBE_ZOOM_INTERVAL_MS = 125
  let lastYoutubeZoomCommitAt = 0
  let youtubeZoomTrailingTimer: ReturnType<typeof setTimeout> | undefined

  $effect(() => {
    const bg = settings.background
    if (bg.type !== 'youtube') {
      youtubeOpacityPending = null
      youtubeOpacityDragging = false
      youtubeZoomPending = null
      youtubeZoomDragging = false
      return
    }
    if (youtubeOpacityPending !== null
      && (bg.opacity ?? BACKGROUND_DEFAULTS.youtube.opacity) === youtubeOpacityPending) {
      youtubeOpacityPending = null
    }
    if (youtubeZoomPending !== null
      && (bg.parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom) === youtubeZoomPending) {
      youtubeZoomPending = null
    }
    if (youtubeOpacityDragging || youtubeZoomDragging) {
      if (!youtubeOpacityDragging && youtubeOpacityPending === null)
        youtubeOpacityDraft = bg.opacity ?? BACKGROUND_DEFAULTS.youtube.opacity
      if (!youtubeZoomDragging && youtubeZoomPending === null)
        youtubeZoomDraft = bg.parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom
      return
    }
    if (youtubeOpacityPending === null)
      youtubeOpacityDraft = bg.opacity ?? BACKGROUND_DEFAULTS.youtube.opacity
    if (youtubeZoomPending === null)
      youtubeZoomDraft = bg.parallaxZoom ?? BACKGROUND_DEFAULTS.youtube.parallaxZoom
  })

  $effect(() => {
    return () => {
      clearTimeout(youtubeOpacityTrailingTimer)
      clearTimeout(youtubeZoomTrailingTimer)
    }
  })

  function commitYoutubeOpacity() {
    const bg = settings.background
    if (bg.type !== 'youtube')
      return
    clearTimeout(youtubeOpacityTrailingTimer)
    youtubeOpacityTrailingTimer = undefined
    lastYoutubeOpacityCommitAt = Date.now()
    youtubeOpacityPending = youtubeOpacityDraft
    onchange({
      background: { ...bg, opacity: youtubeOpacityDraft },
    })
  }

  function scheduleYoutubeOpacityCommit() {
    const elapsed = Date.now() - lastYoutubeOpacityCommitAt
    if (elapsed >= COMMIT_YOUTUBE_OPACITY_INTERVAL_MS) {
      commitYoutubeOpacity()
      return
    }
    clearTimeout(youtubeOpacityTrailingTimer)
    youtubeOpacityTrailingTimer = setTimeout(
      commitYoutubeOpacity,
      COMMIT_YOUTUBE_OPACITY_INTERVAL_MS - elapsed,
    )
  }

  function dragYoutubeOpacity(value: number) {
    youtubeOpacityDraft = value
    youtubeOpacityDragging = true
    scheduleYoutubeOpacityCommit()
  }

  function finishYoutubeOpacityDrag() {
    youtubeOpacityDragging = false
    commitYoutubeOpacity()
  }

  function commitYoutubeZoom() {
    const bg = settings.background
    if (bg.type !== 'youtube')
      return
    clearTimeout(youtubeZoomTrailingTimer)
    youtubeZoomTrailingTimer = undefined
    lastYoutubeZoomCommitAt = Date.now()
    youtubeZoomPending = youtubeZoomDraft
    onchange({
      background: { ...bg, parallaxZoom: youtubeZoomDraft },
    })
  }

  function scheduleYoutubeZoomCommit() {
    const elapsed = Date.now() - lastYoutubeZoomCommitAt
    if (elapsed >= COMMIT_YOUTUBE_ZOOM_INTERVAL_MS) {
      commitYoutubeZoom()
      return
    }
    clearTimeout(youtubeZoomTrailingTimer)
    youtubeZoomTrailingTimer = setTimeout(
      commitYoutubeZoom,
      COMMIT_YOUTUBE_ZOOM_INTERVAL_MS - elapsed,
    )
  }

  function dragYoutubeZoom(value: number) {
    youtubeZoomDraft = value
    youtubeZoomDragging = true
    scheduleYoutubeZoomCommit()
  }

  function finishYoutubeZoomDrag() {
    youtubeZoomDragging = false
    commitYoutubeZoom()
  }

  function commitYoutubeUrl() {
    const bg = settings.background
    if (bg.type !== 'youtube')
      return
    youtubeUrlError = ''
    let validated: string
    try {
      validated = validateYoutubeUrl(youtubeUrlDraft)
    }
    catch (error) {
      youtubeUrlError = error instanceof Error
        ? error.message
        : getT().backgroundErrors.addressNotValid()
      return
    }
    updateYoutube({ url: validated })
    youtubeUrlDirty = false
  }

  function loadImageElement(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const image = new Image()
      image.onload = () => resolve(image)
      image.onerror = () => reject(new Error(getT().backgroundErrors.undecodable()))
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
      return Promise.reject(new Error(getT().backgroundErrors.canvasUnavailable()))
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
          throw new Error(getT().backgroundErrors.imageEncodeFailed())
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
    throw new Error(getT().backgroundErrors.imageStillTooLarge())
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
        throw new Error(getT().backgroundErrors.undecodable())
      const blob = await encodeForStorage(file, image)
      const key = await saveBackgroundMedia(blob)
      onchange({
        background: { ...bg, url: key },
      })
      urlDirty = false
    }
    catch (error) {
      urlError
        = error instanceof Error
          ? error.message
          : getT().backgroundErrors.imageCouldNotBeUsed()
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
      urlError = error instanceof Error
        ? error.message
        : getT().backgroundErrors.addressNotValid()
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
        urlError = getT().backgroundErrors.imageDidNotLoad()
        checking = false
        return
      }
      checking = false
    }
    onchange({
      background: { ...bg, url: validated },
    })
    urlDirty = false
  }

  function removeImage() {
    const bg = settings.background
    if (bg.type !== 'image')
      return
    const current = bg.url ?? ''
    onchange({
      background: { ...BACKGROUND_DEFAULTS.image },
    })
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
  title={$LL.settings.backgroundType()}
  helpText={$LL.settings.backgroundTypeHelp()}
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
        class='w-32'
        aria-label={$LL.settings.backgroundType()}
      >
        {$LL.settings[settings.background.type]()}
      </Select.Trigger>
      <Select.Content>
        <Select.Group>
          {#each BACKGROUND_TYPES as type (type)}
            <Select.Item value={type}>{$LL.settings[type]()}</Select.Item>
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
    <SettingsRow
      title={$LL.settings.pauseAnimatedBackground()}
      helpText={$LL.settings.pauseAnimatedBackgroundHelp()}
      controlId='shader-paused'
      disabled={busy}
    >
      <input
        id='shader-paused'
        type='checkbox'
        role='switch'
        aria-describedby='shader-paused-help'
        checked={settings.background.type === 'shader' && settings.background.paused === true}
        disabled={busy}
        onchange={event => updateShader({ paused: event.currentTarget.checked })}
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
    <div class='border-t border-(--border) p-4'>
      <div class='flex flex-wrap items-center justify-between gap-2'>
        <p class='text-xs font-semibold'>{$LL.settings.shaderPerformance()}</p>
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
            ? $LL.dialogs.cancel()
            : shaderBenchmark.hasResults()
            ? $LL.settings.rerunBenchmark()
            : $LL.settings.runBenchmark()}
        </Button>
      </div>
      <p class='mt-1.5 text-[10px] leading-relaxed text-(--muted-foreground)'>
        {$LL.settings.benchmarkDescription()}
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
            {$LL.benchmarkLevels[level]()}
          </span>
        {/each}
      </div>
      <div aria-live='polite' class='mt-1.5 text-[10px] text-(--muted-foreground)'>
        {#if shaderBenchmark.running && currentBenchmarkName !== null}
          {$LL.settings.benchmarkTesting({
            current: shaderBenchmark.done + 1,
            total: shaderBenchmark.total,
            name: currentBenchmarkName ?? '',
          })}
        {:else if shaderBenchmark.cancelled}
          {$LL.settings.benchmarkCancelled()}
        {:else if shaderBenchmark.failure !== null}
          <span class='text-(--destructive)'>{shaderBenchmark.failure}</span>
        {/if}
      </div>
    </div>
    <SettingsRow
      title={$LL.settings.performancePriority()}
      helpText={$LL.settings.performancePriorityHelp()}
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
            : BACKGROUND_DEFAULTS.shader.quality)}
        disabled={busy}
        onValueChange={(v) => {
          if (v !== 'motion' && v !== 'detail')
            return
          updateShader({ quality: v })
        }}
      >
        <ToggleGroup.Item value='motion' class='grow'>{$LL.settings.frameRate()}</ToggleGroup.Item>
        <ToggleGroup.Item value='detail' class='grow'>{$LL.settings.resolution()}</ToggleGroup.Item>
      </ToggleGroup.Root>
    </SettingsRow>
    <BaseColorMode
      auto={settings.background.auto ?? BACKGROUND_DEFAULTS.shader.auto}
      color={settings.background.color}
      {busy}
      idPrefix='shader-background'
      onchange={(auto, color) => updateShader({ auto, color })}
    />
    <SettingsRow
      title={$LL.settings.shaderSpeed()}
      helpText={$LL.settings.shaderSpeedHelp()}
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
      title={$LL.settings.maximumFps()}
      helpText={$LL.settings.maximumFpsHelp()}
      controlId='shader-fps'
    >
      <ToggleGroup.Root
        type='single'
        value={String(
          settings.background.targetFps ?? BACKGROUND_DEFAULTS.shader.targetFps,
        )}
        onValueChange={v => updateShader({
          targetFps: Number(v),
        })}
        id='shader-fps'
        aria-labelledby='shader-fps-title'
        aria-describedby='shader-fps-help'
      >
        {#each [15, 30, 60, 120, 0] as value (value)}
          <ToggleGroup.Item value={String(value)} class='grow'>
            {value === 0
              ? $LL.settings.auto()
              : value}
          </ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <SettingsRow
      title={$LL.settings.opacity()}
      helpText={$LL.settings.shaderOpacityHelp()}
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
      title={$LL.settings.maximumRenderScale()}
      helpText={$LL.settings.maximumRenderScaleHelp()}
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
        aria-label={$LL.settings.animatedBackgroundPerformance()}
      >
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>{$LL.settings.metricFps()}</div>
          <div
            class='font-mono tabular-nums {metrics.level === 'frozen'
              ? 'text-(--destructive)'
              : levelFps(metrics.fps, metrics.targetFps) === 'danger'
              ? 'text-(--destructive)'
              : levelFps(metrics.fps, metrics.targetFps) === 'warn'
              ? 'text-(--warn)'
              : 'text-(--foreground)'}'
          >
            {metrics.level === 'frozen'
              ? '—'
              : metrics.fps.toFixed(0)}
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>{$LL.settings.metricFrame()}</div>
          <div
            class='font-mono tabular-nums {levelFrame(metrics.frameMs, metrics.nominalMs) === 'danger'
              ? 'text-(--destructive)'
              : levelFrame(metrics.frameMs, metrics.nominalMs) === 'warn'
              ? 'text-(--warn)'
              : 'text-(--foreground)'}'
          >
            {metrics.frameMs.toFixed(1)} ms
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>{$LL.settings.metricWorst()}</div>
          <div
            class='font-mono tabular-nums {levelWorst(metrics.worstMs, metrics.nominalMs) === 'danger'
              ? 'text-(--destructive)'
              : levelWorst(metrics.worstMs, metrics.nominalMs) === 'warn'
              ? 'text-(--warn)'
              : 'text-(--foreground)'}'
          >
            {metrics.worstMs.toFixed(1)} ms
          </div>
        </div>
        <div class='rounded-sm border border-(--border) p-2'>
          <div class='text-[9px] text-(--muted-foreground)'>{$LL.settings.metricPriority()}</div>
          <div
            class='font-mono tabular-nums {metrics.level === 'frozen'
              ? 'text-(--destructive)'
              : metrics.level === 'reduced'
              ? 'text-(--warn)'
              : 'text-(--foreground)'}'
          >
            {metrics.quality === 'motion'
              ? $LL.settings.frameRate()
              : $LL.settings.resolution()} · {metrics.level}
          </div>
        </div>
      </div>
    {:else}
      <p class='p-4 text-[10px] leading-relaxed text-(--muted-foreground)'>
        {$LL.settings.noAnimatedBackground()}
      </p>
    {/if}
    <SettingsRow
      title={$LL.settings.mouseInteraction()}
      helpText={$LL.settings.mouseInteractionHelp()}
      controlId='shader-mouse'
      disabled={busy}
    >
      <input
        id='shader-mouse'
        type='checkbox'
        role='switch'
        aria-describedby='shader-mouse-help'
        checked={settings.background.mouseInteraction
          ?? BACKGROUND_DEFAULTS.shader.mouseInteraction}
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
        aria-label={$LL.settings.imageSource()}
        value={sourceTab}
        class='w-full'
        disabled={busy || uploading}
        onValueChange={(v) => {
          if (v === 'upload' || v === 'url')
            sourceTab = v
        }}
      >
        <ToggleGroup.Item value='upload' class='grow'>{$LL.settings.upload()}</ToggleGroup.Item>
        <ToggleGroup.Item value='url' class='grow'>{$LL.settings.fromUrl()}</ToggleGroup.Item>
      </ToggleGroup.Root>

      {#if sourceTab === 'upload'}
        <p
          class='
            mt-4 mb-2 text-[0.5rem] font-semibold tracking-widest
            text-(--muted-foreground)
          '
        >
          {$LL.settings.imageFile()}
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
            {uploading
              ? $LL.settings.reading()
              : $LL.settings.clickToBrowse()}
          </span>
          <span id='image-upload-help' class='text-xs text-(--muted-foreground)'>
            {$LL.settings.imageUploadHelp()}
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
          {$LL.settings.imageUrl()}
        </label>
        <div class='flex items-center gap-2'>
          <Input
            id='image-url'
            type='text'
            inputmode='url'
            placeholder={isStoredMedia(bg.url)
              ? $LL.settings.uploadedImageInUse()
              : $LL.settings.imageUrlPlaceholder()}
            class='min-w-0 flex-1 text-sm'
            value={urlDraft}
            disabled={busy || uploading}
            aria-invalid={urlError !== ''
              ? 'true'
              : undefined}
            aria-describedby={urlError !== ''
              ? 'image-url-help image-url-error'
              : 'image-url-help'}
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
            {checking
              ? $LL.settings.checking()
              : $LL.settings.apply()}
          </Button>
        </div>
        <p id='image-url-help' class='mt-2 text-xs text-(--muted-foreground)'>
          {$LL.settings.imageAddressHelp()}
        </p>
      {/if}
    </div>

    {#if urlError !== ''}
      <p id='image-url-error' role='alert' class='border-t border-(--border) px-4 py-2 text-xs text-(--destructive)'>
        {urlError}
      </p>
    {/if}
    <SettingsRow
      title={$LL.settings.fit()}
      helpText={$LL.settings.fitHelp()}
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
          const fit = FITS.find(candidate => candidate === v)
          if (fit)
            updateImage({ fit })
        }}
      >
        {#each FITS as fit (fit)}
          <ToggleGroup.Item value={fit} class='grow'>{$LL.settings[fit === 'cover'
            ? 'fitCover'
            : fit === 'contain'
            ? 'fitContain'
            : 'fitFill']()}</ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <BaseColorMode
      auto={bg.auto ?? BACKGROUND_DEFAULTS.image.auto}
      color={bg.color}
      busy={busy || uploading}
      idPrefix='image-background'
      onchange={(auto, color) => updateImage({ auto, color })}
    />
    <SettingsRow
      title={$LL.settings.opacity()}
      helpText={$LL.settings.imageOpacityHelp()}
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
      title={$LL.settings.parallax()}
      helpText={settings.reducedMotion
        ? $LL.settings.parallaxDisabledHelp()
        : $LL.settings.parallaxHelp()}
      controlId='image-parallax'
      disabled={busy || uploading || settings.reducedMotion}
    >
      <input
        id='image-parallax'
        type='checkbox'
        role='switch'
        aria-describedby='image-parallax-help'
        checked={bg.parallax ?? BACKGROUND_DEFAULTS.image.parallax}
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
    {@const parallaxDisabled = uploading || settings.reducedMotion
      || !(bg.parallax ?? BACKGROUND_DEFAULTS.image.parallax)}
    <SettingsRow
      title={$LL.settings.parallaxZoom()}
      helpText={$LL.settings.parallaxZoomHelp()}
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
        title={$LL.settings.removeImage()}
        helpText={$LL.settings.removeImageHelp()}
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
          {$LL.settings.removeImage()}
        </Button>
      </SettingsRow>
    {/if}
  {/if}

  {#if settings.background.type === 'youtube'}
    {@const bg = settings.background}
    <div class='px-4 py-3'>
      <label
        for='youtube-url'
        class='
          mt-1 mb-2 block text-[0.5rem] font-semibold tracking-widest
          text-(--muted-foreground)
        '
      >
        {$LL.settings.youtubeUrl()}
      </label>
      <div class='flex items-center gap-2'>
        <Input
          id='youtube-url'
          type='text'
          inputmode='url'
          placeholder={$LL.settings.youtubeUrlPlaceholder()}
          class='min-w-0 flex-1 text-sm'
          value={youtubeUrlDraft}
          disabled={busy}
          aria-invalid={youtubeUrlError !== ''
            ? 'true'
            : undefined}
          aria-describedby={youtubeUrlError !== ''
            ? 'youtube-url-help youtube-url-error'
            : 'youtube-url-help'}
          oninput={(event) => {
            youtubeUrlDraft = event.currentTarget.value
            youtubeUrlDirty = true
            youtubeUrlError = ''
          }}
          onkeydown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              commitYoutubeUrl()
            }
          }}
        />
        <Button
          variant='default'
          size='sm'
          class='h-9 px-4'
          disabled={busy}
          onclick={commitYoutubeUrl}
        >
          {$LL.settings.apply()}
        </Button>
      </div>
      <p id='youtube-url-help' class='mt-2 text-xs text-(--muted-foreground)'>
        {$LL.settings.youtubeAddressHelp()}
      </p>
    </div>

    {#if youtubeUrlError !== ''}
      <p id='youtube-url-error' role='alert' class='border-t border-(--border) px-4 py-2 text-xs text-(--destructive)'>
        {youtubeUrlError}
      </p>
    {/if}
    <SettingsRow
      title={$LL.settings.fit()}
      helpText={$LL.settings.fitHelp()}
      controlId='youtube-fit'
      disabled={busy}
    >
      <ToggleGroup.Root
        type='single'
        id='youtube-fit'
        aria-labelledby='youtube-fit-title'
        aria-describedby='youtube-fit-help'
        value={bg.fit ?? 'cover'}
        disabled={busy}
        onValueChange={(v) => {
          const fit = FITS.find(candidate => candidate === v)
          if (fit)
            updateYoutube({ fit })
        }}
      >
        {#each FITS as fit (fit)}
          <ToggleGroup.Item value={fit} class='grow'>{$LL.settings[fit === 'cover'
            ? 'fitCover'
            : fit === 'contain'
            ? 'fitContain'
            : 'fitFill']()}</ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <BaseColorMode
      auto={bg.auto ?? BACKGROUND_DEFAULTS.youtube.auto}
      color={bg.color}
      {busy}
      idPrefix='youtube-background'
      onchange={(auto, color) => updateYoutube({ auto, color })}
    />
    <SettingsRow
      title={$LL.settings.opacity()}
      helpText={$LL.settings.youtubeOpacityHelp()}
      controlId='youtube-opacity'
      disabled={busy}
    >
      <span>{Math.round(youtubeOpacityDraft * 100)}%</span>
      <Slider
        id='youtube-opacity'
        aria-labelledby='youtube-opacity-title'
        aria-describedby='youtube-opacity-help'
        type='single'
        value={youtubeOpacityDraft}
        min={0.0}
        max={1.0}
        step={0.1}
        class='w-32'
        onValueChange={dragYoutubeOpacity}
        onValueCommit={finishYoutubeOpacityDrag}
      />
    </SettingsRow>
    <SettingsRow
      title={$LL.settings.parallax()}
      helpText={settings.reducedMotion
        ? $LL.settings.parallaxDisabledHelp()
        : $LL.settings.parallaxHelp()}
      controlId='youtube-parallax'
      disabled={busy || settings.reducedMotion}
    >
      <input
        id='youtube-parallax'
        type='checkbox'
        role='switch'
        aria-describedby='youtube-parallax-help'
        checked={bg.parallax ?? BACKGROUND_DEFAULTS.youtube.parallax}
        disabled={busy || settings.reducedMotion}
        onchange={event => updateYoutube({ parallax: event.currentTarget.checked })}
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
    {@const youtubeParallaxDisabled = settings.reducedMotion
      || !(bg.parallax ?? BACKGROUND_DEFAULTS.youtube.parallax)}
    <SettingsRow
      title={$LL.settings.parallaxZoom()}
      helpText={$LL.settings.parallaxZoomHelp()}
      controlId='youtube-parallax-zoom'
      disabled={youtubeParallaxDisabled}
    >
      <span>{String(Number(youtubeZoomDraft.toFixed(2)))}x</span>
      <Slider
        id='youtube-parallax-zoom'
        aria-labelledby='youtube-parallax-zoom-title'
        aria-describedby='youtube-parallax-zoom-help'
        type='single'
        value={youtubeZoomDraft}
        min={1}
        max={4}
        step={0.25}
        class='w-32'
        disabled={youtubeParallaxDisabled}
        onValueChange={dragYoutubeZoom}
        onValueCommit={finishYoutubeZoomDrag}
      />
    </SettingsRow>
    <SettingsRow
      title={$LL.settings.pauseAnimatedBackground()}
      helpText={$LL.settings.pauseAnimatedBackgroundHelp()}
      controlId='youtube-paused'
      disabled={busy}
    >
      <input
        id='youtube-paused'
        type='checkbox'
        role='switch'
        aria-describedby='youtube-paused-help'
        checked={bg.paused ?? BACKGROUND_DEFAULTS.youtube.paused}
        disabled={busy}
        onchange={event => updateYoutube({ paused: event.currentTarget.checked })}
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
    <SettingsRow
      title={$LL.settings.playbackSpeed()}
      helpText={$LL.settings.playbackSpeedHelp()}
      controlId='youtube-speed'
      disabled={busy}
    >
      <ToggleGroup.Root
        type='single'
        id='youtube-speed'
        aria-labelledby='youtube-speed-title'
        aria-describedby='youtube-speed-help'
        value={String(bg.playbackRate ?? BACKGROUND_DEFAULTS.youtube.playbackRate)}
        disabled={busy}
        onValueChange={(v) => {
          const rate = PLAYBACK_RATES.find(candidate => String(candidate) === v)
          if (rate !== undefined)
            updateYoutube({ playbackRate: rate })
        }}
      >
        {#each PLAYBACK_RATES as rate (rate)}
          <ToggleGroup.Item value={String(rate)} class='grow'>{rate}×</ToggleGroup.Item>
        {/each}
      </ToggleGroup.Root>
    </SettingsRow>
    <SettingsRow
      title={$LL.settings.playlistOrder()}
      helpText={$LL.settings.playlistOrderHelp()}
      controlId='youtube-playlist-order'
      disabled={busy}
    >
      <ToggleGroup.Root
        type='single'
        id='youtube-playlist-order'
        aria-labelledby='youtube-playlist-order-title'
        aria-describedby='youtube-playlist-order-help'
        value={bg.playlistOrder ?? BACKGROUND_DEFAULTS.youtube.playlistOrder}
        disabled={busy}
        onValueChange={(v) => {
          const order = PLAYLIST_ORDERS.find(candidate => candidate === v)
          if (order)
            updateYoutube({ playlistOrder: order })
        }}
      >
        <ToggleGroup.Item value='shuffle' class='grow'>{$LL.settings.playlistOrderShuffle()}</ToggleGroup.Item>
        <ToggleGroup.Item value='sequential' class='grow'>{$LL.settings.playlistOrderInOrder()}</ToggleGroup.Item>
      </ToggleGroup.Root>
    </SettingsRow>
  {/if}

</CollapsibleSection>
