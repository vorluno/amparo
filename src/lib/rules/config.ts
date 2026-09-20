import type { RulesConfig } from './types'

export const DEFAULT_RULES_CONFIG: RulesConfig = {
  carenciaGeneralDias: 30,
  carenciaPreexistenciaDias: 730,
  umbralConfianza: 0.7,
  tiposQueEximenCarencia: ['Emergencia'],
  lockMinutos: 2,
}
