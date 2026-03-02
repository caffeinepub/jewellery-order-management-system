import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Order, OrderStatus, OrderType, DesignMapping, MappingRecord, MasterDataRow } from '../backend';

// ─── Orders ──────────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ['allOrders'],
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
    queryKey: ['orders', statusFilter, typeFilter, searchText],
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
    queryKey: ['ordersWithMappings'],
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
    queryKey: ['unmappedOrders'],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrdersWithMappings();
      return orders.filter((o) => !o.genericName || !o.karigarName);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReadyOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ['readyOrders'],
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

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ['orders', 'karigar', karigarName],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getAllOrders();
      return allOrders.filter(
        (o) => o.karigarName === karigarName && o.status === OrderStatus.Pending
      );
    },
    enabled: !!actor && !isFetching && !!karigarName,
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
      if (!actor) throw new Error('Actor not initialized');
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
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
    },
  });
}

export function useDeleteOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.deleteOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
    },
  });
}

export function useMarkOrdersAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.markOrdersAsReady(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useMarkOrdersAsPending() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.markOrdersAsPending(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useMarkAllAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.markAllAsReady();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useBatchUpdateOrderStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderIds, newStatus }: { orderIds: string[]; newStatus: OrderStatus }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchUpdateOrderStatus(orderIds, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useSupplyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, suppliedQuantity }: { orderId: string; suppliedQuantity: bigint }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.supplyOrder(orderId, suppliedQuantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (supplies: { orderId: string; suppliedQty: number }[]) => {
      if (!actor) throw new Error('Actor not initialized');
      for (const s of supplies) {
        await actor.supplyOrder(s.orderId, BigInt(s.suppliedQty));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useSupplyAndReturnOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ orderId, suppliedQuantity }: { orderId: string; suppliedQuantity: bigint }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.supplyAndReturnOrder(orderId, suppliedQuantity);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useResetActiveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.resetActiveOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useBatchDeleteOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchDeleteOrders(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

export function useSaveModifiedOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ count, startQty, order }: { count: bigint; startQty: bigint; order: Order }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveModifiedOrder(count, startQty, order);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

// ─── Karigars ─────────────────────────────────────────────────────────────────

export function useGetKarigars() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['karigars'],
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
    queryKey: ['uniqueKarigars'],
    queryFn: async () => {
      if (!actor) return [];
      const names = await actor.getUniqueKarigarsFromDesignMappings();
      return Array.from(new Set(names)).filter(Boolean).sort();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useAddKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.addKarigar(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

// ─── Design Mappings ─────────────────────────────────────────────────────────

export function useGetAllDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, DesignMapping][]>({
    queryKey: ['designMappings'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

// Alias for backward compatibility
export const useGetAllMasterDesignMappings = useGetAllDesignMappings;

export function useGetDesignMapping(designCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<DesignMapping>({
    queryKey: ['designMapping', designCode],
    queryFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.getDesignMapping(designCode);
    },
    enabled: !!actor && !isFetching && !!designCode,
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
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
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
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateDesignMapping(designCode, newGenericName, newKarigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ designCode, newKarigar }: { designCode: string; newKarigar: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.reassignDesign(designCode, newKarigar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
    },
  });
}

export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: [string, DesignMapping][]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchSaveDesignMappings(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

export function useUploadDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappingData: MappingRecord[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadDesignMapping(mappingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

export function useAssignOrdersToKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: MappingRecord[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.assignOrdersToKarigar(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
      queryClient.invalidateQueries({ queryKey: ['karigars'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

export function useClearAllDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.clearAllDesignMappings();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['uniqueKarigars'] });
    },
  });
}

export function useIsExistingDesignCodes() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.isExistingDesignCodes(designCodes);
    },
  });
}

// ─── Design Images ────────────────────────────────────────────────────────────

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['designImage', designCode],
    queryFn: async () => {
      if (!actor) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;
      let genericName = '';
      let karigarName = '';
      try {
        const mapping = await actor.getDesignMapping(designCode);
        genericName = mapping.genericName;
        karigarName = mapping.karigarName;
      } catch {
        // no mapping found
      }
      return { blob, genericName, karigarName };
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

export function useGetDesignImageMapping() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['designImageMapping'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignImageMapping();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ designCode, blob }: { designCode: string; blob: any }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadDesignImage(designCode, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImageMapping'] });
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (images: [string, any][]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchUploadDesignImages(images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImageMapping'] });
    },
  });
}

// ─── Master Designs ───────────────────────────────────────────────────────────

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();
  return useQuery<[string, string, string][]>({
    queryKey: ['masterDesigns'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesigns();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetMasterDesignExcel() {
  const { actor, isFetching } = useActor();
  return useQuery({
    queryKey: ['masterDesignExcel'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadMasterDesignExcel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (blob: any) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesignExcel'] });
    },
  });
}

export function useGetMasterDesignKarigars() {
  const { actor, isFetching } = useActor();
  return useQuery<string[]>({
    queryKey: ['masterDesignKarigars'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getMasterDesignKarigars();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUpdateMasterDesignKarigars() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (karigars: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateMasterDesignKarigars(karigars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesignKarigars'] });
    },
  });
}

// ─── Reconciliation ───────────────────────────────────────────────────────────

export function useReconcileMasterFile() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async (masterDataRows: MasterDataRow[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.reconcileMasterFile(masterDataRows);
    },
  });
}

export function usePersistMasterDataRows() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (masterRows: MasterDataRow[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.persistMasterDataRows(masterRows);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

// ─── Tag Printing ─────────────────────────────────────────────────────────────

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateDesignGroupStatus(designCodes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['allOrders'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['readyOrders'] });
      queryClient.invalidateQueries({ queryKey: ['ordersWithMappings'] });
    },
  });
}

// ─── Batch Get By Status ──────────────────────────────────────────────────────

export function useBatchGetByStatus() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({ ids, compareStatus }: { ids: string[]; compareStatus: OrderStatus }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchGetByStatus(ids, compareStatus);
    },
  });
}

// ─── Unreturned Orders ────────────────────────────────────────────────────────

export function useGetUnreturnedOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ['unreturnedOrders'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUnreturnedOrders();
    },
    enabled: !!actor && !isFetching,
  });
}
