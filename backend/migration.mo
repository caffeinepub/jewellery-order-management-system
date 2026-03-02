import Map "mo:core/Map";
import Text "mo:core/Text";
import Storage "blob-storage/Storage";

module {
  type OldActor = {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, DesignMapping>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    filteredOutKarigars : Map.Map<Text, Bool>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    activeKarigar : ?Text;
    masterDesignExcel : ?Storage.ExternalBlob;
  };

  type Order = {
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
    createdAt : Int;
    updatedAt : Int;
    readyDate : ?Int;
    originalOrderId : ?Text;
    orderDate : ?Int;
    movedBy : ?Text;
  };

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Int;
    updatedAt : Int;
  };

  type Karigar = {
    name : Text;
    createdBy : Text;
    createdAt : Int;
  };

  type NewActor = {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, DesignMapping>;
    karigars : Map.Map<Text, Karigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    filteredOutKarigars : Map.Map<Text, Bool>;
    activeKarigar : ?Text;
  };

  public func run(old : OldActor) : NewActor {
    {
      orders = old.orders;
      designMappings = old.designMappings;
      karigars = old.karigars;
      masterDesignKarigars = old.masterDesignKarigars;
      filteredOutKarigars = old.filteredOutKarigars;
      activeKarigar = old.activeKarigar;
    };
  };
};
