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
export interface Karigar {
    name: string;
    createdAt: Time;
    createdBy: string;
}
export interface Order {
    weight: number;
    status: OrderStatus;
    readyDate?: Time;
    createdAt: Time;
    size: number;
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
    batchSaveDesignMappings(mappings: Array<[string, DesignMapping]>): Promise<void>;
    batchUpdateOrderStatus(orderIds: Array<string>, newStatus: OrderStatus): Promise<void>;
    batchUploadDesignImages(images: Array<[string, ExternalBlob]>): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    deleteReadyOrder(orderId: string): Promise<void>;
    getAllMasterDesignMappings(): Promise<Array<[string, DesignMapping]>>;
    getAllOrders(): Promise<Array<Order>>;
    getDesignImage(designCode: string): Promise<ExternalBlob | null>;
    getDesignMapping(designCode: string): Promise<DesignMapping>;
    getKarigars(): Promise<Array<Karigar>>;
    getMasterDesignExcel(): Promise<ExternalBlob | null>;
    getMasterDesignKarigars(): Promise<Array<string>>;
    getOrders(_statusFilter: OrderStatus | null, _typeFilter: OrderType | null, _searchText: string | null): Promise<Array<Order>>;
    getOrdersWithMappings(): Promise<Array<Order>>;
    getReadyOrders(): Promise<Array<Order>>;
    getReadyOrdersByDateRange(startDate: Time, endDate: Time): Promise<Array<Order>>;
    getUniqueKarigarsFromDesignMappings(): Promise<Array<string>>;
    isExistingDesignCodes(designCodes: Array<string>): Promise<Array<boolean>>;
    markOrdersAsReady(orderIds: Array<string>): Promise<void>;
    markOrdersAsReturned(orderIds: Array<string>): Promise<void>;
    reassignDesign(designCode: string, newKarigar: string): Promise<void>;
    resetActiveOrders(): Promise<void>;
    saveDesignMapping(designCode: string, genericName: string, karigarName: string): Promise<void>;
    saveOrder(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, orderId: string): Promise<void>;
    supplyAndReturnOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    supplyOrder(orderId: string, suppliedQuantity: bigint): Promise<void>;
    updateDesignGroupStatus(designCodes: Array<string>): Promise<void>;
    updateDesignMapping(designCode: string, newGenericName: string, newKarigarName: string): Promise<void>;
    updateMasterDesignKarigars(karigars: Array<string>): Promise<void>;
    uploadDesignImage(designCode: string, blob: ExternalBlob): Promise<void>;
    uploadDesignMapping(mappingData: Array<MappingRecord>): Promise<void>;
    uploadMasterDesignExcel(blob: ExternalBlob): Promise<void>;
}
