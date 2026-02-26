import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
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

  type OldOrder = {
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
  };

  type NewOrder = {
    orderNo : Text;
    orderType : OrderType;
    product : Text;
    design : Text;
    weightPerUnit : Float;
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
  };

  public type Summary = {
    totalOrders : Nat;
    totalWeight : Float;
    totalQuantity : Nat;
    totalCO : Nat;
  };

  type OldActor = {
    orders : Map.Map<Text, OldOrder>;
    originalSummary : ?Summary;
  };

  type NewActor = {
    orders : Map.Map<Text, NewOrder>;
    originalSummary : ?Summary;
  };

  public func run(old : OldActor) : NewActor {
    let newOrders = old.orders.map<Text, OldOrder, NewOrder>(
      func(_id, oldOrder) {
        {
          oldOrder with
          weightPerUnit = oldOrder.weight;
        };
      }
    );
    {
      old with
      orders = newOrders;
    };
  };
};
