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
export interface MasterDataRow {
    weight: number;
    karigar: string;
    orderDate?: Time;
    orderNo: string;
    quantity: bigint;
    designCode: string;
}
export type Time = bigint;
export interface Karigar {
    name: string;
    createdAt: Time;
    createdBy: string;
}
export interface Order {
    weight: number;
    status: OrderStatus;
    readyDate?: Time;
    originalOrderId?: string;
    createdAt: Time;
    size: number;
    orderDate?: Time;
    orderType: OrderType;
    design: string;
    orderId: string;
    orderNo: string;
    karigarName?: string;
    updatedAt: Time;
    genericName?: string;
    quantity: bigint;
    remarks: string;
    product: string;
}
export interface DesignMapping {
    createdAt: Time;
    createdBy: string;
    karigarName: string;
    updatedAt: Time;
    updatedBy?: string;
    genericName: string;
    designCode: string;
}
export interface MasterPersistedResponse {
    persisted: Array<Order>;
}
export interface MasterReconciliationResult {
    missingInMasterCount: bigint;
    newLinesCount: bigint;
    alreadyExistingRows: bigint;
    totalUploadedRows: bigint;
    newLines: Array<MasterDataRow>;
    missingInMaster: Array<Order>;
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
    batchSupplyNewRBOrders(orderQuantities: Array<[string, bigint]>): Promise<void>;
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
    getKarigars(): Promise<Array<Karigar>>;
    getMasterDesignExcel(): Promise<ExternalBlob | null>;
    getMasterDesignKarigars(): Promise<Array<string>>;
    getMasterDesigns(): Promise<Array<[string, string, string]>>;
    getOrder(orderId: string): Promise<Order | null>;
    getOrders(_statusFilter: OrderStatus | null, _typeFilter: OrderType | null, _searchText: string | null): Promise<Array<Order>>;
    getOrdersWithMappings(): Promise<Array<Order>>;
    getReadyOrders(): Promise<Array<Order>>;
    getReadyOrdersByDateRange(startDate: Time, endDate: Time): Promise<Array<Order>>;
    getUniqueKarigarsFromDesignMappings(): Promise<Array<string>>;
    getUnreturnedOrders(): Promise<Array<Order>>;
    isExistingDesignCodes(designCodes: Array<string>): Promise<Array<boolean>>;
    markAllAsReady(): Promise<void>;
    markOrdersAsReady(orderIds: Array<string>): Promise<void>;
    persistMasterDataRows(masterRows: Array<MasterDataRow>): Promise<MasterPersistedResponse>;
    reassignDesign(designCode: string, newKarigar: string): Promise<void>;
    reconcileMasterFile(masterDataRows: Array<MasterDataRow>): Promise<MasterReconciliationResult>;
    resetActiveOrders(): Promise<void>;
    returnOrdersToPending(orderNo: string, returnedQty: bigint): Promise<void>;
    returnReadyOrderToPending(orderId: string, returnedQty: bigint): Promise<void>;
    saveDesignMapping(designCode: string, genericName: string, karigarName: string): Promise<void>;
    saveOrder(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, orderId: string, orderDate: Time | null): Promise<void>;
    supplyAndReturnOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    supplyOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    updateDesignGroupStatus(designCodes: Array<string>): Promise<void>;
    updateDesignMapping(designCode: string, newGenericName: string, newKarigarName: string): Promise<void>;
    updateMasterDesignKarigars(karigars: Array<string>): Promise<void>;
    uploadDesignImage(designCode: string, blob: ExternalBlob): Promise<void>;
    uploadDesignMapping(mappingData: Array<MappingRecord>): Promise<void>;
    uploadMasterDesignExcel(blob: ExternalBlob): Promise<void>;
}
