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
export type Time = bigint;
export interface DesignMapping {
    createdAt: Time;
    createdBy: Principal;
    karigarName: string;
    updatedAt: Time;
    updatedBy?: Principal;
    genericName: string;
    designCode: string;
}
export interface Karigar {
    name: string;
    createdAt: Time;
    createdBy: Principal;
}
export interface Order {
    weight: number;
    status: OrderStatus;
    createdAt: Time;
    size: number;
    orderType: OrderType;
    design: string;
    orderId: string;
    orderNo: string;
    karigarName: string;
    updatedAt: Time;
    genericName: string;
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
    RB = "RB"
}
export interface backendInterface {
    addKarigar(name: string): Promise<void>;
    batchUploadDesignImages(images: Array<[string, ExternalBlob]>): Promise<void>;
    deleteOrder(orderId: string): Promise<void>;
    getDesignImage(designCode: string): Promise<ExternalBlob | null>;
    getDesignMapping(designCode: string): Promise<DesignMapping>;
    getKarigars(): Promise<Array<Karigar>>;
    getOrders(statusFilter: OrderStatus | null, typeFilter: OrderType | null, searchText: string | null): Promise<Array<Order>>;
    reassignDesign(designCode: string, newKarigar: string): Promise<void>;
    saveDesignMapping(designCode: string, genericName: string, karigarName: string): Promise<void>;
    saveOrder(orderNo: string, orderType: OrderType, product: string, design: string, weight: number, size: number, quantity: bigint, remarks: string, genericName: string, karigarName: string, status: OrderStatus, orderId: string): Promise<void>;
    uploadDesignImage(designCode: string, blob: ExternalBlob): Promise<void>;
}
