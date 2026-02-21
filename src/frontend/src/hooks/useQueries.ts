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
      return actor.getOrders(statusFilter || null, typeFilter || null, searchText || null);
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

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName],
    queryFn: async () => {
      if (!actor) return [];
      const allOrders = await actor.getOrders(null, null, null);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useGetDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["designMappings"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrders(null, null, null);
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

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ designCode, newKarigar }: { designCode: string; newKarigar: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reassignDesign(designCode, newKarigar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
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
    },
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({ designCode, blob }: { designCode: string; blob: ExternalBlob }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadDesignImage(designCode, blob);
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (images: Array<[string, ExternalBlob]>) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUploadDesignImages(images);
    },
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<{ imageUrl: string | null; designCode: string; genericName: string | null; karigarName: string | null } | null>({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;

      // Get design details
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

export function useGetUnmappedOrders() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["unmappedOrders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrders(null, null, null);
      return orders.filter((order) => !order.genericName || !order.karigarName);
    },
    enabled: !!actor && !isFetching,
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
      return actor.saveDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["designMappings"] });
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
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
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
      if (!actor) throw new Error("Actor not initialized");
      
      if (newStatus === OrderStatus.Ready) {
        return actor.updateOrdersStatusToReady(orderIds);
      }
      
      throw new Error("Only Ready status updates are supported");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
