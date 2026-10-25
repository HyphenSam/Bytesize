import { parseSettings } from '@/lib/settings'
import { useRemembered } from './useRemembered'

/** The settings, remembered in this browser. */
export function useSettings() {
  return useRemembered('bytesize:settings', parseSettings)
}
