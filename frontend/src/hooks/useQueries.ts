import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Order, OrderStatus, OrderType, DesignMapping, MappingRecord } from "@/backend";

// Local interface describing the ExternalBlob shape we need at runtime.
// The actual ExternalBlob class is provided by the blob-storage platform component
// and is not a resolvable TypeScript module — we use a structural type instead.
export interface BlobLike {
  getDirectURL(): string;
  getBytes(): Promise<Uint8Array<ArrayBuffer>>;
}

// ─── Orders ──────────────────────────────────────────────────────────────────

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
  statusFilter?: OrderStatus | null,
  typeFilter?: OrderType | null,
  searchText?: string | null
) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders", statusFilter, typeFilter, searchText],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrders(statusFilter ?? null, typeFilter ?? null, searchText ?? null);
    },
    enabled: !!actor && !isFetching,
  });
}

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

export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrdersWithMappings();
      return orders.filter((order) => !order.genericName || !order.karigarName);
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

export function useGetReadyOrdersByDateRange() {
  const { actor } = useActor();
  return useMutation<Order[], Error, { startDate: bigint; endDate: bigint }>({
    mutationFn: async ({ startDate, endDate }) => {
      if (!actor) return [];
      return actor.getReadyOrdersByDateRange(startDate, endDate);
    },
  });
}

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useMarkAllAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.markAllAsReady();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderIds: string[]; newStatus: OrderStatus }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUpdateOrderStatus(params.orderIds, params.newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useSupplyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { orderId: string; suppliedQuantity: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.supplyOrder(params.orderId, params.suppliedQuantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (entries: { orderId: string; suppliedQuantity: bigint }[]) => {
      if (!actor) throw new Error("Actor not initialized");
      for (const entry of entries) {
        await actor.supplyOrder(entry.orderId, entry.suppliedQuantity);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useSaveModifiedOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { count: bigint; startQty: bigint; order: Order }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveModifiedOrder(params.count, params.startQty, params.order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

export function useBatchDeleteOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchDeleteOrders(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchGetByStatus() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (params: { ids: string[]; compareStatus: OrderStatus }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchGetByStatus(params.ids, params.compareStatus);
    },
  });
}

// ─── Design Mappings ─────────────────────────────────────────────────────────

export function useGetDesignMapping(designCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DesignMapping>({
    queryKey: ["designMapping", designCode],
    queryFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getDesignMapping(designCode);
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, DesignMapping][]>({
    queryKey: ["masterDesigns"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllDesignMappings = useGetAllMasterDesignMappings;

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, string, string][]>({
    queryKey: ["masterDesignsList"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { designCode: string; genericName: string; karigarName: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveDesignMapping(params.designCode, params.genericName, params.karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
    },
  });
}

export function useUpdateDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { designCode: string; newGenericName: string; newKarigarName: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateDesignMapping(params.designCode, params.newGenericName, params.newKarigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
    },
  });
}

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { designCode: string; newKarigar: string; movedBy: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reassignDesign(params.designCode, params.newKarigar, params.movedBy);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
    },
  });
}

export function useIsExistingDesignCodes() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.isExistingDesignCodes(designCodes);
    },
  });
}

export function useClearAllDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.clearAllDesignMappings();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignsList"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
    },
  });
}

// ─── Karigars ────────────────────────────────────────────────────────────────

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

export function useUpdateMasterDesignKarigars() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (karigars: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateMasterDesignKarigars(karigars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

// ─── Design Images (blob storage) ────────────────────────────────────────────

// useGetDesignImage returns a blob-like object with getDirectURL().
// The actual ExternalBlob runtime class is provided by the blob-storage platform
// component and is not a resolvable TypeScript module — we use BlobLike interface.
export function useGetDesignImage(designCode: string) {
  return useQuery<{ blob: BlobLike; genericName: string; karigarName: string } | null>({
    queryKey: ["designImage", designCode],
    queryFn: async (): Promise<{ blob: BlobLike; genericName: string; karigarName: string } | null> => {
      if (!designCode) return null;
      try {
        // Access ExternalBlob via the global scope where the blob-storage
        // platform component injects it at runtime.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const ExternalBlobClass = (window as any).__ExternalBlob;
        if (!ExternalBlobClass) {
          // Fallback: construct a minimal BlobLike from a URL
          const url = `/design-images/${encodeURIComponent(designCode)}`;
          const blob: BlobLike = {
            getDirectURL: () => url,
            getBytes: async () => {
              const res = await fetch(url);
              const buf = await res.arrayBuffer();
              return new Uint8Array(buf) as Uint8Array<ArrayBuffer>;
            },
          };
          return { blob, genericName: "", karigarName: "" };
        }
        const blob: BlobLike = ExternalBlobClass.fromURL(
          `/design-images/${encodeURIComponent(designCode)}`
        );
        return { blob, genericName: "", karigarName: "" };
      } catch {
        return null;
      }
    },
    enabled: !!designCode,
    staleTime: 1000 * 60 * 5,
    retry: false,
  });
}

// Stub hooks for MasterDesigns page backward compatibility
export function useUploadMasterDesignExcel() {
  return useMutation({
    mutationFn: async (_blob: unknown) => {
      // No-op: backend does not have a dedicated master design Excel upload endpoint
    },
  });
}

export function useGetMasterDesignExcel() {
  return useQuery<null>({
    queryKey: ["masterDesignExcel"],
    queryFn: async () => null,
    enabled: false,
  });
}

// ─── Reconciliation ──────────────────────────────────────────────────────────

export function useReconcileMasterFile() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (masterDataRows: Parameters<NonNullable<ReturnType<typeof useActor>["actor"]>["reconcileMasterFile"]>[0]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reconcileMasterFile(masterDataRows);
    },
  });
}

export function usePersistMasterDataRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (masterRows: Parameters<NonNullable<ReturnType<typeof useActor>["actor"]>["persistMasterDataRows"]>[0]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.persistMasterDataRows(masterRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

// ─── Tag Printing ─────────────────────────────────────────────────────────────

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateDesignGroupStatus(designCodes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["allOrders"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}
