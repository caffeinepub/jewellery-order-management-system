import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Text "mo:core/Text";

module {
  // Old types
  type PersistentOrder = {
    orderNo : Text;
    orderType : {
      #CO;
      #RB;
    };
    product : Text;
    design : Text;
    weight : Float;
    size : Float;
    quantity : Nat;
    remarks : Text;
    status : {
      #Pending;
      #Ready;
      #Hallmark;
      #ReturnFromHallmark;
    };
    orderId : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type OldActor = {
    orders : Map.Map<Text, PersistentOrder>;
    readyOrders : Map.Map<Text, PersistentOrder>;
  };

  // New types
  type Order = {
    orderNo : Text;
    orderType : {
      #CO;
      #RB;
    };
    product : Text;
    design : Text;
    weight : Float;
    size : Float;
    quantity : Nat;
    remarks : Text;
    genericName : ?Text;
    karigarName : ?Text;
    status : {
      #Pending;
      #Ready;
      #Hallmark;
      #ReturnFromHallmark;
    };
    orderId : Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type NewActor = {
    orders : Map.Map<Text, Order>;
    readyOrders : Map.Map<Text, Order>;
  };

  public func run(old : OldActor) : NewActor {
    let newOrders = old.orders.map<Text, PersistentOrder, Order>(
      func(_id, oldOrder) {
        {
          oldOrder with
          genericName = null;
          karigarName = null;
        };
      }
    );

    let newReadyOrders = old.readyOrders.map<Text, PersistentOrder, Order>(
      func(_id, oldOrder) {
        {
          oldOrder with
          genericName = null;
          karigarName = null;
        };
      }
    );

    {
      old with
      orders = newOrders;
      readyOrders = newReadyOrders;
    };
  };
};
