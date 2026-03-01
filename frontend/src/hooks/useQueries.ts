import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import {
  Order,
  OrderStatus,
  OrderType,
  DesignMapping,
  MappingRecord,
  MasterDataRow,
  ExternalBlob,
} from "@/backend";

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllOrders();
    },
    enabled: !!actor,
  });
}

export function useGetOrders(
  statusFilter?: OrderStatus,
  typeFilter?: OrderType,
  searchText?: string
) {
  const { actor } = useActor();

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
    enabled: !!actor,
  });
}

export function useGetReadyOrders() {
  const { actor } = useActor();

  return useQuery<Order[]>({
    queryKey: ["readyOrders"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getReadyOrders();
    },
    enabled: !!actor,
  });
}

export function useGetOrdersWithMappings() {
  const { actor } = useActor();

  return useQuery<Order[]>({
    queryKey: ["ordersWithMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getOrdersWithMappings();
    },
    enabled: !!actor,
  });
}

export function useGetUnmappedOrders() {
  const { actor } = useActor();

  return useQuery<Order[]>({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrdersWithMappings();
      return orders.filter((order) => !order.genericName || !order.karigarName);
    },
    enabled: !!actor,
  });
}

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getAllOrders();
      return allOrders.filter(
        (o) =>
          o.karigarName === karigarName && o.status === OrderStatus.Pending
      );
    },
    enabled: !!actor && !!karigarName,
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useReturnOrderToPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderNo,
      returnedQty,
    }: {
      orderNo: string;
      returnedQty: bigint;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.returnOrdersToPending(orderNo, returnedQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchReturnReadyOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderRequests: [string, bigint][]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchReturnOrdersToPending(orderRequests);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useDeleteReadyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.deleteReadyOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

/**
 * Supply RB orders one by one using the backend's supplyOrder method.
 * For each order:
 *   - If suppliedQty == order.quantity → order becomes Ready (same orderId)
 *   - If suppliedQty < order.quantity  → order stays Pending with remaining qty
 *     (the backend updates the same orderId in-place; the supplied portion is
 *      recorded as Ready by the backend's split logic)
 */
export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderQuantities: [string, bigint][]) => {
      if (!actor) throw new Error("Actor not initialized");
      // Call supplyOrder sequentially for each order
      for (const [orderId, suppliedQty] of orderQuantities) {
        await actor.supplyOrder(orderId, suppliedQty);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
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
      if (!actor) throw new Error("Actor not initialized");
      return actor.getReadyOrdersByDateRange(startDate, endDate);
    },
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

// ─── Design Mappings ─────────────────────────────────────────────────────────

export function useGetAllDesignMappings() {
  const { actor } = useActor();

  return useQuery<[string, DesignMapping][]>({
    queryKey: ["designMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor,
  });
}

// Alias for backward compatibility
export const useGetAllMasterDesignMappings = useGetAllDesignMappings;

export function useGetDesignMapping(designCode: string) {
  const { actor } = useActor();

  return useQuery<DesignMapping | null>({
    queryKey: ["designMapping", designCode],
    queryFn: async () => {
      if (!actor || !designCode) return null;
      try {
        return await actor.getDesignMapping(designCode);
      } catch {
        return null;
      }
    },
    enabled: !!actor && !!designCode,
  });
}

export function useSaveDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      designCode,
      genericName,
      karigarName,
    }: {
      designCode: string;
      genericName: string;
      karigarName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.saveDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
    },
  });
}

export function useUpdateDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      designCode,
      newGenericName,
      newKarigarName,
    }: {
      designCode: string;
      newGenericName: string;
      newKarigarName: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateDesignMapping(designCode, newGenericName, newKarigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
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
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
    },
  });
}

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      designCode,
      newKarigar,
    }: {
      designCode: string;
      newKarigar: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reassignDesign(designCode, newKarigar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
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

// ─── Karigars ────────────────────────────────────────────────────────────────

export function useGetKarigars() {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["karigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getKarigars();
    },
    enabled: !!actor,
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
    },
  });
}

export function useGetUniqueKarigarsFromDesignMappings() {
  const { actor } = useActor();

  return useQuery<string[]>({
    queryKey: ["uniqueKarigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUniqueKarigarsFromDesignMappings();
    },
    enabled: !!actor,
  });
}

export function useGetMasterDesignKarigars() {
  const { actor } = useActor();

  return useQuery<string[]>({
    queryKey: ["masterDesignKarigars"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesignKarigars();
    },
    enabled: !!actor,
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
    },
  });
}

// ─── Master Designs (returns Map for easy lookup) ─────────────────────────────

export function useGetMasterDesigns() {
  const { actor } = useActor();

  return useQuery<Map<string, { genericName: string; karigarName: string }>>({
    queryKey: ["masterDesigns"],
    queryFn: async () => {
      if (!actor) return new Map();
      const designs = await actor.getMasterDesigns();
      const designMap = new Map<string, { genericName: string; karigarName: string }>();
      designs.forEach(([designCode, genericName, karigarName]) => {
        designMap.set(designCode.toUpperCase().trim(), { genericName, karigarName });
      });
      return designMap;
    },
    enabled: !!actor,
  });
}

// ─── Design Images ────────────────────────────────────────────────────────────

export function useGetDesignImage(designCode: string) {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor || !designCode) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;

      // Fetch the design mapping to get genericName and karigarName
      let genericName: string | undefined;
      let karigarName: string | undefined;
      try {
        const mapping = await actor.getDesignMapping(designCode);
        if (mapping) {
          genericName = mapping.genericName;
          karigarName = mapping.karigarName;
        }
      } catch {
        // mapping not found, ignore
      }

      return { blob, genericName, karigarName };
    },
    enabled: !!actor && !!designCode,
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      designCode,
      imageData,
    }: {
      designCode: string;
      imageData: Uint8Array<ArrayBuffer>;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const blob = ExternalBlob.fromBytes(imageData);
      return actor.uploadDesignImage(designCode, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImage"] });
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      images: { designCode: string; imageData: Uint8Array<ArrayBuffer> }[]
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      const blobImages: [string, ExternalBlob][] = images.map(
        ({ designCode, imageData }) => [designCode, ExternalBlob.fromBytes(imageData)]
      );
      return actor.batchUploadDesignImages(blobImages);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImage"] });
    },
  });
}

export function useGetDesignImageMapping() {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["designImageMapping"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignImageMapping();
    },
    enabled: !!actor,
  });
}

// ─── Master Design Excel ──────────────────────────────────────────────────────

export function useUploadMasterDesignExcel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (excelData: Uint8Array<ArrayBuffer>) => {
      if (!actor) throw new Error("Actor not initialized");
      const blob = ExternalBlob.fromBytes(excelData);
      return actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignExcel"] });
    },
  });
}

export function useGetMasterDesignExcel() {
  const { actor } = useActor();

  return useQuery({
    queryKey: ["masterDesignExcel"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor,
  });
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export function useReconcileMasterFile() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (masterDataRows: MasterDataRow[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reconcileMasterFile(masterDataRows);
    },
  });
}

export function usePersistMasterDataRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (masterRows: MasterDataRow[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.persistMasterDataRows(masterRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

// ─── Reset ────────────────────────────────────────────────────────────────────

export function useResetActiveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.resetActiveOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}
