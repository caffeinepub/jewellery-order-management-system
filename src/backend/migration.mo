import Map "mo:core/Map";
import Time "mo:core/Time";

module {
  type OldOrder = {
    orderNo : Text;
    orderType : {
      #CO;
      #RB;
      #SO;
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
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldActor = {
    orders : Map.Map<Text, OldOrder>;
  };

  type NewOrder = {
    orderNo : Text;
    orderType : {
      #CO;
      #RB;
      #SO;
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
    createdAt : Time.Time;
    updatedAt : Time.Time;
    readyDate : ?Time.Time;
  };

  type NewActor = {
    orders : Map.Map<Text, NewOrder>;
  };

  // Migration function called by the main actor via the with-clause
  public func run(old : OldActor) : NewActor {
    let newOrders = old.orders.map<Text, OldOrder, NewOrder>(
      func(_orderId, oldOrder) {
        { oldOrder with
          readyDate = if (oldOrder.status == #Ready) { ?oldOrder.updatedAt } else { null }
        };
      }
    );
    { orders = newOrders };
  };
};
