import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Order, OrderStatus, OrderType, DesignMapping, MappingRecord, ExternalBlob } from '../backend';

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

// Alias for useGetOrders with no filters - used by SummaryCards and KarigarsTab
export function useGetAllOrders() {
  return useGetOrders(null, null, null);
}

export function useGetOrdersByStatus(status: OrderStatus) {
  return useGetOrders(status, null, null);
}

export function useGetOrdersByType(type: OrderType) {
  return useGetOrders(null, type, null);
}

export function useSaveOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (order: {
      orderNo: string;
      orderType: OrderType;
      product: string;
      design: string;
      weight: number;
      size: number;
      quantity: bigint;
      remarks: string;
      orderId: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveOrder(
        order.orderNo,
        order.orderType,
        order.product,
        order.design,
        order.weight,
        order.size,
        order.quantity,
        order.remarks,
        order.orderId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
    },
  });
}

export function useUpdateOrdersStatusToReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateOrdersStatusToReady(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateOrderStatusToReadyWithQty() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, suppliedQty }: { orderId: string; suppliedQty: bigint }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.updateOrderStatusToReadyWithQty(orderId, suppliedQty);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

// Bulk update status - used by BarcodeScanning
export function useBulkUpdateStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, newStatus }: { orderIds: string[]; newStatus: OrderStatus }) => {
      if (!actor) throw new Error('Actor not initialized');
      
      // Only Ready status is supported by backend
      if (newStatus === OrderStatus.Ready) {
        return actor.updateOrdersStatusToReady(orderIds);
      }
      
      throw new Error('Only Ready status updates are supported');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useSaveDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mapping: { designCode: string; genericName: string; karigarName: string }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveDesignMapping(mapping.designCode, mapping.genericName, mapping.karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
  });
}

// Alias for useSaveDesignMapping - used by UnmappedCodes
export function useUpdateUnmappedOrder() {
  return useSaveDesignMapping();
}

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

export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappings: [string, DesignMapping][]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchSaveDesignMappings(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, blob }: { designCode: string; blob: ExternalBlob }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadDesignImage(designCode, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImages'] });
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (images: [string, ExternalBlob][]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.batchUploadDesignImages(images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designImages'] });
    },
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<{ imageUrl: string; designCode: string; genericName: string | null; karigarName: string | null } | null>({
    queryKey: ['designImage', designCode],
    queryFn: async () => {
      if (!actor) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;

      // Get design details from orders
      const orders = await actor.getOrders(null, null, null);
      const order = orders.find((o) => o.design === designCode);

      return {
        imageUrl: blob.getDirectURL(),
        designCode,
        genericName: order?.genericName || null,
        karigarName: order?.karigarName || null,
      };
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

export function useUploadMasterDesignExcel() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (blob: ExternalBlob) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesignExcel'] });
    },
  });
}

export function useGetMasterDesignExcel() {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob | null>({
    queryKey: ['masterDesignExcel'],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor && !isFetching,
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

export function useUploadDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingData: MappingRecord[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.uploadDesignMapping(mappingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterDesignMappings'] });
    },
  });
}

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, DesignMapping][]>({
    queryKey: ['masterDesignMappings'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
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
      queryClient.invalidateQueries({ queryKey: ['masterDesignKarigars'] });
    },
  });
}

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

export function useAssignOrdersToKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappings: MappingRecord[]) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.assignOrdersToKarigar(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
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
      return orders.filter((order) => !order.genericName || !order.karigarName);
    },
    enabled: !!actor && !isFetching,
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
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['unmappedOrders'] });
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
  });
}
