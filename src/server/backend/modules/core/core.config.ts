export const CORE_MODULE_OPTIONS = Symbol('CORE_MODULE_OPTIONS')

export interface CoreModuleConfig {
  jwtSecret: string
}
