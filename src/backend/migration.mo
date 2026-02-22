import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Storage "blob-storage/Storage";

module {
  type OrderType = {
    #CO;
    #RB;
  };

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
    status : OrderStatus;
    orderId : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Principal;
    updatedBy : ?Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Karigar = {
    name : Text;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  type MappingRecord = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
  };

  type State = {
    orders : Map.Map<Text, PersistentOrder>;
    designMappings : Map.Map<Text, DesignMapping>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    masterDesignMappings : Map.Map<Text, DesignMapping>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
  };

  public func run(state : State) : State {
    state;
  };
};
