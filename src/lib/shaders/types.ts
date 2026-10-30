export interface ShaderDefinition {
  /** Stable identifier used for selection and persistence */
  id: string
  /** Human-readable name */
  name: string
  /** GLSL vertex shader source */
  vertexShader: string
  /** GLSL fragment shader source */
  fragmentShader: string
}
