import Map "mo:core/Map";
import Text "mo:core/Text";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";

module {
  // Updated types to match persistent actor state - all fields must be present
  type OrderType = { #CO; #RB };
  type OrderStatus = {
    #Pending;
    #Ready;
    #Hallmark;
    #ReturnFromHallmark;
  };

  type PersistentOrder = {
    orderNo : Text;
    orderType : OrderType;
    product : Text;
    design : Text;
    weight : Float;
    size : Float;
    quantity : Nat;
    remarks : Text;
    suppliedQty : Nat;
    status : OrderStatus;
    orderId : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Principal.Principal;
    updatedBy : ?Principal.Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldActor = {
    orders : Map.Map<Text, PersistentOrder>;
    designMappings : Map.Map<Text, DesignMapping>;
  };

  type NewActor = {
    orders : Map.Map<Text, PersistentOrder>;
    designMappings : Map.Map<Text, DesignMapping>;
  };

  public func run(old : OldActor) : NewActor {
    { orders = old.orders; designMappings = old.designMappings };
  };
};
