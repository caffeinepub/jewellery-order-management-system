import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AppRole,
  type AppStatus,
  type AppUser,
  type DesignMapping,
  type MappingRecord,
  type MasterDesignMapping,
  type Order,
  OrderStatus,
  type OrderType,
} from "../backend";
import {
  buildDesignMappingsMap,
  resolveGenericName,
  resolveKarigar,
} from "../utils/karigarResolver";
import { useActor } from "./useActor";

// ─── Query Hooks ────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["allOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOrders(
  statusFilter?: OrderStatus,
  typeFilter?: OrderType,
  searchText?: string,
) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders", statusFilter, typeFilter, searchText],
    queryFn: async () => {
      if (!actor) return [];
      // Fall back to getAllOrders if getOrders doesn't exist
      try {
        const a = actor as any;
        if (typeof a.getOrders === "function") {
          return a.getOrders(
            statusFilter ?? null,
            typeFilter ?? null,
            searchText ?? null,
          );
        }
      } catch {
        // ignore
      }
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReadyOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["readyOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReadyOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetKarigars() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["karigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getKarigars();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUniqueKarigarsFromDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["uniqueKarigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUniqueKarigarsFromDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

// getMasterDesigns now returns string[] not tuples
export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["masterDesigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

// getAllMasterDesignMappings now returns MasterDesignMapping[] not tuples
// We adapt callers to work with the new shape
export function useGetAllDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<MasterDesignMapping[]>({
    queryKey: ["designMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias used by MasterDesigns.tsx
export const useGetAllMasterDesignMappings = useGetAllDesignMappings;

export function useGetOrdersWithMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["ordersWithMappings"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const a = actor as any;
        if (typeof a.getOrdersWithMappings === "function") {
          return a.getOrdersWithMappings();
        }
      } catch {
        // ignore
      }
      return actor.getAllOrders();
    },
    enabled: !!actor && !isFetching,
  });
}

// Used by UnmappedSection
// An order is "unmapped" only if its design code has NO entry in master design mappings.
// We must NOT check order.karigarName / order.genericName because those are stored at
// ingest time and may be stale — master design mappings are the single source of truth.
export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const [allOrders, rawMappings] = await Promise.all([
        actor.getAllOrders(),
        actor.getAllMasterDesignMappings(),
      ]);
      // Build a set of known design codes from master mappings
      const mappedCodes = new Set(
        rawMappings.map((m) => m.designCode.toUpperCase().trim()),
      );
      // Only show pending orders whose design code is not in master mappings
      return allOrders.filter(
        (o) =>
          o.status === OrderStatus.Pending &&
          !mappedCodes.has(o.design.toUpperCase().trim()),
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor || !designCode) return null;
      try {
        const a = actor as any;
        const blob =
          typeof a.getDesignImage === "function"
            ? await a.getDesignImage(designCode)
            : null;
        if (!blob) return null;
        // getAllMasterDesignMappings now returns MasterDesignMapping[]
        const mappings = await actor.getAllMasterDesignMappings();
        const entry = mappings.find((m) => m.designCode === designCode);
        const genericName = entry?.genericName ?? "";
        const karigarName = entry?.karigar ?? "";
        return { blob, genericName, karigarName };
      } catch {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

// getDesignImageMapping now returns [(string, DesignMapping)]
export function useGetDesignImageMapping() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["designImageMapping"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignImageMapping();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUnreturnedOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["unreturnedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const a = actor as any;
        if (typeof a.getUnreturnedOrders === "function") {
          return a.getUnreturnedOrders();
        }
      } catch {
        // ignore
      }
      return [];
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReadyOrdersByDateRange() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: bigint;
      endDate: bigint;
    }) => {
      if (!actor) return [];
      try {
        const a = actor as any;
        if (typeof a.getReadyOrdersByDateRange === "function") {
          return a.getReadyOrdersByDateRange(startDate, endDate);
        }
      } catch {
        // ignore
      }
      return [];
    },
  });
}

export function useGetMasterDesignExcel() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["masterDesignExcel"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor && !isFetching,
  });
}

/**
 * Returns a Map<normalizedDesignCode, DesignMapping> built from the latest
 * master design mappings. Adapts from new MasterDesignMapping[] format.
 */
export function useDesignMappingsMap() {
  const { data: rawMappings = [] } = useGetAllDesignMappings();
  // Convert MasterDesignMapping[] to the DesignMapping map format
  return buildDesignMappingsMapFromMaster(rawMappings);
}

/**
 * Converts MasterDesignMapping[] to Map<string, DesignMapping> for resolver
 */
function buildDesignMappingsMapFromMaster(
  rawMappings: MasterDesignMapping[],
): Map<string, DesignMapping> {
  const map = new Map<string, DesignMapping>();
  const now = BigInt(Date.now()) * BigInt(1_000_000);
  for (const m of rawMappings) {
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
  return map;
}

/**
 * Returns a resolver function: (designCode: string) => string
 * that dynamically resolves karigar from master design mappings.
 * Always uses the latest master design data — never the stored order field.
 */
export function useKarigarResolver() {
  const mappingsMap = useDesignMappingsMap();
  return (designCode: string): string =>
    resolveKarigar(designCode, mappingsMap);
}

/**
 * Returns a resolver function: (designCode: string) => string
 * that dynamically resolves generic name from master design mappings.
 * Always uses the latest master design data — never the stored order field.
 */
export function useGenericNameResolver() {
  const mappingsMap = useDesignMappingsMap();
  return (designCode: string): string =>
    resolveGenericName(designCode, mappingsMap);
}

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();
  const { data: rawMappings = [] } = useGetAllDesignMappings();

  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName, rawMappings.length],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getAllOrders();
      const mappingsMap = buildDesignMappingsMapFromMaster(rawMappings);
      return allOrders.filter(
        (o) =>
          resolveKarigar(o.design, mappingsMap) === karigarName &&
          o.status === OrderStatus.Pending,
      );
    },
    enabled: !!actor && !isFetching && !!karigarName,
  });
}

// ─── Cache invalidation helper ───────────────────────────────────────────────

function invalidateOrderCaches(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: ["allOrders"] });
  queryClient.invalidateQueries({ queryKey: ["orders"] });
  queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
  queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
  queryClient.invalidateQueries({ queryKey: ["unreturnedOrders"] });
  queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
}

// ─── Mutation Hooks ──────────────────────────────────────────────────────────

// useSaveOrder calls createOrderWithDate to persist orderDate
export function useSaveOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      orderNo: string;
      orderType: OrderType;
      product: string;
      design: string;
      weight: number;
      size: number;
      quantity: bigint;
      remarks: string;
      orderId?: string;
      orderDate?: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.createOrderWithDate(
        params.orderNo,
        params.orderType,
        params.product,
        params.design,
        params.weight,
        params.size,
        params.quantity,
        params.remarks,
        null, // genericName — resolved dynamically from master design mappings
        null, // karigarName — resolved dynamically from master design mappings
        params.orderDate ?? null,
      );
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useDeleteOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteOrder(orderId);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

// Updated to include updatedBy parameter
export function useMarkOrdersAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      orderIds: string[];
      updatedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const { orderIds, updatedBy = "system" } = params;
      await actor.markOrdersAsReady(orderIds, updatedBy);
      // Log each status change so the audit trail is captured
      await Promise.allSettled(
        orderIds.map((orderId) =>
          actor.logOrderStatusChange(
            orderId,
            OrderStatus.Pending,
            OrderStatus.Ready,
            updatedBy,
          ),
        ),
      );
    },
    onSuccess: () => {
      invalidateOrderCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["allOrderStatusLogs"] });
    },
  });
}

// Updated to include updatedBy parameter
export function useMarkOrdersAsPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderIds,
      updatedBy = "system",
    }: {
      orderIds: string[];
      updatedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.markOrdersAsPending(orderIds, updatedBy);
      await Promise.allSettled(
        orderIds.map((orderId) =>
          actor.logOrderStatusChange(
            orderId,
            OrderStatus.Ready,
            OrderStatus.Pending,
            updatedBy,
          ),
        ),
      );
    },
    onSuccess: () => {
      invalidateOrderCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["allOrderStatusLogs"] });
    },
  });
}

// Updated to include updatedBy parameter
export function useBatchUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderIds,
      newStatus,
      updatedBy = "system",
    }: {
      orderIds: string[];
      newStatus: OrderStatus;
      updatedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Fetch current statuses for logging (best effort)
      const oldStatusMap = new Map<string, OrderStatus>();
      await Promise.allSettled(
        orderIds.map(async (orderId) => {
          try {
            const order = await actor.getOrder(orderId);
            if (order) oldStatusMap.set(orderId, order.status);
          } catch {
            /* ignore */
          }
        }),
      );
      await actor.batchUpdateOrderStatus(orderIds, newStatus, updatedBy);
      await Promise.allSettled(
        orderIds.map((orderId) =>
          actor.logOrderStatusChange(
            orderId,
            oldStatusMap.get(orderId) ?? OrderStatus.Pending,
            newStatus,
            updatedBy,
          ),
        ),
      );
    },
    onSuccess: () => {
      invalidateOrderCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["allOrderStatusLogs"] });
    },
  });
}

export function useResetActiveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.resetActiveOrders();
    },
    onSuccess: () => {
      invalidateOrderCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
    },
  });
}

export function useSaveDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      designCode: string;
      genericName: string;
      karigarName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      // saveDesignMapping now takes a DesignMapping object
      return actor.saveDesignMapping({
        designCode: params.designCode,
        genericName: params.genericName,
        karigarName: params.karigarName,
        createdAt: now,
        createdBy: "system",
        updatedAt: now,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

export function useUpdateDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      designCode: string;
      newGenericName: string;
      newKarigarName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Primary path: batchSaveDesignMappings uses MappingRecord which has
      // karigarName — this writes to the MasterDesignMapping store correctly.
      return actor.batchSaveDesignMappings(
        [
          {
            designCode: params.designCode,
            genericName: params.newGenericName,
            karigarName: params.newKarigarName,
            excelGenericName: params.newGenericName,
          },
        ],
        "user",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      designCode: string;
      newKarigar: string;
      movedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      // Look up existing genericName so we don't wipe it on reassign
      let genericName = "";
      try {
        const existingMapping = await actor.getDesignMapping(params.designCode);
        if (existingMapping) genericName = existingMapping.genericName;
      } catch {
        // ignore
      }
      // Always persist via batchSaveDesignMappings for guaranteed storage
      return actor.batchSaveDesignMappings(
        [
          {
            designCode: params.designCode,
            genericName,
            karigarName: params.newKarigar,
            excelGenericName: genericName,
          },
        ],
        params.movedBy ?? "user",
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

// batchSaveDesignMappings now takes MappingRecord[] + createdBy
export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: MappingRecord[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchSaveDesignMappings(mappings, "system");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

export function useAssignOrdersToKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: MappingRecord[]) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        const a = actor as any;
        if (typeof a.assignOrdersToKarigar === "function") {
          return a.assignOrdersToKarigar(mappings);
        }
        // Fallback: use batchSaveDesignMappings
        return actor.batchSaveDesignMappings(mappings, "system");
      } catch {
        return actor.batchSaveDesignMappings(mappings, "system");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

export function useUploadDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappingData: MappingRecord[]) => {
      if (!actor) throw new Error("Actor not initialized");
      // Use batchSaveDesignMappings with MappingRecord[]
      return actor.batchSaveDesignMappings(mappingData, "system");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      invalidateOrderCaches(queryClient);
    },
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      designCode: string;
      blob: import("../backend").ExternalBlob;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadDesignImage(params.designCode, params.blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImageMapping"] });
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      images: [string, import("../backend").ExternalBlob][],
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        const a = actor as any;
        if (typeof a.batchUploadDesignImages === "function") {
          return a.batchUploadDesignImages(images);
        }
      } catch {
        // ignore
      }
      // Fallback: upload one by one
      for (const [designCode, blob] of images) {
        await actor.uploadDesignImage(designCode, blob);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImageMapping"] });
    },
  });
}

export function useRegisterKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.registerKarigar(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

export function useAddKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      try {
        const a = actor as any;
        if (typeof a.addKarigar === "function") {
          return a.addKarigar(name);
        }
        return actor.registerKarigar(name);
      } catch {
        return actor.registerKarigar(name);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

// updateMasterDesignKarigars now takes (designCode: string, count: bigint)
export function useUpdateMasterDesignKarigars() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (karigars: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      // New API takes (designCode: string, count: bigint) - adapt by calling once per karigar
      // Since we're just updating karigar counts, we'll call with count = 1 for each
      for (const karigar of karigars) {
        try {
          await actor.updateMasterDesignKarigars(karigar, BigInt(1));
        } catch {
          // ignore individual failures
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

export function useGetMasterDesignKarigars() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ["masterDesignKarigars"],
    queryFn: async () => {
      if (!actor) return [];
      try {
        const a = actor as any;
        if (typeof a.getMasterDesignKarigars === "function") {
          return a.getMasterDesignKarigars();
        }
      } catch {
        // ignore
      }
      return actor.getUniqueKarigarsFromDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadMasterDesignExcel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blob: import("../backend").ExternalBlob) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignExcel"] });
    },
  });
}

// reconcileMasterFile now takes NO arguments
export function useReconcileMasterFile() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (
      _masterDataRows?: import("../backend").MasterDataRow[],
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      // New API takes no arguments
      return actor.reconcileMasterFile();
    },
  });
}

// persistMasterDataRows returns different shape now
export function usePersistMasterDataRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (masterRows: import("../backend").MasterDataRow[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.persistMasterDataRows(masterRows);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

// Persist reconciliation rows using createOrderWithDate
export function usePersistReconciliationRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      rows: Array<{
        orderNo: string;
        designCode: string;
        karigar: string;
        weight: number;
        size: number;
        quantity: number;
        orderType: import("../backend").OrderType;
        orderDate?: bigint;
      }>,
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      const persisted: typeof rows = [];
      for (const row of rows) {
        try {
          await actor.createOrderWithDate(
            row.orderNo,
            row.orderType,
            "", // product
            row.designCode,
            row.weight,
            row.size,
            BigInt(row.quantity),
            "", // remarks
            null, // genericName — resolved dynamically from master design mappings
            row.karigar || null,
            row.orderDate ?? null,
          );
          persisted.push(row);
        } catch {
          // ignore individual failures
        }
      }
      return { persisted };
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    // Accepts orderIds — moves them all to Hallmark status
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      // Use batchUpdateOrderStatus with Hallmark — this is the correct backend call
      await actor.batchUpdateOrderStatus(
        orderIds,
        OrderStatus.Hallmark,
        "system",
      );
      // Log each status change for audit trail
      await Promise.allSettled(
        orderIds.map((orderId) =>
          actor.logOrderStatusChange(
            orderId,
            OrderStatus.Ready,
            OrderStatus.Hallmark,
            "system",
          ),
        ),
      );
    },
    onSuccess: () => {
      invalidateOrderCaches(queryClient);
      queryClient.invalidateQueries({ queryKey: ["allOrderStatusLogs"] });
    },
  });
}

// RB supply logic — transaction-based, no key collision.
// For partial supply (suppliedQty < totalQty):
//   1. markOrdersAsReady on original orderId (becomes the Ready entry)
//   2. updateOrderQuantity to set the Ready entry to suppliedQty (not full qty)
//   3. createOrderWithDate for the remaining pending qty as a new order record (preserves orderDate)
// For full supply:
//   1. markOrdersAsReady on original orderId
export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      supplies: { orderId: string; suppliedQty: number }[];
      updatedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const { supplies, updatedBy = "system" } = params;

      for (const { orderId, suppliedQty } of supplies) {
        const order = await actor.getOrder(orderId);
        if (!order) throw new Error(`Order ${orderId} not found`);

        const totalQty = Number(order.quantity);
        if (suppliedQty <= 0 || suppliedQty > totalQty) {
          throw new Error(
            `Invalid supplied quantity ${suppliedQty} for order ${orderId} (max: ${totalQty})`,
          );
        }

        const isPartial = suppliedQty < totalQty;
        if (isPartial) {
          // Step 1: Mark the original order as Ready (it gets orderId as Ready entry)
          await actor.markOrdersAsReady([orderId], updatedBy);
          // Step 2: Fix the Ready entry quantity to be suppliedQty (not the original total)
          await actor.updateOrderQuantity(
            orderId,
            BigInt(suppliedQty),
            updatedBy,
          );
          // Step 3: Create a NEW pending order for the remaining quantity, preserving orderDate
          const remainingQty = totalQty - suppliedQty;
          await actor.createOrderWithDate(
            order.orderNo,
            order.orderType,
            order.product,
            order.design,
            order.weight,
            order.size,
            BigInt(remainingQty),
            order.remarks,
            order.genericName ?? null,
            order.karigarName ?? null,
            order.orderDate ?? null,
          );
        } else {
          // Full supply: simply mark as ready
          await actor.markOrdersAsReady([orderId], updatedBy);
        }
      }
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

// Updated to use markOrdersAsPending with updatedBy
export function useReturnReadyOrderToPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      returnedQty: _returnedQty,
      updatedBy = "system",
    }: {
      orderId: string;
      returnedQty: number;
      updatedBy?: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.markOrdersAsPending([orderId], updatedBy);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

// ─── Auth / User Management Hooks ────────────────────────────────────────────

export function useInitDefaultAdmin() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.initDefaultAdmin();
    },
  });
}

export function useListUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<AppUser[]>({
    queryKey: ["users"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.listUsers();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      name: string;
      loginId: string;
      passwordHash: string;
      role: AppRole;
      karigarName: string | null;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.createUser(
        params.name,
        params.loginId,
        params.passwordHash,
        params.role,
        params.karigarName,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useUpdateUser() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      name: string;
      loginId: string;
      role: AppRole;
      karigarName: string | null;
      status: AppStatus;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateUser(
        params.id,
        params.name,
        params.loginId,
        params.role,
        params.karigarName,
        params.status,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useResetUserPassword() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: { id: string; newPasswordHash: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.resetUserPassword(params.id, params.newPasswordHash);
    },
  });
}

export function useGetOrderStatusLog(orderId: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["orderStatusLog", orderId],
    queryFn: async () => {
      if (!actor || !orderId) return [];
      return actor.getOrderStatusLog(orderId);
    },
    enabled: !!actor && !isFetching && !!orderId,
  });
}

export function useGetAllOrderStatusLogs() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ["allOrderStatusLogs"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrderStatusLogs();
    },
    enabled: !!actor && !isFetching,
  });
}

// getDesignCountByKarigar now takes NO args, returns [(string, bigint)]
export function useGetDesignCountByKarigar() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, bigint][]>({
    queryKey: ["designCountByKarigar"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignCountByKarigar();
    },
    enabled: !!actor && !isFetching,
  });
}
