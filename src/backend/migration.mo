import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";

module {
  type OldOrderType = {
    #CO;
    #RB;
    #SO;
  };

  type OldOrder = {
    orderNo : Text;
    orderType : OldOrderType;
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

  type Actor = {
    orders : Map.Map<Text, OldOrder>;
  };

  public func run(old : Actor) : Actor {
    let transformedOrders = old.orders.map<Text, OldOrder, OldOrder>(
      func(_id, order) {
        if (needsSOType(order) and order.orderType != #SO) {
          { order with orderType = #SO };
        } else {
          order;
        };
      }
    );
    { orders = transformedOrders };
  };

  func needsSOType(order : OldOrder) : Bool {
    let inRange = order.weight >= 10 and order.weight <= 500;
    let hasGenericName = order.genericName.isNull();
    let hasKarigarName = order.karigarName.isNull();
    let product = order.product;

    inRange and hasGenericName and hasKarigarName and Text.equal(product, "BARS")
  };
};
