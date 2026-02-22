import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Iter "mo:core/Iter";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

import Migration "migration";

(with migration = Migration.run)
actor {
  include MixinStorage();

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
    suppliedQty : Nat;
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
  let masterDesignMappings = Map.empty<Text, DesignMapping>();
  let karigars = Map.empty<Text, Karigar>();
  let masterDesignKarigars = Map.empty<Text, Nat>();

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
      suppliedQty = 0;
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

  public query ({ caller }) func getUniqueKarigarsFromDesignMappings() : async [Text] {
    designMappings.values().toArray().map(
      func(mapping) { mapping.karigarName }
    );
  };

  public query ({ caller }) func getMasterDesignKarigars() : async [Text] {
    masterDesignKarigars.keys().toArray();
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

        let design = designCode;

        let pendingOrderIds = orders.toArray().filter(
          func((_, order)) {
            order.design == design and order.status == #Pending;
          }
        ).map(func((orderId, _)) { orderId });

        for (orderId in pendingOrderIds.values()) {
          switch (orders.get(orderId)) {
            case (null) { Runtime.trap("Order with id " # orderId # " already removed") };
            case (?order) {
              if (order.status == #Pending) {
                let updatedOrder : PersistentOrder = {
                  order with
                  status = #Pending;
                  updatedAt = Time.now();
                };
                orders.add(orderId, updatedOrder);
              } else {
                Runtime.trap("Unexpected status for pending order with id: " # orderId);
              };
            };
          };
        };
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
          remarks = o.remarks;
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
    masterDesignMappings.clear();
    for (record in mappingData.values()) {
      let timestamp = Time.now();
      let newMapping : DesignMapping = {
        designCode = record.designCode;
        genericName = record.genericName;
        karigarName = record.karigarName;
        createdBy = caller;
        updatedBy = null;
        createdAt = timestamp;
        updatedAt = timestamp;
      };
      masterDesignMappings.add(record.designCode, newMapping);
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

  public shared ({ caller }) func updateOrderStatusToReadyWithQty(orderId : Text, suppliedQty : Nat) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order with id " # orderId # " not found") };
      case (?order) {
        if (suppliedQty > order.quantity) {
          Runtime.trap("Supplied quantity cannot be greater than order quantity");
        };

        switch (order.status) {
          case (#Pending) {
            let updatedOrder = {
              order with
              status = #Ready;
              suppliedQty;
              updatedAt = Time.now();
            };
            orders.add(orderId, updatedOrder);
          };
          case (_) {};
        };
      };
    };
  };

  public query ({ caller }) func getAllMasterDesignMappings() : async [(Text, DesignMapping)] {
    masterDesignMappings.toArray();
  };

  public shared ({ caller }) func updateMasterDesignKarigars(karigars : [Text]) : async () {
    masterDesignKarigars.clear();
    for (karigar in karigars.values()) {
      masterDesignKarigars.add(karigar, 1);
    };
  };

  public query ({ caller }) func getOrdersWithMappings() : async [Order] {
    let persistentOrders = orders.values().toArray();
    persistentOrders.map(
      func(persistentOrder) {
        {
          persistentOrder with
          remarks = persistentOrder.remarks;
          genericName = designMappings.get(persistentOrder.design).map(func(mapping) { mapping.genericName });
          karigarName = designMappings.get(persistentOrder.design).map(func(mapping) { mapping.karigarName });
        };
      }
    );
  };

  //----------------------------------------------------------------------------------------------------------------------
  // New functions added by refactoring
  //----------------------------------------------------------------------------------------------------------------------

  // Update this with proper filtering.
  public query ({ caller }) func getPendingOrders() : async [PersistentOrder] {
    orders.values().toArray().filter(func((o)) { o.status == #Pending });
  };
};
