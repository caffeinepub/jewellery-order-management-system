import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useActor } from "./useActor";
import { OrderStatus, OrderType, DesignMapping, MappingRecord, ExternalBlob } from "../backend";
import { toast } from "sonner";
import type { Order } from "../backend";

// ─── Queries ────────────────────────────────────────────────────────────────

export function useGetAllOrders() {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders"],
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

export function useGetOrdersByKarigar(karigarName: string) {
  const { actor, isFetching } = useActor();
  return useQuery<Order[]>({
    queryKey: ["orders", "karigar", karigarName],
    queryFn: async () => {
      if (!actor) return [];
      const orders = await actor.getOrdersWithMappings();
      return orders.filter((order) => order.karigarName === karigarName);
    },
    enabled: !!actor && !isFetching && !!karigarName,
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

export function useGetMasterDesigns() {
  const { actor, isFetching } = useActor();
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
    enabled: !!actor && !isFetching,
  });
}

export function useGetAllMasterDesignMappings() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<[string, DesignMapping]>>({
    queryKey: ["masterDesignMappings"],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getAllMasterDesignMappings();
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

export function useGetDesignImage(designCode: string) {
  const { actor, isFetching } = useActor();
  return useQuery<{
    imageUrl: string;
    designCode: string;
    genericName?: string;
    karigarName?: string;
  } | null>({
    queryKey: ["designImage", designCode],
    queryFn: async () => {
      if (!actor || !designCode) return null;
      const blob = await actor.getDesignImage(designCode);
      if (!blob) return null;
      const imageUrl = blob.getDirectURL();
      let genericName: string | undefined;
      let karigarName: string | undefined;
      try {
        const mapping = await actor.getDesignMapping(designCode);
        genericName = mapping.genericName;
        karigarName = mapping.karigarName;
      } catch {
        // mapping may not exist
      }
      return { imageUrl, designCode, genericName, karigarName };
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

// ─── Mutations ───────────────────────────────────────────────────────────────

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
        params.orderId
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
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete order: ${message}`);
    },
  });
}

export function useBatchDeleteOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      if (!orderIds || orderIds.length === 0) {
        throw new Error("No order IDs provided for deletion");
      }
      return actor.batchDeleteOrders(orderIds);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      toast.success(
        variables.length === 1
          ? "Order deleted successfully"
          : `${variables.length} orders deleted successfully`
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Batch delete orders error:", message);
      toast.error(`Orders failed to delete: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to delete ready order: ${message}`);
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
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to mark orders as ready: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update order status: ${message}`);
    },
  });
}

export function useUpdateDesignGroupStatus() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderIds: string[]) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchUpdateOrderStatus(orderIds, OrderStatus.Hallmark);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update design group status: ${message}`);
    },
  });
}

/**
 * Returns selected Ready orders back to Pending in Total Orders.
 * Groups selected orders by orderNo and sums their quantities,
 * then calls batchReturnOrdersToPending with [orderNo, totalQty] tuples.
 *
 * Backend logic:
 * - supplied qty = pending qty → creates a new Pending order line with returned qty
 * - supplied qty < pending qty → adds supplied qty back to the existing Pending order line
 */
export function useBatchReturnReadyOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderRequests: Array<[string, bigint]>) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchReturnOrdersToPending(orderRequests);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      const orderCount = variables.length;
      toast.success(
        orderCount === 1
          ? "Order returned to Total Orders as Pending"
          : `${orderCount} order group${orderCount > 1 ? "s" : ""} returned to Total Orders as Pending`
      );
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error occurred";
      console.error("Batch return ready orders error:", message);
      toast.error(`Failed to return orders: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save design mapping: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update design mapping: ${message}`);
    },
  });
}

export function useReassignDesign() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { designCode: string; newKarigar: string }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.reassignDesign(params.designCode, params.newKarigar);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to reassign design: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["masterDesignKarigars"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to add karigar: ${message}`);
    },
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
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload master design excel: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload design mapping: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to assign orders to karigar: ${message}`);
    },
  });
}

export function useUploadDesignImage() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { designCode: string; blob: ExternalBlob }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.uploadDesignImage(params.designCode, params.blob);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["designImageMapping"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload design image: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["designImageMapping"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to upload design images: ${message}`);
    },
  });
}

export function useGetReadyOrdersByDateRange() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { startDate: bigint; endDate: bigint }) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.getReadyOrdersByDateRange(params.startDate, params.endDate);
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to fetch orders by date range: ${message}`);
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
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
      queryClient.invalidateQueries({ queryKey: ["karigars"] });
      toast.success("All active orders have been reset successfully");
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to reset active orders: ${message}`);
    },
  });
}

export function useBatchSupplyRBOrders() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (orderQuantities: Array<[string, bigint]>) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchSupplyRBOrders(orderQuantities);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["readyOrders"] });
      queryClient.invalidateQueries({ queryKey: ["ordersWithMappings"] });
      queryClient.invalidateQueries({ queryKey: ["unmappedOrders"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to supply RB orders: ${message}`);
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
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to check design codes: ${message}`);
    },
  });
}

export function useBatchSaveDesignMappings() {
  const { actor } = useActor();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (mappings: Array<[string, DesignMapping]>) => {
      if (!actor) throw new Error("Actor not initialized");
      return actor.batchSaveDesignMappings(mappings);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masterDesigns"] });
      queryClient.invalidateQueries({ queryKey: ["masterDesignMappings"] });
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to save design mappings: ${message}`);
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
    },
    onError: (error: unknown) => {
      const message = error instanceof Error ? error.message : "Unknown error";
      toast.error(`Failed to update master design karigars: ${message}`);
    },
  });
}
