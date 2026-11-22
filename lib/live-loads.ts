/**
 * LiveLoadsPort — single seam for live board search/detail.
 * Soft/DAT stay behind adapters in laneora.ts; consumers import from here.
 */
export {
  type LaneoraPlace,
  type LaneoraPlaceObject,
  type LaneoraSearchBody,
  type LaneoraSearchResult,
  type PublicLoadDetail,
  type LaneoraDetailResult,
  LaneoraApiError,
  laneoraConfig,
  laneoraConfigured,
  searchLoads,
  getLoadDetail,
  toPublicLoadDetail,
  mapEquipmentCodes,
  equipmentChoicesForLaneora,
  mapLaneoraLoad,
  isLaneoraUnavailable,
  invalidateToken,
} from "@/lib/laneora";

export { cacheLiveLoads, getCachedLiveLoad } from "@/lib/live-load-cache";
