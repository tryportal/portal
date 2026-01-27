"use client"

import { useSyncExternalStore, useCallback } from "react"

/**
 * Hover Coordinator
 * 
 * A centralized external store for managing which message is currently hovered.
 * Uses useSyncExternalStore for optimal React 18+ performance.
 * 
 * Benefits:
 * - Single source of truth for hover state
 * - No prop drilling or context re-renders
 * - Only the hovered message and previously hovered message re-render
 * - Avoids the "many subscribers" problem with context
 */

// =============================================================================
// EXTERNAL STORE
// =============================================================================

type Listener = () => void

interface HoverStore {
  hoveredId: string | null
  listeners: Set<Listener>
  subscribe: (listener: Listener) => () => void
  getSnapshot: () => string | null
  getServerSnapshot: () => string | null
  setHoveredId: (id: string | null) => void
}

/**
 * Creates a hover store instance.
 * We use a factory function to allow for testing and SSR isolation.
 */
function createHoverStore(): HoverStore {
  let hoveredId: string | null = null
  const listeners = new Set<Listener>()

  return {
    hoveredId,
    listeners,

    subscribe(listener: Listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },

    getSnapshot() {
      return hoveredId
    },

    getServerSnapshot() {
      // No hover state on server
      return null
    },

    setHoveredId(id: string | null) {
      if (hoveredId !== id) {
        hoveredId = id
        // Batch notify all listeners
        listeners.forEach((listener) => listener())
      }
    },
  }
}

// Singleton instance for the application
const hoverStore = createHoverStore()

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Returns the currently hovered message ID.
 * Components using this will re-render when the hovered ID changes.
 */
export function useHoveredMessageId(): string | null {
  return useSyncExternalStore(
    hoverStore.subscribe,
    hoverStore.getSnapshot,
    hoverStore.getServerSnapshot
  )
}

/**
 * Returns whether a specific message is currently hovered.
 * Optimized to only cause re-renders when this specific message's
 * hover state changes, not when any hover changes.
 */
export function useIsMessageHovered(messageId: string): boolean {
  const subscribe = useCallback(
    (listener: Listener) => {
      return hoverStore.subscribe(listener)
    },
    []
  )

  const getSnapshot = useCallback(() => {
    return hoverStore.getSnapshot() === messageId
  }, [messageId])

  const getServerSnapshot = useCallback(() => false, [])

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/**
 * Returns a stable setter function for updating the hovered message.
 * This function reference never changes, making it safe for event handlers.
 */
export function useSetHoveredMessage(): (id: string | null) => void {
  // Return the store's setter directly - it's already stable
  return hoverStore.setHoveredId
}

/**
 * Combined hook that returns both the check and setter for a specific message.
 * Useful for message items that need to both check and set hover state.
 */
export function useMessageHover(messageId: string): {
  isHovered: boolean
  setHovered: (hovered: boolean) => void
} {
  const isHovered = useIsMessageHovered(messageId)
  const setHoveredId = useSetHoveredMessage()

  const setHovered = useCallback(
    (hovered: boolean) => {
      if (hovered) {
        setHoveredId(messageId)
      } else {
        // Only clear if we're the currently hovered message
        if (hoverStore.getSnapshot() === messageId) {
          setHoveredId(null)
        }
      }
    },
    [messageId, setHoveredId]
  )

  return { isHovered, setHovered }
}

// =============================================================================
// DIRECT ACCESS (for imperative code)
// =============================================================================

/**
 * Directly get the current hovered message ID.
 * Use sparingly - prefer the hooks for reactive updates.
 */
export function getHoveredMessageId(): string | null {
  return hoverStore.getSnapshot()
}

/**
 * Directly set the hovered message ID.
 * Use sparingly - prefer the hooks for consistency.
 */
export function setHoveredMessageId(id: string | null): void {
  hoverStore.setHoveredId(id)
}
