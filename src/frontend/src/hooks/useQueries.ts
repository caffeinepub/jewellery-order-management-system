import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Order, OrderStatus, OrderType, MappingRecord, Karigar, DesignMapping } from "@/backend";
import { ExternalBlob } from "@/backend";

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
      const pendingOrders = await actor.getOrders(statusFilter || null, typeFilter || null, searchText || null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      // Enrich orders with mapping data if they're missing names
      const enrichOrder = (order: Order): Order => {
        if (order.genericName && order.karigarName) {
          return order;
        }
        const mapping = mappingsMap.get(order.design);
        if (mapping) {
          return {
            ...order,
            genericName: order.genericName || mapping.genericName,
            karigarName: order.karigarName || mapping.karigarName,
          };
        }
        return order;
      };
      
      const enrichedPendingOrders = pendingOrders.map(enrichOrder);
      const enrichedReadyOrders = readyOrders.map(enrichOrder);
      
      // Combine both order sources
      return [...enrichedPendingOrders, ...enrichedReadyOrders];
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
    queryKey: ["orders", "hallmark-related"],
    queryFn: async () => {
      if (!actor) return [];
      const pendingOrders = await actor.getOrders(null, null, null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      // Enrich orders with mapping data if they're missing names
      const enrichOrder = (order: Order): Order => {
        if (order.genericName && order.karigarName) {
          return order;
        }
        const mapping = mappingsMap.get(order.design);
        if (mapping) {
          return {
            ...order,
            genericName: order.genericName || mapping.genericName,
            karigarName: order.karigarName || mapping.karigarName,
          };
        }
        return order;
      };
      
      const allOrders = [...pendingOrders.map(enrichOrder), ...readyOrders.map(enrichOrder)];
      return allOrders.filter(
        (order) =>
          order.status === OrderStatus.Hallmark ||
          order.status === OrderStatus.ReturnFromHallmark
      );
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName],
    queryFn: async () => {
      if (!actor) return [];
      const pendingOrders = await actor.getOrders(null, null, null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      // Enrich orders with mapping data if they're missing names
      const enrichOrder = (order: Order): Order => {
        if (order.genericName && order.karigarName) {
          return order;
        }
        const mapping = mappingsMap.get(order.design);
        if (mapping) {
          return {
            ...order,
            genericName: order.genericName || mapping.genericName,
            karigarName: order.karigarName || mapping.karigarName,
          };
        }
        return order;
      };
      
      const allOrders = [...pendingOrders.map(enrichOrder), ...readyOrders.map(enrichOrder)];
      return allOrders.filter((order) => order.karigarName === karigarName);
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
      orderId: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigarsFromMappings"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
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

export function useGetDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["designMappings"],
    queryFn: async () => {
      if (!actor) return [];
      const pendingOrders = await actor.getOrders(null, null, null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      // Enrich orders with mapping data
      const enrichOrder = (order: Order): Order => {
        if (order.genericName && order.karigarName) {
          return order;
        }
        const mapping = mappingsMap.get(order.design);
        if (mapping) {
          return {
            ...order,
            genericName: order.genericName || mapping.genericName,
            karigarName: order.karigarName || mapping.karigarName,
          };
        }
        return order;
      };
      
      const orders = [...pendingOrders.map(enrichOrder), ...readyOrders.map(enrichOrder)];
      const mappings = new Map<string, { designCode: string; genericName: string; karigarName: string }>();
      
      orders.forEach((order) => {
        if (order.genericName && order.karigarName && !mappings.has(order.design)) {
          mappings.set(order.design, {
            designCode: order.design,
            genericName: order.genericName,
            karigarName: order.karigarName,
          });
        }
      });
      
      return Array.from(mappings.values());
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["masterDesignMappings"],
    queryFn: async () => {
      if (!actor) return [];
      const mappingsArray = await actor.getAllMasterDesignMappings();
      return mappingsArray.map(([designCode, mapping]) => ({
        designCode: mapping.designCode,
        genericName: mapping.genericName,
        karigarName: mapping.karigarName,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetUniqueKarigarsFromMappings() {
  const { actor, isFetching } = useActor();

  return useQuery<string[]>({
    queryKey: ["uniqueKarigarsFromMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getUniqueKarigarsFromDesignMappings();
    },
    enabled: !!actor && !isFetching,
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

export function useGetKarigars() {
  const { actor, isFetching } = useActor();

  return useQuery<Karigar[]>({
    queryKey: ["karigars"],
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
      if (!actor) throw new Error("Actor not initialized");
      return actor.addKarigar(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
  });
}

export function useUpdateOrdersStatusToReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.updateOrdersStatusToReady(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

export function useSupplyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderId, suppliedQuantity }: { orderId: string; suppliedQuantity: number }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.supplyOrder(orderId, BigInt(suppliedQuantity));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

export function useBulkUpdateStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ orderIds, newStatus }: { orderIds: string[]; newStatus: OrderStatus }) => {
      if (!actor) throw new Error("Actor not initialized");
      if (newStatus === OrderStatus.Ready) {
        return actor.updateOrdersStatusToReady(orderIds);
      }
      throw new Error("Only Ready status is supported for bulk updates");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
  });
}

export function useUpdateUnmappedOrder() {
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
      await actor.saveDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<{ designCode: string; count: number; missingGenericName: boolean; missingKarigarName: boolean }[]>({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const pendingOrders = await actor.getOrders(null, null, null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      // Enrich orders with mapping data
      const enrichOrder = (order: Order): Order => {
        if (order.genericName && order.karigarName) {
          return order;
        }
        const mapping = mappingsMap.get(order.design);
        if (mapping) {
          return {
            ...order,
            genericName: order.genericName || mapping.genericName,
            karigarName: order.karigarName || mapping.karigarName,
          };
        }
        return order;
      };
      
      const orders = [...pendingOrders.map(enrichOrder), ...readyOrders.map(enrichOrder)];
      const unmappedOrders = orders.filter(
        (order) => !order.genericName || !order.karigarName
      );

      const groupedByDesign = unmappedOrders.reduce((acc, order) => {
        if (!acc[order.design]) {
          acc[order.design] = {
            designCode: order.design,
            count: 0,
            missingGenericName: !order.genericName,
            missingKarigarName: !order.karigarName,
          };
        }
        acc[order.design].count++;
        return acc;
      }, {} as Record<string, { designCode: string; count: number; missingGenericName: boolean; missingKarigarName: boolean }>);

      return Object.values(groupedByDesign);
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      designCode,
      blob,
    }: {
      designCode: string;
      blob: ExternalBlob;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadDesignImage(designCode, blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImages"] });
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (images: Array<[string, ExternalBlob]>) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUploadDesignImages(images);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImages"] });
    },
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<{ imageUrl: string; designCode: string; genericName?: string; karigarName?: string } | null>({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;

      // Get design mapping for additional details
      const pendingOrders = await actor.getOrders(null, null, null);
      const readyOrders = await actor.getReadyOrders();
      
      // Get all design mappings to enrich orders
      const mappingsArray = await actor.getAllMasterDesignMappings();
      const mappingsMap = new Map(mappingsArray.map(([code, mapping]) => [code, mapping]));
      
      const orders = [...pendingOrders, ...readyOrders];
      const order = orders.find((o) => o.design === designCode);
      
      // Use order data if available, otherwise fall back to master mappings
      let genericName = order?.genericName;
      let karigarName = order?.karigarName;
      
      if ((!genericName || !karigarName) && mappingsMap.has(designCode)) {
        const mapping = mappingsMap.get(designCode)!;
        genericName = genericName || mapping.genericName;
        karigarName = karigarName || mapping.karigarName;
      }

      return {
        imageUrl: blob.getDirectURL(),
        designCode,
        genericName,
        karigarName,
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
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignExcel"] });
    },
  });
}

export function useGetMasterDesignExcel() {
  const { actor, isFetching } = useActor();

  return useQuery<ExternalBlob | null>({
    queryKey: ["masterDesignExcel"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor && !isFetching,
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
