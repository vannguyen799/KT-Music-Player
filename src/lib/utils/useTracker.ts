import type { DisputeEventType } from '@vannguyen799/dispute-evidence-tracker'
import { trackClientEvent } from './activity-tracker'

/**
 * Public API for manual event tracking from Svelte components.
 *
 * @example
 * ```svelte
 * <script>
 * import { trackEvent, trackClick } from '$lib/utils/useTracker'
 *
 * function onAction() {
 *   trackClick('upgrade-button', 'pricing')
 * }
 * </script>
 * ```
 */
export function trackEvent(eventType: DisputeEventType, metadata?: Record<string, unknown>) {
  trackClientEvent(eventType, metadata)
}

export function trackClick(target: string, section?: string) {
  trackClientEvent('usage.click', { target, section })
}

export function trackFormInteraction(formId: string, action: 'focus' | 'blur' | 'submit', fieldCount?: number) {
  trackClientEvent('usage.form.interact', { formId, action, fieldCount })
}
