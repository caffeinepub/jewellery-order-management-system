import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface MasterReconciliationResult {
    missingInMasterCount: bigint;
    newLinesCount: bigint;
    alreadyExistingRows: bigint;
    totalUploadedRows: bigint;
    newLines: Array<MasterDataRow>;
    missingInMaster: Array<Order>;
}
export interface MasterPersistedResponse {
    persisted: Array<Order>;
}
export type Time = bigint;
export interface MasterDataRow {
    weight: number;
    karigar: string;
    orderDate?: Time;
    orderType: OrderType;
    orderNo: string;
    quantity: bigint;
    designCode: string;
}
export interface MappingRecord {
    karigarName: string;
    genericName: string;
    designCode: string;
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
    movedBy?: string;
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
    batchDeleteOrders(_orderIds: Array<string>): Promise<void>;
    batchGetByStatus(ids: Array<string>, compareStatus: OrderStatus): Promise<Array<string>>;
    batchReturnOrdersToPending(_orderRequests: Array<[string, bigint]>): Promise<void>;
    batchSaveDesignMappings(mappings: Array<[string, DesignMapping]>): Promise<void>;
    batchUpdateOrderStatus(orderIds: Array<string>, newStatus: OrderStatus): Promise<void>;
    clearAllDesignMappings(): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    deleteReadyOrder(orderId: string): Promise<void>;
    getAllMasterDesignMappings(): Promise<Array<[string, DesignMapping]>>;
    getAllOrders(): Promise<Array<Order>>;
    getDesignCountByKarigar(_karigarName: string): Promise<bigint | null>;
    getDesignMapping(designCode: string): Promise<DesignMapping>;
    getFilteredOutKarigars(): Promise<Array<string>>;
    getKarigars(): Promise<Array<Karigar>>;
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
    markOrdersAsPending(orderIds: Array<string>): Promise<void>;
    markOrdersAsReady(orderIds: Array<string>): Promise<void>;
    persistMasterDataRows(masterRows: Array<MasterDataRow>): Promise<MasterPersistedResponse>;
    reassignDesign(designCode: string, newKarigar: string, movedBy: string): Promise<void>;
    reconcileMasterFile(masterDataRows: Array<MasterDataRow>): Promise<MasterReconciliationResult>;
    registerKarigar(name: string): Promise<void>;
    resetActiveOrders(): Promise<void>;
    returnOrdersToPending(_orderNo: string, _returnedQty: bigint): Promise<void>;
    saveDesignMapping(designCode: string, genericName: string, karigarName: string): Promise<void>;
    saveModifiedOrder(_count: bigint, _startQty: bigint, order: Order): Promise<void>;
    saveOrder(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, orderId: string, orderDate: Time | null): Promise<void>;
    supplyAndReturnOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    supplyOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    updateDesignGroupStatus(designCodes: Array<string>): Promise<void>;
    updateDesignMapping(designCode: string, newGenericName: string, newKarigarName: string): Promise<void>;
    updateMasterDesignKarigars(karigars: Array<string>): Promise<void>;
    uploadDesignMapping(mappingData: Array<MappingRecord>): Promise<void>;
}
