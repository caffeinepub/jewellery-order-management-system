import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Iter "mo:core/Iter";
import List "mo:core/List";



actor {
  include MixinStorage();

  // Order Type
  type OrderType = {
    #CO; // Customer Order
    #RB; // Ready Batch
  };

  // Order Status
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

  let orders = Map.empty<Text, PersistentOrder>();
  let designMappings = Map.empty<Text, DesignMapping>();
  let designImages = Map.empty<Text, Storage.ExternalBlob>();
  let karigars = Map.empty<Text, Karigar>();
  let masterDesignMapping = Map.empty<Text, (Text, Text)>();

  var masterDesignExcel : ?Storage.ExternalBlob = null;
  var activeKarigar : ?Text = null;

  public shared ({ caller }) func saveOrder(
    orderNo : Text,
    orderType : OrderType,
    product : Text,
    design : Text,
    weight : Float,
    size : Float,
    quantity : Nat,
    remarks : Text,
    orderId : Text,
  ) : async () {
    let timestamp = Time.now();
    let persistentOrder : PersistentOrder = {
      orderNo;
      orderType;
      product;
      design;
      weight;
      size;
      quantity;
      remarks;
      status = #Pending;
      orderId;
      createdAt = timestamp;
      updatedAt = timestamp;
    };

    orders.add(orderId, persistentOrder);
  };

  public shared ({ caller }) func addKarigar(name : Text) : async () {
    if (karigars.containsKey(name)) {
      Runtime.trap("Karigar already exists");
    };
    let karigar : Karigar = {
      name;
      createdBy = caller;
      createdAt = Time.now();
    };
    karigars.add(name, karigar);
  };

  public query ({ caller }) func getKarigars() : async [Karigar] {
    karigars.values().toArray();
  };

  public shared ({ caller }) func saveDesignMapping(
    designCode : Text,
    genericName : Text,
    karigarName : Text,
  ) : async () {
    if (not karigars.containsKey(karigarName)) {
      Runtime.trap("Karigar does not exist");
    };
    let timestamp = Time.now();
    let mapping : DesignMapping = {
      designCode;
      genericName;
      karigarName;
      createdBy = caller;
      updatedBy = null;
      createdAt = timestamp;
      updatedAt = timestamp;
    };
    designMappings.add(designCode, mapping);
  };

  public shared ({ caller }) func assignOrdersToKarigar(mappings : [MappingRecord]) : async () {
    var pendingOrders : List.List<PersistentOrder> = List.empty<PersistentOrder>();

    for (mapping in mappings.values()) {
      switch (activeKarigar) {
        case (?_) {
          pendingOrders := List.empty<PersistentOrder>();
        };
        case (null) {
          if (not karigars.containsKey(mapping.karigarName)) {
            let karigar : Karigar = {
              name = mapping.karigarName;
              createdBy = caller;
              createdAt = Time.now();
            };
            karigars.add(mapping.karigarName, karigar);
          };

          activeKarigar := ?mapping.karigarName;
        };
      };

      if (not designMappings.containsKey(mapping.designCode)) {
        let timestamp = Time.now();
        let newMapping : DesignMapping = {
          designCode = mapping.designCode;
          genericName = mapping.genericName;
          karigarName = mapping.karigarName;
          createdBy = caller;
          updatedBy = null;
          createdAt = timestamp;
          updatedAt = timestamp;
        };
        designMappings.add(mapping.designCode, newMapping);
      };
    };
    activeKarigar := null;
  };

  public shared ({ caller }) func reassignDesign(designCode : Text, newKarigar : Text) : async () {
    switch (designMappings.get(designCode)) {
      case (null) { Runtime.trap("Design mapping not found") };
      case (?mapping) {
        if (not karigars.containsKey(newKarigar)) {
          Runtime.trap("Karigar does not exist");
        };
        let updatedMapping : DesignMapping = {
          mapping with
          karigarName = newKarigar;
          updatedBy = ?caller;
          updatedAt = Time.now();
        };
        designMappings.add(designCode, updatedMapping);
      };
    };
  };

  public query ({ caller }) func getOrders(
    statusFilter : ?OrderStatus,
    typeFilter : ?OrderType,
    searchText : ?Text,
  ) : async [Order] {
    orders.values().toArray().map(
      func(o) {
        let mapping = designMappings.get(o.design);
        {
          o with
          genericName = mapping.map(func(m) { m.genericName });
          karigarName = mapping.map(func(m) { m.karigarName });
        };
      }
    );
  };

  public query ({ caller }) func getDesignMapping(designCode : Text) : async DesignMapping {
    switch (designMappings.get(designCode)) {
      case (null) { Runtime.trap("Design mapping not found") };
      case (?mapping) { mapping };
    };
  };

  public shared ({ caller }) func batchSaveDesignMappings(mappings : [(Text, DesignMapping)]) : async () {
    for ((designCode, mapping) in mappings.values()) {
      designMappings.add(designCode, mapping);
    };
  };

  public shared ({ caller }) func deleteOrder(orderId : Text) : async () {
    if (not orders.containsKey(orderId)) {
      Runtime.trap("Order not found");
    };
    orders.remove(orderId);
  };

  public shared ({ caller }) func uploadDesignImage(designCode : Text, blob : Storage.ExternalBlob) : async () {
    designImages.add(designCode, blob);
  };

  public shared ({ caller }) func batchUploadDesignImages(images : [(Text, Storage.ExternalBlob)]) : async () {
    images.forEach(func((designCode, blob)) { designImages.add(designCode, blob) });
  };

  public query ({ caller }) func getDesignImage(designCode : Text) : async ?Storage.ExternalBlob {
    designImages.get(designCode);
  };

  public type MasterDesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Principal;
    updatedBy : ?Principal;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public shared ({ caller }) func uploadMasterDesignExcel(blob : Storage.ExternalBlob) : async () {
    masterDesignExcel := ?blob;
  };

  public query ({ caller }) func getMasterDesignExcel() : async ?Storage.ExternalBlob {
    masterDesignExcel;
  };

  public query ({ caller }) func isExistingDesignCodes(designCodes : [Text]) : async [Bool] {
    designCodes.map(func(designCode) { designMappings.containsKey(designCode) });
  };

  public shared ({ caller }) func uploadDesignMapping(mappingData : [MappingRecord]) : async () {
    masterDesignMapping.clear();
    for (record in mappingData.values()) {
      masterDesignMapping.add(record.designCode, (record.genericName, record.karigarName));
    };
  };

  public shared ({ caller }) func updateOrdersStatusToReady(orderIds : [Text]) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) { Runtime.trap("Order with id " # orderId # " not found") };
        case (?order) {
          switch (order.status) {
            case (#Pending) {
              let updatedOrder = {
                order with
                status = #Ready;
                updatedAt = Time.now();
              };
              orders.add(orderId, updatedOrder);
            };
            case (_) {};
          };
        };
      };
    };
  };
};
