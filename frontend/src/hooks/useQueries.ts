import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { Order, OrderStatus, OrderType, DesignMapping, ExternalBlob } from "../backend";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`Request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();

  return useQuery<Order[]>({
    queryKey: ["orders"],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await withTimeout(actor.getAllOrders(), 15000);
      return orders;
    },
    enabled: !!actor && !isFetching,
    retry: 2,
    retryDelay: 3000,
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

  return useQuery<string[]>({
    queryKey: ["karigars"],
    queryFn: async () => {
      if (!actor) return [];
      const karigars = await actor.getKarigars();
      return karigars.map((k) => k.name);
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

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, DesignMapping][]>({
    queryKey: ["masterDesignMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();

  return useQuery<{ url: string; genericName?: string; karigarName?: string } | null>({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor || !designCode) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;
      return { url: blob.getDirectURL() };
    },
    enabled: !!actor && !isFetching && !!designCode,
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
    },
  });
}

export function useBatchSaveOrders() {
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
        orderId: string;
      }>
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      for (const order of orders) {
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
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchDeleteOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.batchDeleteOrders(orderIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
    },
  });
}

export function useUpdateDesignMapping() {
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
      await actor.updateDesignMapping(designCode, genericName, karigarName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
    },
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
      await actor.uploadDesignImage(designCode, blob);
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
    mutationFn: async (images: Array<{ designCode: string; blob: ExternalBlob }>) => {
      if (!actor) throw new Error("Actor not initialized");
      const imagePairs: [string, ExternalBlob][] = images.map((img) => [
        img.designCode,
        img.blob,
      ]);
      await actor.batchUploadDesignImages(imagePairs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImages"] });
    },
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

  return useQuery<ExternalBlob | null>({
    queryKey: ["masterDesignExcel"],
    queryFn: async () => {
      if (!actor) return null;
      return actor.getMasterDesignExcel();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useUploadDesignMapping() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      mappingData: Array<{
        designCode: string;
        genericName: string;
        karigarName: string;
      }>
    ) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.uploadDesignMapping(mappingData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      await actor.batchUpdateOrderStatus(orderIds, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useGetReadyOrdersByDateRange() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      startDate,
      endDate,
    }: {
      startDate: Date;
      endDate: Date;
    }) => {
      if (!actor) throw new Error("Actor not initialized");
      const startTime = BigInt(startDate.getTime()) * BigInt(1_000_000);
      const endTime = BigInt(endDate.getTime()) * BigInt(1_000_000);
      return actor.getReadyOrdersByDateRange(startTime, endTime);
    },
  });
}

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (designCodes: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.updateDesignGroupStatus(designCodes);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useAssignOrdersToKarigar() {
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
      if (!actor) throw new Error("Actor not initialized");
      await actor.assignOrdersToKarigar(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["uniqueKarigars"] });
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
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
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchReturnReadyOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderRequests: Array<[string, bigint]>) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.batchReturnOrdersToPending(orderRequests);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (orderQuantities: Array<[string, bigint]>) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.batchSupplyRBOrders(orderQuantities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
      await actor.resetActiveOrders();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
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

export function useGetDesignImageMapping() {
  const { actor, isFetching } = useActor();

  return useQuery<[string, ExternalBlob][]>({
    queryKey: ["designImageMapping"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getDesignImageMapping();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useClearAllDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.clearAllDesignMappings();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
  });
}

export function useMarkAllAsReady() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.markAllAsReady();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
    },
  });
}

export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (mappings: Array<[string, DesignMapping]>) => {
      if (!actor) throw new Error("Actor not initialized");
      await actor.batchSaveDesignMappings(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
  });
}
