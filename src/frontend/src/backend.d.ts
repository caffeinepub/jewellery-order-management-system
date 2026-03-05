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
    excelGenericName: string;
    genericName: string;
    designCode: string;
}
export interface MasterDataRow {
    karigar: string;
    genericName: string;
    designCode: string;
}
export type Time = bigint;
export interface OrderStatusLog {
    id: string;
    oldStatus: OrderStatus;
    orderId: string;
    updatedAt: Time;
    updatedBy: string;
    newStatus: OrderStatus;
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
    updatedBy?: string;
    genericName?: string;
    quantity: bigint;
    lastAction?: string;
    remarks: string;
    product: string;
}
export interface AppUser {
    id: string;
    status: AppStatus;
    name: string;
    createdAt: Time;
    role: AppRole;
    karigarName?: string;
    loginId: string;
    passwordHash: string;
}
export interface MasterDesignMapping {
    karigar: string;
    excelGenericName: string;
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
export interface MasterPersistedResponse {
    reconciliationResult: MasterReconciliationResult;
    persistedRows: Array<MasterDataRow>;
}
export interface MasterReconciliationResult {
    missingInExcel: Array<MasterDataRow>;
    matchedRows: Array<MasterDataRow>;
    missingInSystem: Array<MasterDataRow>;
}
export enum AppRole {
    Staff = "Staff",
    Admin = "Admin",
    Karigar = "Karigar"
}
export enum AppStatus {
    Inactive = "Inactive",
    Active = "Active"
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
    batchSaveDesignMappings(mappings: Array<MappingRecord>, createdBy: string): Promise<void>;
    batchUpdateOrderStatus(orderIds: Array<string>, newStatus: OrderStatus, updatedBy: string): Promise<void>;
    clearAllDesignMappings(): Promise<void>;
    createOrder(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, genericName: string | null, karigarName: string | null): Promise<string>;
    createOrderWithDate(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, genericName: string | null, karigarName: string | null, orderDate: Time | null): Promise<string>;
    createUser(name: string, loginId: string, passwordHash: string, role: AppRole, karigarName: string | null): Promise<string>;
    deleteOrder(orderId: string): Promise<void>;
    getAllMasterDesignMappings(): Promise<Array<MasterDesignMapping>>;
    getAllOrderStatusLogs(): Promise<Array<OrderStatusLog>>;
    getAllOrders(): Promise<Array<Order>>;
    getDesignCountByKarigar(): Promise<Array<[string, bigint]>>;
    getDesignImageMapping(): Promise<Array<[string, DesignMapping]>>;
    getDesignMapping(designCode: string): Promise<DesignMapping | null>;
    getFilteredOutKarigars(): Promise<Array<string>>;
    getKarigars(): Promise<Array<Karigar>>;
    getMasterDesignExcel(): Promise<ExternalBlob | null>;
    getMasterDesigns(): Promise<Array<string>>;
    getOrder(orderId: string): Promise<Order | null>;
    getOrderStatusLog(orderId: string): Promise<Array<OrderStatusLog>>;
    getOrdersByStatus(status: OrderStatus): Promise<Array<Order>>;
    getReadyOrders(): Promise<Array<Order>>;
    getUniqueKarigarsFromDesignMappings(): Promise<Array<string>>;
    getUser(id: string): Promise<AppUser | null>;
    getUserByLoginId(loginId: string): Promise<AppUser | null>;
    initDefaultAdmin(): Promise<void>;
    isExistingDesignCodes(designCode: string): Promise<boolean>;
    listUsers(): Promise<Array<AppUser>>;
    logOrderStatusChange(orderId: string, oldStatus: OrderStatus, newStatus: OrderStatus, updatedBy: string): Promise<void>;
    login(loginId: string, hashedPassword: string): Promise<{
        id: string;
        name: string;
        role: AppRole;
        karigarName?: string;
    } | null>;
    markOrdersAsPending(orderIds: Array<string>, updatedBy: string): Promise<void>;
    markOrdersAsReady(orderIds: Array<string>, updatedBy: string): Promise<void>;
    persistMasterDataRows(rows: Array<MasterDataRow>): Promise<MasterPersistedResponse>;
    reconcileMasterFile(): Promise<MasterReconciliationResult>;
    registerKarigar(name: string): Promise<void>;
    resetActiveOrders(): Promise<void>;
    resetDefaultAdmin(): Promise<void>;
    resetUserPassword(id: string, newPasswordHash: string): Promise<void>;
    saveDesignMapping(designMapping: DesignMapping): Promise<void>;
    supplyAndReturnOrder(orderId: string, suppliedQuantity: bigint, updatedBy: string): Promise<void>;
    supplyOrder(orderId: string, suppliedQuantity: bigint, updatedBy: string): Promise<void>;
    updateMasterDesignKarigars(designCode: string, count: bigint): Promise<void>;
    updateOrderQuantity(orderId: string, newQuantity: bigint, updatedBy: string): Promise<void>;
    updateUser(id: string, name: string, loginId: string, role: AppRole, karigarName: string | null, status: AppStatus): Promise<void>;
    uploadDesignImage(designCode: string, image: ExternalBlob): Promise<void>;
    uploadMasterDesignExcel(excelFile: ExternalBlob): Promise<void>;
}
