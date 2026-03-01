import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import Storage "blob-storage/Storage";
import Time "mo:core/Time";

module {
  type OrderType = {
    #CO;
    #RB;
    #SO;
  };

  type OrderStatus = {
    #Pending;
    #Ready;
    #Hallmark;
    #ReturnFromHallmark;
  };

  type Order = {
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

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Karigar = {
    name : Text;
    createdBy : Text;
    createdAt : Time.Time;
  };

  type OldActor = {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, DesignMapping>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
  };

  type NewActor = OldActor;

  public func run(old : OldActor) : NewActor {
    old;
  };
};
