import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Time "mo:core/Time";
import Storage "blob-storage/Storage";
import Principal "mo:core/Principal";

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

  type OldDesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Principal;
    updatedBy : ?Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type NewDesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type OldKarigar = {
    name : Text;
    createdBy : Principal;
    createdAt : Time.Time;
  };

  type NewKarigar = {
    name : Text;
    createdBy : Text;
    createdAt : Time.Time;
  };

  type OldActor = {
    orders : Map.Map<Text, Order>;
    readyOrders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, OldDesignMapping>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    masterDesignMappings : Map.Map<Text, OldDesignMapping>;
    karigars : Map.Map<Text, OldKarigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
  };

  type NewActor = {
    orders : Map.Map<Text, Order>;
    designMappings : Map.Map<Text, NewDesignMapping>;
    designImages : Map.Map<Text, Storage.ExternalBlob>;
    karigars : Map.Map<Text, NewKarigar>;
    masterDesignKarigars : Map.Map<Text, Nat>;
    masterDesignExcel : ?Storage.ExternalBlob;
    activeKarigar : ?Text;
  };

  public func run(old : OldActor) : NewActor {
    let newDesignMappings = old.designMappings.map<Text, OldDesignMapping, NewDesignMapping>(
      func(_designCode, mapping) {
        {
          mapping with
          createdBy = mapping.createdBy.toText();
          updatedBy = mapping.updatedBy.map(func(principal) { principal.toText() });
        };
      }
    );

    let newKarigars = old.karigars.map<Text, OldKarigar, NewKarigar>(
      func(_name, karigar) {
        {
          karigar with
          createdBy = karigar.createdBy.toText();
        };
      }
    );

    {
      orders = old.orders;
      designMappings = newDesignMappings;
      designImages = old.designImages;
      karigars = newKarigars;
      masterDesignKarigars = old.masterDesignKarigars;
      masterDesignExcel = old.masterDesignExcel;
      activeKarigar = old.activeKarigar;
    };
  };
};
