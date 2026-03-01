import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Time "mo:core/Time";
import Storage "blob-storage/Storage";

module {
  public type OrderType = {
    #CO;
    #RB;
    #SO;
  };

  public type OrderStatus = {
    #Pending;
    #Ready;
    #Hallmark;
    #ReturnFromHallmark;
  };

  public type Order = {
    orderNo : Text;
    orderType : OrderType;
    product : Text;
    design : Text;
    weight : Float;
    size : Float;
    quantity : Nat;
    remarks : Text;
    genericName : ?Text;
    karigarName : ?Text;
    status : OrderStatus;
    orderId : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
    readyDate : ?Time.Time;
    originalOrderId : ?Text;
    orderDate : ?Time.Time;
  };

  public type Karigar = {
    name : Text;
    createdBy : Text;
    createdAt : Time.Time;
  };

  public func run(previous : {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, {
      designCode : Text;
      genericName : Text;
      karigarName : Text;
      createdBy : Text;
      updatedBy : ?Text;
      createdAt : Time.Time;
      updatedAt : Time.Time;
    }>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
    rbStateBackup : Map.Map<Time.Time, {
      var totalQty : Nat;
      var totalWeight : Float;
      var totalOrders : Nat;
      var totalReadyQty : Nat;
      var totalReadyWeight : Float;
    }>;
    rbSummary : {
      var totalQty : Nat;
      var totalWeight : Float;
      var totalOrders : Nat;
      var totalReadyQty : Nat;
      var totalReadyWeight : Float;
    };
  }) : {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, {
      designCode : Text;
      genericName : Text;
      karigarName : Text;
      createdBy : Text;
      updatedBy : ?Text;
      createdAt : Time.Time;
      updatedAt : Time.Time;
    }>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
  } {
    {
      previous with
      orders = previous.orders;
      designMappings = previous.designMappings;
      designImages = previous.designImages;
      karigars = previous.karigars;
      masterDesignKarigars = previous.masterDesignKarigars;
      masterDesignExcel = previous.masterDesignExcel;
      activeKarigar = previous.activeKarigar;
    };
  };
};
