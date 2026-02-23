import Map "mo:core/Map";
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
  };

  type OldActor = {
    orders : Map.Map<Text, Order>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
  };

  public func run(old : OldActor) : { orders : Map.Map<Text, Order>; designImages : Map.Map<Text, Storage.ExternalBlob> } {
    old;
  };
};
