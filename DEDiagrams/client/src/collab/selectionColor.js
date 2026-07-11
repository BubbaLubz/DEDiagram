// Small, visually distinct set — picked for contrast against the dark
// canvas background rather than matching the amber accent (that's reserved
// for the local user's own selection/hover state).
export const SELECTION_COLOR_PALETTE = ['#7FA6C9', '#C98D7F', '#8FB89A', '#B48FC9', '#C9A45E', '#6FA3A0', '#C97F9E', '#9FB4D8'];

// Same user always gets the same color across reconnects/sessions, keyed by
// their stable auth id (not the ephemeral per-tab connectionId).
export function colorForUserId(id) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) | 0;
  return SELECTION_COLOR_PALETTE[Math.abs(hash) % SELECTION_COLOR_PALETTE.length];
}
