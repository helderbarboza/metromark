<script lang='ts'>
  import type { ShaderDefinition } from '$lib/shaders'
  import { defaultShader } from '$lib/shaders'

  interface Props {
    reducedMotion?: boolean
    shader?: ShaderDefinition
    /** Base color under the shader layer */
    color?: string
    /** Shader animation speed factor */
    speed?: number
    /** Maximum shader frames per second */
    targetFps?: number
    /** Shader layer opacity over the base color */
    opacity?: number
  }

  const {
    reducedMotion = false,
    shader = defaultShader,
    color,
    speed = 1,
    targetFps = 60,
    opacity = 1,
  }: Props = $props()

  let canvas = $state<HTMLCanvasElement | null>(null)
  // The parent passes props as getters over its snapshot. Track a derived boolean
  // so snapshot updates that do not change this setting keep the WebGL context
  // and the animation time.
  const motion = $derived(reducedMotion)

  function createShader(
    gl: WebGLRenderingContext,
    type: number,
    source: string,
  ): WebGLShader | null {
    const shader = gl.createShader(type)
    if (!shader)
      return null
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const info = gl.getShaderInfoLog(shader)
      gl.deleteShader(shader)
      throw new Error(`Unable to compile the background shader: ${info ?? 'unknown error'}`)
    }
    return shader
  }

  function createProgram(gl: WebGLRenderingContext, definition: ShaderDefinition): WebGLProgram {
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, definition.vertexShader)
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, definition.fragmentShader)
    if (!vertexShader || !fragmentShader)
      throw new Error('Unable to compile the background shaders.')
    const program = gl.createProgram()
    if (!program)
      throw new Error('Unable to create the background shader program.')
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const info = gl.getProgramInfoLog(program)
      throw new Error(`Unable to link the background shader: ${info ?? 'unknown error'}`)
    }
    return program
  }

  $effect(() => {
    const element = canvas
    const paused = motion
    const definition = shader
    if (!element)
      return

    const gl: WebGLRenderingContext | null = element.getContext('webgl', {
      alpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      preserveDrawingBuffer: false,
    })
    if (!gl)
      return
    const program = createProgram(gl, definition)
    gl.useProgram(program)
    const positionBuffer = gl.createBuffer()
    if (!positionBuffer)
      throw new Error('Unable to create the background shader buffer.')
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW,
    )
    const positionLocation = gl.getAttribLocation(program, 'aPosition')
    if (positionLocation === -1)
      throw new Error('The background shader has no position attribute.')
    gl.enableVertexAttribArray(positionLocation)
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
    const iResolutionLocation = gl.getUniformLocation(program, 'iResolution')
    const iTimeLocation = gl.getUniformLocation(program, 'iTime')
    const iMouseLocation = gl.getUniformLocation(program, 'iMouse')
    if (!iResolutionLocation || !iTimeLocation)
      return

    let animationFrame = 0
    let elapsed = 0
    let lastTime = 0
    let lastRender = 0
    let staticRendered = false
    let pointerX = 0
    let pointerY = 0
    let pointerDown = false

    const resize = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      element.width = Math.max(1, Math.round(width * pixelRatio))
      element.height = Math.max(1, Math.round(height * pixelRatio))
      gl.viewport(0, 0, element.width, element.height)
    }

    const render = (time: number) => {
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
      gl.enableVertexAttribArray(positionLocation)
      gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0)
      gl.uniform3f(iResolutionLocation, element.width, element.height, 1)
      gl.uniform1f(iTimeLocation, time)
      if (iMouseLocation)
        gl.uniform4f(iMouseLocation, pointerX, pointerY, pointerDown ? 1 : 0, 0)
      gl.viewport(0, 0, element.width, element.height)
      gl.clearColor(0, 0, 0, 1)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }

    const frame = (now: number) => {
      animationFrame = requestAnimationFrame(frame)
      const delta = lastTime === 0 ? 0 : (now - lastTime) / 1000
      lastTime = now
      elapsed += delta * speed
      if (targetFps <= 0) {
        if (!staticRendered) {
          render(elapsed)
          staticRendered = true
        }
        return
      }
      staticRendered = false
      // Allow a small margin so a 60 FPS cap does not halve the frame rate.
      if (now - lastRender < 1000 / targetFps - 1)
        return
      lastRender = now
      render(elapsed)
    }

    const startAnimation = () => {
      if (animationFrame !== 0)
        return
      lastTime = 0
      lastRender = 0
      animationFrame = requestAnimationFrame(frame)
    }

    const stopAnimation = () => {
      if (animationFrame === 0)
        return
      cancelAnimationFrame(animationFrame)
      animationFrame = 0
    }

    const observer = new ResizeObserver(resize)
    observer.observe(element)

    const handlePointerMove = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      pointerX = event.clientX - rect.left
      pointerY = rect.bottom - event.clientY
      pointerDown = event.buttons > 0
    }
    const handlePointerDown = (event: PointerEvent) => {
      const rect = element.getBoundingClientRect()
      pointerX = event.clientX - rect.left
      pointerY = rect.bottom - event.clientY
      pointerDown = true
    }
    const handlePointerUp = () => {
      pointerDown = false
    }
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('pointerup', handlePointerUp)

    if (paused) {
      stopAnimation()
      render(0)
    }
    else {
      startAnimation()
    }

    return () => {
      stopAnimation()
      observer.disconnect()
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('pointerup', handlePointerUp)
      gl.deleteBuffer(positionBuffer)
      gl.deleteProgram(program)
    }
  })
</script>

<div
  class='pointer-events-none absolute inset-0 -z-1'
  style:background={color}
  aria-hidden='true'
>
  <canvas
    bind:this={canvas}
    class='absolute inset-0 size-full'
    style:opacity={opacity}
    aria-hidden='true'
  ></canvas>
</div>
