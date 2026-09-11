/**
 * Build-time switch used only to preview the Pro shell/paywall during QA.
 *
 * Important: this module intentionally contains no fake AI responses, plans,
 * recommendations, or executable preview actions. All intelligence must come
 * from the real LifeOS Agent and real LifeOS data.
 */
export function isProPreviewBuild(): boolean {
  return String((import.meta as any).env?.VITE_LIFEOS_PRO_PREVIEW || '').trim().toLowerCase() === 'true';
}
