import { DesignMapping } from "../backend";

/**
 * Resolves the karigar name for a given design code by looking it up
 * in the master design mappings. Returns 'Unassigned' if not found.
 *
 * This is the single source of truth for karigar resolution.
 * Never read karigar from the stored order record.
 */
export function resolveKarigar(
  designCode: string,
  mappings: Map<string, DesignMapping>
): string {
  if (!designCode) return "Unassigned";
  const normalizedCode = designCode.toUpperCase().trim();
  const mapping = mappings.get(normalizedCode);
  if (!mapping || !mapping.karigarName || mapping.karigarName.trim() === "") {
    return "Unassigned";
  }
  return mapping.karigarName.trim();
}

/**
 * Builds a Map<normalizedDesignCode, DesignMapping> from the raw
 * getAllMasterDesignMappings() response for fast O(1) lookups.
 */
export function buildDesignMappingsMap(
  rawMappings: [string, DesignMapping][]
): Map<string, DesignMapping> {
  const map = new Map<string, DesignMapping>();
  for (const [designCode, mapping] of rawMappings) {
    map.set(designCode.toUpperCase().trim(), mapping);
  }
  return map;
}
