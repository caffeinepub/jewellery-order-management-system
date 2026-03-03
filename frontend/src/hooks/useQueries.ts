import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Order, OrderStatus, OrderType, DesignMapping, MappingRecord } from "../backend";
import { resolveKarigar, buildDesignMappingsMap } from "../utils/karigarResolver";

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
  searchText?: string
) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders", statusFilter, typeFilter, searchText],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrders(
        statusFilter ?? null,
        typeFilter ?? null,
        searchText ?? null
      );
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

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, string, string][]>({
    queryKey: ["masterDesigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, DesignMapping][]>({
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
      return actor.getOrdersWithMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Used by UnmappedSection
export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrdersWithMappings();
      return orders.filter((o) => !o.genericName || !o.karigarName);
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
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;
      const mapping = await actor.getAllMasterDesignMappings();
      const entry = mapping.find(([code]) => code === designCode);
      const genericName = entry?.[1]?.genericName ?? "";
      const karigarName = entry?.[1]?.karigarName ?? "";
      return { blob, genericName, karigarName };
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

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
      return actor.getUnreturnedOrders();
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
      return actor.getReadyOrdersByDateRange(startDate, endDate);
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
 * master design mappings. Used by karigar resolver hooks.
 */
export function useDesignMappingsMap() {
  const { data: rawMappings = [] } = useGetAllDesignMappings();
  return buildDesignMappingsMap(rawMappings);
}

/**
 * Returns a resolver function: (designCode: string) => string
 * that dynamically resolves karigar from master design mappings.
 * Always uses the latest master design data — never the stored order field.
 */
export function useKarigarResolver() {
  const mappingsMap = useDesignMappingsMap();
  return (designCode: string): string => resolveKarigar(designCode, mappingsMap);
}

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();
  const { data: rawMappings = [] } = useGetAllDesignMappings();

  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName, rawMappings.length],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getAllOrders();
      const mappingsMap = buildDesignMappingsMap(rawMappings);
      return allOrders.filter(
        (o) =>
          resolveKarigar(o.design, mappingsMap) === karigarName &&
          o.status === OrderStatus.Pending
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
      orderId: string;
      orderDate: bigint | null;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveOrder(
        params.orderNo,
        params.orderType,
        params.product,
        params.design,
        params.weight,
        params.size,
        params.quantity,
        params.remarks,
        params.orderId,
        params.orderDate
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

export function useMarkOrdersAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.markOrdersAsReady(orderIds);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useMarkOrdersAsPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.markOrdersAsPending(orderIds);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useBatchUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderIds,
      newStatus,
    }: {
      orderIds: string[];
      newStatus: OrderStatus;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUpdateOrderStatus(orderIds, newStatus);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
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
      return actor.saveDesignMapping(
        params.designCode,
        params.genericName,
        params.karigarName
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
      return actor.updateDesignMapping(
        params.designCode,
        params.newGenericName,
        params.newKarigarName
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
      return actor.reassignDesign(
        params.designCode,
        params.newKarigar,
        params.movedBy ?? "user"
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

export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: [string, DesignMapping][]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchSaveDesignMappings(mappings);
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
      return actor.assignOrdersToKarigar(mappings);
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
      return actor.uploadDesignMapping(mappingData);
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
      images: [string, import("../backend").ExternalBlob][]
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUploadDesignImages(images);
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
      return actor.addKarigar(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

export function useUpdateMasterDesignKarigars() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (karigars: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateMasterDesignKarigars(karigars);
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
      return actor.getMasterDesignKarigars();
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

export function useReconcileMasterFile() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (
      masterDataRows: import("../backend").MasterDataRow[]
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reconcileMasterFile(masterDataRows);
    },
  });
}

export function usePersistMasterDataRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      masterRows: import("../backend").MasterDataRow[]
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.persistMasterDataRows(masterRows);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateDesignGroupStatus(designCodes);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (
      supplies: { orderId: string; suppliedQty: number }[]
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      for (const { orderId, suppliedQty } of supplies) {
        await actor.supplyOrder(orderId, BigInt(suppliedQty));
      }
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}

export function useReturnReadyOrderToPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      orderId,
      returnedQty,
    }: {
      orderId: string;
      returnedQty: number;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.markOrdersAsPending([orderId]);
    },
    onSuccess: () => invalidateOrderCaches(queryClient),
  });
}
