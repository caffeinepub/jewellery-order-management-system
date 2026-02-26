import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export class ExternalBlob {
    getBytes(): Promise<Uint8Array<ArrayBuffer>>;
    getDirectURL(): string;
    static fromURL(url: string): ExternalBlob;
    static fromBytes(blob: Uint8Array<ArrayBuffer>): ExternalBlob;
    withUploadProgress(onProgress: (percentage: number) => void): ExternalBlob;
}
export interface MappingRecord {
    karigarName: string;
    genericName: string;
    designCode: string;
}
export type Time = bigint;
export interface DesignMapping {
    createdAt: Time;
    createdBy: string;
    karigarName: string;
    updatedAt: Time;
    updatedBy?: string;
    genericName: string;
    designCode: string;
}
export interface Summary {
    totalOrders: bigint;
    totalCO: bigint;
    totalWeight: number;
    totalQuantity: bigint;
}
export interface OverallSummary {
    originalSummary: Summary;
}
export interface Karigar {
    name: string;
    createdAt: Time;
    createdBy: string;
}
export interface Order {
    status: OrderStatus;
    readyDate?: Time;
    originalOrderId?: string;
    createdAt: Time;
    size: number;
    orderType: OrderType;
    design: string;
    weightPerUnit: number;
    orderId: string;
    orderNo: string;
    karigarName?: string;
    updatedAt: Time;
    genericName?: string;
    quantity: bigint;
    remarks: string;
    product: string;
}
export enum OrderStatus {
    Ready = "Ready",
    Hallmark = "Hallmark",
    ReturnFromHallmark = "ReturnFromHallmark",
    Pending = "Pending"
}
export enum OrderType {
    CO = "CO",
    RB = "RB",
    SO = "SO"
}
export interface backendInterface {
    addKarigar(name: string): Promise<void>;
    assignOrdersToKarigar(mappings: Array<MappingRecord>): Promise<void>;
    batchDeleteOrders(orderIds: Array<string>): Promise<void>;
    batchGetByStatus(ids: Array<string>, compareStatus: OrderStatus): Promise<Array<string>>;
    batchReturnOrdersToPending(orderRequests: Array<[string, bigint]>): Promise<void>;
    batchSaveDesignMappings(mappings: Array<[string, DesignMapping]>): Promise<void>;
    batchSupplyRBOrders(orderQuantities: Array<[string, bigint]>): Promise<void>;
    batchUpdateOrderStatus(orderIds: Array<string>, newStatus: OrderStatus): Promise<void>;
    batchUploadDesignImages(images: Array<[string, ExternalBlob]>): Promise<void>;
    clearAllDesignMappings(): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    deleteReadyOrder(orderId: string): Promise<void>;
    getAllMasterDesignMappings(): Promise<Array<[string, DesignMapping]>>;
    getAllOrders(): Promise<Array<Order>>;
    getDesignCountByKarigar(_karigarName: string): Promise<bigint | null>;
    getDesignImage(designCode: string): Promise<ExternalBlob | null>;
    getDesignImageMapping(): Promise<Array<[string, ExternalBlob]>>;
    getDesignMapping(designCode: string): Promise<DesignMapping>;
    getHallmarkOrdersSummary(): Promise<{
        totalOrders: bigint;
        totalCO: bigint;
        totalWeight: number;
        totalQuantity: bigint;
    }>;
    getKarigars(): Promise<Array<Karigar>>;
    getMasterDesignExcel(): Promise<ExternalBlob | null>;
    getMasterDesignKarigars(): Promise<Array<string>>;
    getMasterDesigns(): Promise<Array<[string, string, string]>>;
    getOrders(_statusFilter: OrderStatus | null, _typeFilter: OrderType | null, _searchText: string | null): Promise<Array<Order>>;
    getOrdersWithMappings(): Promise<Array<Order>>;
    getOverallSummary(): Promise<OverallSummary | null>;
    getReadyOrders(): Promise<Array<Order>>;
    getReadyOrdersByDateRange(startDate: Time, endDate: Time): Promise<Array<Order>>;
    getReadyOrdersSummary(): Promise<{
        totalOrders: bigint;
        totalCO: bigint;
        totalWeight: number;
        totalQuantity: bigint;
    }>;
    getTotalOrdersSummary(): Promise<{
        totalOrders: bigint;
        totalCO: bigint;
        totalWeight: number;
        totalQuantity: bigint;
    }>;
    getUniqueKarigarsFromDesignMappings(): Promise<Array<string>>;
    getUnreturnedOrders(): Promise<Array<Order>>;
    ingestExcel(excelBlob: ExternalBlob, ordersData: Array<[string, Order]>): Promise<void>;
    isExistingDesignCodes(designCodes: Array<string>): Promise<Array<boolean>>;
    markAllAsReady(): Promise<void>;
    markOrdersAsReady(orderIds: Array<string>): Promise<void>;
    reassignDesign(designCode: string, newKarigar: string): Promise<void>;
    resetActiveOrders(): Promise<void>;
    returnOrdersToPending(orderNo: string, returnedQty: bigint): Promise<void>;
    saveDesignMapping(designCode: string, genericName: string, karigarName: string): Promise<void>;
    saveOrder(orderNo: string, orderType: OrderType, product: string, design: string, weightPerUnit: number, size: number, quantity: bigint, remarks: string, orderId: string): Promise<void>;
    supplyAndReturnOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    supplyOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    updateDesignGroupStatus(designCodes: Array<string>): Promise<void>;
    updateDesignMapping(designCode: string, newGenericName: string, newKarigarName: string): Promise<void>;
    updateMasterDesignKarigars(karigars: Array<string>): Promise<void>;
    uploadDesignImage(designCode: string, blob: ExternalBlob): Promise<void>;
    uploadDesignMapping(mappingData: Array<MappingRecord>): Promise<void>;
    uploadMasterDesignExcel(blob: ExternalBlob): Promise<void>;
}
