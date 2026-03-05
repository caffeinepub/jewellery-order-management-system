import type { DesignMapping, MasterDesignMapping } from "../backend";

/**
 * Resolves the karigar name for a given design code by looking it up
 * in the master design mappings. Returns 'Unassigned' if not found.
 *
 * This is the single source of truth for karigar resolution.
 * Never read karigar from the stored order record.
 */
export function resolveKarigar(
  designCode: string,
  mappings: Map<string, DesignMapping>,
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
 * Resolves the generic name for a given design code by looking it up
 * in the master design mappings. Returns empty string if not found.
 *
 * This is the single source of truth for generic name resolution.
 * Never read genericName from the stored order record.
 */
export function resolveGenericName(
  designCode: string,
  mappings: Map<string, DesignMapping>,
): string {
  if (!designCode) return "";
  const normalizedCode = designCode.toUpperCase().trim();
  const mapping = mappings.get(normalizedCode);
  if (!mapping || !mapping.genericName || mapping.genericName.trim() === "") {
    return "";
  }
  return mapping.genericName.trim();
}

/**
 * Builds a Map<normalizedDesignCode, DesignMapping> from the raw
 * getAllMasterDesignMappings() response for fast O(1) lookups.
 * Supports both legacy tuple format and new MasterDesignMapping[] format.
 */
export function buildDesignMappingsMap(
  rawMappings: MasterDesignMapping[] | [string, DesignMapping][],
): Map<string, DesignMapping> {
  const map = new Map<string, DesignMapping>();
  const now = BigInt(Date.now()) * BigInt(1_000_000);
  for (const entry of rawMappings) {
    if (Array.isArray(entry)) {
      // Legacy tuple format: [designCode, DesignMapping]
      const [designCode, mapping] = entry as [string, DesignMapping];
      map.set(designCode.toUpperCase().trim(), mapping);
    } else {
      // New MasterDesignMapping format
      const m = entry as MasterDesignMapping;
      const fakeMapping: DesignMapping = {
        designCode: m.designCode,
        genericName: m.genericName,
        karigarName: m.karigar,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
      };
      map.set(m.designCode.toUpperCase().trim(), fakeMapping);
    }
  }
  return map;
}
