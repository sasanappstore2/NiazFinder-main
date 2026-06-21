import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Bottom padding for sheets/drawers/sticky bars — clears home indicator + optional extra gap. */
export function sheetSafeAreaClass(extra = "1rem"): string {
  return `pb-[max(${extra},env(safe-area-inset-bottom,0px))]`
}
