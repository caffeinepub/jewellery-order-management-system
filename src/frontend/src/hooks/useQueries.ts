import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useActor } from './useActor';
import { Order, OrderStatus, OrderType, Karigar } from '@/backend';
import { toast } from 'sonner';

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
      const allOrders = await actor.getOrders(statusFilter ?? null, typeFilter ?? null, searchText ?? null);
      
      // Backend doesn't filter, so we filter on frontend
      let filtered = allOrders;
      
      if (statusFilter) {
        filtered = filtered.filter((order) => order.status === statusFilter);
      }
      
      if (typeFilter) {
        filtered = filtered.filter((order) => order.orderType === typeFilter);
      }
      
      if (searchText) {
        const search = searchText.toLowerCase();
        filtered = filtered.filter(
          (order) =>
            order.orderNo.toLowerCase().includes(search) ||
            order.design.toLowerCase().includes(search) ||
            order.genericName.toLowerCase().includes(search) ||
            order.karigarName.toLowerCase().includes(search)
        );
      }
      
      return filtered;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllOrders() {
  return useGetOrders(null, null, null);
}

export function useGetOrdersByStatus(status: OrderStatus) {
  return useGetOrders(status, null, null);
}

export function useGetOrdersByType(type: OrderType) {
  return useGetOrders(null, type, null);
}

export function useGetHallmarkOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ['orders', 'hallmark-related'],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getOrders(null, null, null);
      return allOrders.filter(
        (order) =>
          order.status === OrderStatus.Hallmark ||
          order.status === OrderStatus.ReturnFromHallmark
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ['orders', 'unmapped'],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getOrders(null, null, null);
      return allOrders.filter((order) => !order.genericName || !order.karigarName);
    },
    enabled: !!actor && !isFetching,
  });
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
      genericName: string;
      karigarName: string;
      status: OrderStatus;
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
        order.genericName,
        order.karigarName,
        order.status,
        order.orderId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useBulkUpdateStatus() {
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
      if (!actor) throw new Error('Actor not initialized');
      
      const allOrders = await actor.getOrders(null, null, null);
      
      const updatePromises = orderIds.map(async (orderId) => {
        const order = allOrders.find((o) => o.orderId === orderId);
        if (!order) {
          throw new Error(`Order ${orderId} not found`);
        }
        
        return actor.saveOrder(
          order.orderNo,
          order.orderType,
          order.product,
          order.design,
          order.weight,
          order.size,
          order.quantity,
          order.remarks,
          order.genericName,
          order.karigarName,
          newStatus,
          order.orderId
        );
      });
      
      await Promise.all(updatePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export const useBulkUpdateOrderStatus = useBulkUpdateStatus;

export function useIngestOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      orders: Array<{
        orderNo: string;
        orderType: OrderType;
        product: string;
        design: string;
        weight: number;
        size: number;
        quantity: number;
        remarks: string;
      }>
    ) => {
      if (!actor) throw new Error('Actor not initialized');

      const savePromises = orders.map(async (order) => {
        const orderId = `${order.orderNo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        
        let genericName = '';
        let karigarName = '';
        try {
          const mapping = await actor.getDesignMapping(order.design);
          genericName = mapping.genericName;
          karigarName = mapping.karigarName;
        } catch (error) {
          // Design mapping not found, leave empty
        }

        return actor.saveOrder(
          order.orderNo,
          order.orderType,
          order.product,
          order.design,
          order.weight,
          order.size,
          BigInt(order.quantity),
          order.remarks,
          genericName,
          karigarName,
          OrderStatus.Pending,
          orderId
        );
      });

      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useIngestOrdersBatch() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orders,
      onProgress,
    }: {
      orders: Array<{
        orderNo: string;
        orderType: OrderType;
        product: string;
        design: string;
        weight: number;
        size: number;
        quantity: number;
        remarks: string;
      }>;
      onProgress?: (progress: number) => void;
    }) => {
      if (!actor) throw new Error('Actor not initialized');

      const BATCH_SIZE = 50;
      const totalOrders = orders.length;
      let processedCount = 0;

      for (let i = 0; i < orders.length; i += BATCH_SIZE) {
        const batch = orders.slice(i, Math.min(i + BATCH_SIZE, orders.length));
        
        const batchPromises = batch.map(async (order) => {
          const orderId = `${order.orderNo}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          
          let genericName = '';
          let karigarName = '';
          try {
            const mapping = await actor.getDesignMapping(order.design);
            genericName = mapping.genericName;
            karigarName = mapping.karigarName;
          } catch (error) {
            // Design mapping not found, leave empty
          }

          return actor.saveOrder(
            order.orderNo,
            order.orderType,
            order.product,
            order.design,
            order.weight,
            order.size,
            BigInt(order.quantity),
            order.remarks,
            genericName,
            karigarName,
            OrderStatus.Pending,
            orderId
          );
        });

        await Promise.all(batchPromises);
        
        processedCount += batch.length;
        const progress = Math.floor((processedCount / totalOrders) * 100);
        onProgress?.(progress);
        
        // Small delay to prevent UI blocking
        await new Promise(resolve => setTimeout(resolve, 10));
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    },
  });
}

export function useUpdateUnmappedOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      genericName,
      karigarName,
    }: {
      orderId: string;
      genericName: string;
      karigarName: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');

      const allOrders = await actor.getOrders(null, null, null);
      const order = allOrders.find((o) => o.orderId === orderId);
      
      if (!order) {
        throw new Error(`Order ${orderId} not found`);
      }

      return actor.saveOrder(
        order.orderNo,
        order.orderType,
        order.product,
        order.design,
        order.weight,
        order.size,
        order.quantity,
        order.remarks,
        genericName,
        karigarName,
        order.status,
        order.orderId
      );
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
    mutationFn: async (mapping: {
      designCode: string;
      genericName: string;
      karigarName: string;
    }) => {
      if (!actor) throw new Error('Actor not initialized');
      return actor.saveDesignMapping(
        mapping.designCode,
        mapping.genericName,
        mapping.karigarName
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
  });
}

export function useSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      mappings: Array<{
        designCode: string;
        genericName: string;
        karigarName: string;
      }>
    ) => {
      if (!actor) throw new Error('Actor not initialized');

      const savePromises = mappings.map((mapping) =>
        actor.saveDesignMapping(
          mapping.designCode,
          mapping.genericName,
          mapping.karigarName
        )
      );

      await Promise.all(savePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
    },
  });
}

export function useGetDesignMapping(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['designMapping', designCode],
    queryFn: async () => {
      if (!actor) return null;
      try {
        return await actor.getDesignMapping(designCode);
      } catch (error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!designCode,
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
      toast.success('Order deleted successfully');
    },
    onError: () => {
      toast.error('Failed to delete order');
    },
  });
}

export function useDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ['designImage', designCode],
    queryFn: async () => {
      if (!actor) return null;
      try {
        const [mapping, imageBlob] = await Promise.all([
          actor.getDesignMapping(designCode),
          actor.getDesignImage(designCode),
        ]);

        return {
          designCode: mapping.designCode,
          genericName: mapping.genericName,
          karigarName: mapping.karigarName,
          imageUrl: imageBlob ? imageBlob.getDirectURL() : null,
        };
      } catch (error) {
        return null;
      }
    },
    enabled: !!actor && !isFetching && !!designCode,
  });
}

// Karigar Management Hooks
export function useGetKarigars() {
  const { actor, isFetching } = useActor();

  return useQuery<Karigar[]>({
    queryKey: ['karigars'],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getKarigars();
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
      if (!actor) throw new Error('Actor not initialized');
      await actor.reassignDesign(designCode, newKarigar);
    },
    onSuccess: () => {
      // Invalidate both design mappings and orders cache
      queryClient.invalidateQueries({ queryKey: ['designMappings'] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      queryClient.invalidateQueries({ queryKey: ['designImage'] });
    },
  });
}
