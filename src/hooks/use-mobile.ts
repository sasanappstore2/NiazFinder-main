import * as React from "react"

/** Tablet and below — aligns with layout `md` (768px). */
const MOBILE_BREAKPOINT = 768

/**
 * Viewport < md. Starts `false` on SSR and first client paint (hydration-safe),
 * then updates after mount — same pattern as `useDeviceTier`.
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    onChange()
    mql.addEventListener("change", onChange)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return isMobile
}
