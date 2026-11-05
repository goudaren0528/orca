import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { AgentSessionRewindSurface } from '../../../../../src/shared/agent-session/lifecycle/agent-session-rewind-request'

export type MobileNativeChatRewindDialogState =
  | { kind: 'confirm'; answer: (confirmed: boolean) => void }
  | { kind: 'notice'; message: string }

/** Holds desktop's Rewind question above the rows, so a recycled row can't strand it. */
export function useMobileNativeChatRewindDialog(rewind: AgentSessionRewindSurface | undefined): {
  openRewind: (itemId: string) => void
  dialog: MobileNativeChatRewindDialogState | null
  close: (confirmed: boolean) => void
} {
  // Read through a ref: the surface changes as the transcript streams, the opener must not.
  const latest = useRef(rewind)
  useLayoutEffect(() => {
    latest.current = rewind
  }, [rewind])
  const [dialog, setDialog] = useState<MobileNativeChatRewindDialogState | null>(null)
  const pending = useRef<MobileNativeChatRewindDialogState | null>(null)
  useLayoutEffect(() => {
    pending.current = dialog
  }, [dialog])
  // A chat closed mid-question cancels, so the rewind's single-flight hold is released.
  useEffect(
    () => () => {
      if (pending.current?.kind === 'confirm') {
        pending.current.answer(false)
      }
    },
    []
  )
  const openRewind = useCallback((itemId: string) => {
    const surface = latest.current
    if (!surface) {
      return
    }
    if (surface.disabledReason) {
      setDialog({ kind: 'notice', message: surface.disabledReason })
      return
    }
    void surface.request(
      itemId,
      () => new Promise<boolean>((answer) => setDialog({ kind: 'confirm', answer }))
    )
  }, [])
  const close = useCallback((confirmed: boolean) => {
    if (pending.current?.kind === 'confirm') {
      pending.current.answer(confirmed)
    }
    pending.current = null
    setDialog(null)
  }, [])
  return { openRewind, dialog, close }
}
