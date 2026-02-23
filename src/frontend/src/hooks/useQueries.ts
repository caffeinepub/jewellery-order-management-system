import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Order, OrderType, OrderStatus, MappingRecord } from "@/backend";
import { ExternalBlob } from "@/backend";

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getAllOrders();
      
      return orders.map((order) => ({
        ...order,
        genericName: order.genericName || undefined,
        karigarName: order.karigarName || undefined,
      }));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetReadyOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ["ready-orders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getReadyOrders();
      
      return orders.map((order) => ({
        ...order,
        genericName: order.genericName || undefined,
        karigarName: order.karigarName || undefined,
      }));
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
      const orders = await actor.getOrdersWithMappings();
      
      return orders.map((order) => ({
        ...order,
        genericName: order.genericName || undefined,
        karigarName: order.karigarName || undefined,
      }));
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
      
      return orders
        .filter((order) => !order.genericName || !order.karigarName)
        .map((order) => ({
          ...order,
          genericName: order.genericName || undefined,
          karigarName: order.karigarName || undefined,
        }));
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
      const orders = await actor.getAllOrders();
      
      return orders
        .filter((order) => order.karigarName === karigarName)
        .map((order) => ({
          ...order,
          genericName: order.genericName || undefined,
          karigarName: order.karigarName || undefined,
        }));
    },
    enabled: !!actor && !isFetching && !!karigarName,
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
      quantity: number;
      remarks: string;
      orderId: string;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.saveOrder(
        order.orderNo,
        order.orderType,
        order.product,
        order.design,
        order.weight,
        order.size,
        BigInt(order.quantity),
        order.remarks,
        order.orderId
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useSupplyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      suppliedQuantity,
    }: {
      orderId: string;
      suppliedQuantity: number;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.supplyOrder(orderId, BigInt(suppliedQuantity));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useSupplyAndReturnOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      orderId,
      suppliedQuantity,
    }: {
      orderId: string;
      suppliedQuantity: number;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.supplyAndReturnOrder(orderId, BigInt(suppliedQuantity));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
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

export function useAddKarigar() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (name: string) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.addKarigar(name);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
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
      await actor.saveDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
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
      await actor.assignOrdersToKarigar(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
      await actor.reassignDesign(designCode, newKarigar);
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
      await actor.deleteOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async ({
      designCode,
      blob,
    }: {
      designCode: string;
      blob: ExternalBlob;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.uploadDesignImage(designCode, blob);
    },
  });
}

export function useBatchUploadDesignImages() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (images: Array<[string, ExternalBlob]>) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.batchUploadDesignImages(images);
    },
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;

      const imageUrl = blob.getDirectURL();
      
      const mapping = await actor.getDesignMapping(designCode);
      
      return {
        imageUrl,
        designCode: mapping.designCode,
        genericName: mapping.genericName,
        karigarName: mapping.karigarName,
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
      await actor.uploadMasterDesignExcel(blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignExcel"] });
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

export function useIsExistingDesignCodes() {
  const { actor } = useActor();

  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.isExistingDesignCodes(designCodes);
    },
  });
}

export function useUploadDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappingData: MappingRecord[]) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.uploadDesignMapping(mappingData);
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
      await actor.markOrdersAsReady(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useUpdateMasterDesignKarigars() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (karigars: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateMasterDesignKarigars(karigars);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
    },
  });
}

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery({
    queryKey: ["masterDesignMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor && !isFetching,
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
      await actor.updateDesignMapping(designCode, newGenericName, newKarigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
  });
}

export function useResetActiveOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.resetActiveOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}

export function useDeleteReadyOrder() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderId: string) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.deleteReadyOrder(orderId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
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
        await actor.markOrdersAsReady(orderIds);
      } else {
        throw new Error("Only Ready status is supported for bulk updates");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ready-orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
  });
}
