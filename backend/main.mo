import Map "mo:core/Map";
import Time "mo:core/Time";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Migration "migration";
import Float "mo:core/Float";

import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

(with migration = Migration.run)
actor {
  type OrderType = {
    #CO;
    #RB;
    #SO; // Special Order, for future use
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
    readyDate : ?Time.Time;
    originalOrderId : ?Text;
    orderDate : ?Time.Time;
    movedBy : ?Text;
  };

  let orders = Map.empty<Text, Order>();
  let designMappings = Map.empty<Text, DesignMapping>();
  let designImages = Map.empty<Text, Storage.ExternalBlob>();
  let karigars = Map.empty<Text, Karigar>();
  let masterDesignKarigars = Map.empty<Text, Nat>();
  let filteredOutKarigars = Map.empty<Text, Bool>();
  var masterDesignExcel : ?Storage.ExternalBlob = null;
  var activeKarigar : ?Text = null;
  let rbTotalTracker = Map.empty<Text, (Nat, Nat)>();

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Karigar = {
    name : Text;
    createdBy : Text;
    createdAt : Time.Time;
  };
  type MappingRecord = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
  };

  include MixinStorage();

  public shared ({ caller }) func registerKarigar(name : Text) : async () {
    switch (karigars.get(name)) {
      case (?_) { Runtime.trap("Karigar already exists") };
      case (null) {
        let karigar : Karigar = {
          name;
          createdBy = "system";
          createdAt = Time.now();
        };
        karigars.add(name, karigar);
      };
    };
  };

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
    orderDate : ?Time.Time,
  ) : async () {
    let timestamp = Time.now();

    let (genericName, karigarName) = switch (designMappings.get(design)) {
      case (null) { (null, null) };
      case (?mapping) { (?(mapping.genericName), ?(mapping.karigarName)) };
    };

    let order : Order = {
      orderNo;
      orderType;
      product;
      design;
      weight;
      size;
      quantity;
      genericName;
      karigarName;
      remarks;
      status = #Pending;
      orderId;
      createdAt = timestamp;
      updatedAt = timestamp;
      readyDate = null;
      originalOrderId = null;
      orderDate;
      movedBy = null;
    };

    orders.add(orderId, order);
  };

  public query ({ caller }) func getOrder(orderId : Text) : async ?Order {
    orders.get(orderId);
  };

  public shared ({ caller }) func supplyOrder(orderId : Text, suppliedQuantity : Nat) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?originalOrder) {
        if (suppliedQuantity > originalOrder.quantity) {
          Runtime.trap("Supplied quantity cannot be greater than original order quantity");
        };
        if (suppliedQuantity > 0) {
          let readyOrder : Order = {
            originalOrder with
            quantity = suppliedQuantity;
            status = #Ready;
            updatedAt = Time.now();
            readyDate = ?Time.now();
            movedBy = null;
          };
          orders.add(orderId, readyOrder);
        };
        switch (Nat.compare(originalOrder.quantity, suppliedQuantity)) {
          case (#less) {};
          case (#equal) {};
          case (#greater) {
            let remainingQuantity = originalOrder.quantity - suppliedQuantity;
            let pendingOrder : Order = {
              originalOrder with
              quantity = remainingQuantity;
              updatedAt = Time.now();
              movedBy = null;
            };
            orders.add(orderId, pendingOrder);
          };
        };
      };
    };
  };

  public shared ({ caller }) func supplyAndReturnOrder(orderId : Text, suppliedQuantity : Nat) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?originalOrder) {
        if (suppliedQuantity != originalOrder.quantity) {
          Runtime.trap("Supplied and returned quantity must match the original order quantity");
        };

        let order : Order = {
          originalOrder with quantity = suppliedQuantity;
          status = #ReturnFromHallmark;
          updatedAt = Time.now();
          movedBy = null;
        };
        orders.add(orderId, order);
      };
    };
  };

  public shared ({ caller }) func addKarigar(name : Text) : async () {
    switch (karigars.get(name)) {
      case (?_) { Runtime.trap("Karigar already exists") };
      case (null) {
        let karigar : Karigar = {
          name;
          createdBy = "system";
          createdAt = Time.now();
        };
        karigars.add(name, karigar);
      };
    };
  };

  public query ({ caller }) func getKarigars() : async [Karigar] {
    karigars.values().toArray();
  };

  public query ({ caller }) func getFilteredOutKarigars() : async [Text] {
    filteredOutKarigars.keys().toArray();
  };

  public query ({ caller }) func getUniqueKarigarsFromDesignMappings() : async [Text] {
    designMappings.values().toArray().map(func(mapping) { mapping.karigarName });
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
      createdBy = "system";
      updatedBy = null;
      createdAt = timestamp;
      updatedAt = timestamp;
    };
    designMappings.add(designCode, mapping);
  };

  public shared ({ caller }) func assignOrdersToKarigar(mappings : [MappingRecord]) : async () {
    var pendingOrders : List.List<Order> = List.empty<Order>();

    for (mapping in mappings.values()) {
      switch (activeKarigar) {
        case (?_) {
          pendingOrders := List.empty<Order>();
        };
        case (null) {
          if (not karigars.containsKey(mapping.karigarName)) {
            let karigar : Karigar = {
              name = mapping.karigarName;
              createdBy = "system";
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
          createdBy = "system";
          updatedBy = null;
          createdAt = timestamp;
          updatedAt = timestamp;
        };
        designMappings.add(mapping.designCode, newMapping);
      };
    };
    activeKarigar := null;
  };

  public shared ({ caller }) func reassignDesign(designCode : Text, newKarigar : Text, movedBy : Text) : async () {
    switch (designMappings.get(designCode)) {
      case (null) { Runtime.trap("Design mapping not found") };
      case (?mapping) {
        if (not karigars.containsKey(newKarigar)) {
          Runtime.trap("Karigar does not exist");
        };
        let updatedMapping : DesignMapping = {
          mapping with
          karigarName = newKarigar;
          updatedBy = ?"system";
          updatedAt = Time.now();
        };
        designMappings.add(designCode, updatedMapping);

        let design = designCode;
        let pendingOrderIds = orders.toArray().filter(
          func((_, o)) { o.design == design and o.status == #Pending }
        ).map(func((orderId, _)) { orderId });
        for (orderId in pendingOrderIds.values()) {
          switch (orders.get(orderId)) {
            case (null) { Runtime.trap("Order with id " # orderId # " already removed") };
            case (?order) {
              if (order.status == #Pending) {
                let updatedOrder : Order = {
                  order with
                  genericName = ?mapping.genericName;
                  karigarName = ?mapping.karigarName;
                  status = #Pending;
                  updatedAt = Time.now();
                  movedBy = ?movedBy;
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

  public query ({ caller }) func getOrders(_statusFilter : ?OrderStatus, _typeFilter : ?OrderType, _searchText : ?Text) : async [Order] {
    orders.values().toArray();
  };

  public query ({ caller }) func getDesignMapping(designCode : Text) : async DesignMapping {
    switch (designMappings.get(designCode)) {
      case (null) { Runtime.trap("Design mapping not found") };
      case (?mapping) { mapping };
    };
  };

  public query ({ caller }) func getAllOrders() : async [Order] {
    orders.values().toArray();
  };

  public query ({ caller }) func getReadyOrders() : async [Order] {
    orders.values().toArray().filter(func(order) { order.status == #Ready });
  };

  public shared ({ caller }) func batchSaveDesignMappings(mappings : [(Text, DesignMapping)]) : async () {
    for ((designCode, mapping) in mappings.values()) {
      designMappings.add(designCode, mapping);
    };
  };

  public shared ({ caller }) func deleteOrder(orderId : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        orders.remove(orderId);
      };
    };
  };

  public shared ({ caller }) func batchDeleteOrders(_orderIds : [Text]) : async () {
    orders.clear();
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
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  public shared ({ caller }) func uploadMasterDesignExcel(blob : Storage.ExternalBlob) : async () {
    masterDesignExcel := ?blob;
  };

  public query ({ caller }) func getMasterDesignExcel() : async ?Storage.ExternalBlob {
    masterDesignExcel;
  };

  public shared ({ caller }) func uploadDesignMapping(mappingData : [MappingRecord]) : async () {
    for (record in mappingData.values()) {
      let timestamp = Time.now();
      let newMapping : DesignMapping = {
        designCode = record.designCode;
        genericName = record.genericName;
        karigarName = record.karigarName;
        createdBy = "system";
        updatedBy = null;
        createdAt = timestamp;
        updatedAt = timestamp;
      };
      designMappings.add(record.designCode, newMapping);
    };
  };

  public query ({ caller }) func isExistingDesignCodes(designCodes : [Text]) : async [Bool] {
    designCodes.map(func(designCode) { designMappings.containsKey(designCode) });
  };

  public shared ({ caller }) func markOrdersAsReady(orderIds : [Text]) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) {
          Runtime.trap("Order with id " # orderId # " not found");
        };
        case (?order) {
          if (order.status != #Pending) {
            Runtime.trap("Order must be in Pending state to be marked as Ready");
          };
          let updatedOrder : Order = {
            order with
            status = #Ready;
            updatedAt = Time.now();
            readyDate = ?Time.now();
            movedBy = null;
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };

  public shared ({ caller }) func updateMasterDesignKarigars(karigars : [Text]) : async () {
    masterDesignKarigars.clear();
    for (karigar in karigars.values()) {
      masterDesignKarigars.add(karigar, 1);
    };
  };

  public query ({ caller }) func getAllMasterDesignMappings() : async [(Text, DesignMapping)] {
    designMappings.toArray();
  };

  public query ({ caller }) func getOrdersWithMappings() : async [Order] {
    orders.values().toArray();
  };

  public shared ({ caller }) func updateDesignMapping(
    designCode : Text,
    newGenericName : Text,
    newKarigarName : Text,
  ) : async () {
    let timestamp = Time.now();
    let updatedMapping : DesignMapping = {
      designCode;
      genericName = newGenericName;
      karigarName = newKarigarName;
      createdBy = "backend_update";
      updatedBy = ?("updated_by_backend");
      createdAt = timestamp;
      updatedAt = timestamp;
    };
    designMappings.add(designCode, updatedMapping);
  };

  public shared ({ caller }) func resetActiveOrders() : async () {
    let remainingOrders = orders.filter(
      func(_orderId, order) {
        order.status != #Pending and
        order.status != #Ready and
        order.status != #ReturnFromHallmark
      }
    );
    orders.clear();
    for ((orderId, order) in remainingOrders.entries()) {
      orders.add(orderId, order);
    };
  };

  public shared ({ caller }) func deleteReadyOrder(orderId : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        orders.add(orderId, order);
      };
    };
  };

  public shared ({ caller }) func batchUpdateOrderStatus(orderIds : [Text], newStatus : OrderStatus) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) {
          Runtime.trap("Order with id " # orderId # " not found");
        };
        case (?order) {
          let updatedOrder : Order = {
            order with
            status = newStatus;
            updatedAt = Time.now();
            readyDate = if (newStatus == #Ready) { ?Time.now() } else { order.readyDate };
            movedBy = null;
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };

  public query ({ caller }) func getReadyOrdersByDateRange(startDate : Time.Time, endDate : Time.Time) : async [Order] {
    orders.values().toArray().filter(
      func(order) {
        order.status == #Ready and
        (switch (order.readyDate) {
          case (null) { false };
          case (?date) { date >= startDate and date <= endDate };
        });
      }
    );
  };

  public shared ({ caller }) func saveModifiedOrder(_count : Nat, _startQty : Nat, order : Order) : async () {
    orders.add(order.orderId, order);
  };

  public shared ({ caller }) func updateDesignGroupStatus(designCodes : [Text]) : async () {
    for (code in designCodes.values()) {
      switch (orders.get(code)) {
        case (null) {
          Runtime.trap("Order with id " # code # " not found");
        };
        case (?order) {
          let updatedOrder : Order = {
            order with
            status = #Hallmark;
            updatedAt = Time.now();
            movedBy = null;
          };
          orders.add(code, updatedOrder);
        };
      };
    };
  };

  public query ({ caller }) func getMasterDesigns() : async [(Text, Text, Text)] {
    designMappings.values().toArray().map(
      func(mapping) {
        (mapping.designCode, mapping.genericName, mapping.karigarName);
      }
    );
  };

  public query ({ caller }) func getDesignImageMapping() : async [(Text, Storage.ExternalBlob)] {
    designImages.toArray();
  };

  public query ({ caller }) func getUnreturnedOrders() : async [Order] {
    orders.values().toArray().filter(
      func(order) {
        order.status == #Pending or
        order.status == #Ready or
        order.status == #Hallmark;
      }
    );
  };

  public query ({ caller }) func getDesignCountByKarigar(_karigarName : Text) : async ?Nat {
    let count = designMappings.size();
    if (count > 0) { ?count } else { null };
  };

  public shared ({ caller }) func markAllAsReady() : async () {
    let timestamp = Time.now();
    for ((orderId, order) in orders.entries()) {
      if (order.status == #Pending) {
        let updatedOrder : Order = {
          order with
          status = #Ready;
          updatedAt = timestamp;
          readyDate = ?timestamp;
          movedBy = null;
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func clearAllDesignMappings() : async () {
    designMappings.clear();
  };

  public shared ({ caller }) func batchGetByStatus(ids : [Text], compareStatus : OrderStatus) : async [Text] {
    ids.filter(
      func(id) {
        switch (orders.get(id)) {
          case (null) { false };
          case (?order) { order.status == compareStatus };
        };
      }
    );
  };

  public shared ({ caller }) func returnOrdersToPending(_orderNo : Text, _returnedQty : Nat) : async () {};

  public shared ({ caller }) func batchReturnOrdersToPending(_orderRequests : [(Text, Nat)]) : async () {};

  type MasterDataRow = {
    orderNo : Text;
    designCode : Text;
    karigar : Text;
    weight : Float;
    quantity : Nat;
    orderType : OrderType;
    orderDate : ?Time.Time;
  };

  type MasterReconciliationResult = {
    newLines : [MasterDataRow];
    missingInMaster : [Order];
    totalUploadedRows : Nat;
    alreadyExistingRows : Nat;
    newLinesCount : Nat;
    missingInMasterCount : Nat;
  };

  type MasterPersistedResponse = {
    persisted : [Order];
  };

  func containsOrder(ordersArray : [Order], orderNo : Text, designCode : Text) : Bool {
    ordersArray.any(
      func(order) {
        order.orderNo == orderNo and order.design == designCode
      }
    );
  };

  func containsRow(masterDataRows : [MasterDataRow], orderNo : Text, designCode : Text) : Bool {
    masterDataRows.any(
      func(row) {
        row.orderNo == orderNo and row.designCode == designCode
      }
    );
  };

  public shared ({ caller }) func reconcileMasterFile(masterDataRows : [MasterDataRow]) : async MasterReconciliationResult {
    let ordersArray = orders.values().toArray();
    let pendingAndReadyOrders = ordersArray.filter(
      func(order) {
        order.status == #Pending or order.status == #Ready
      }
    );

    let newLines = masterDataRows.filter(
      func(row) {
        not containsOrder(ordersArray, row.orderNo, row.designCode);
      }
    );

    let missingInMaster = pendingAndReadyOrders.filter(
      func(order) {
        not containsRow(masterDataRows, order.orderNo, order.design);
      }
    );

    var alreadyExistingRows = newLines.size();

    switch (Nat.compare(masterDataRows.size(), newLines.size())) {
      case (#less) {};
      case (#equal) {};
      case (#greater) {
        alreadyExistingRows := masterDataRows.size() - newLines.size();
      };
    };

    {
      newLines;
      missingInMaster;
      totalUploadedRows = masterDataRows.size();
      alreadyExistingRows;
      newLinesCount = newLines.size();
      missingInMasterCount = missingInMaster.size();
    };
  };

  public shared ({ caller }) func persistMasterDataRows(
    masterRows : [MasterDataRow],
  ) : async MasterPersistedResponse {
    let persistedRows = List.empty<Order>();

    for (masterRow in masterRows.values()) {
      if (not containsOrder(orders.values().toArray(), masterRow.orderNo, masterRow.designCode)) {
        let timestamp = Time.now();
        let orderId = masterRow.orderNo # "_" # masterRow.designCode;

        let (genericName, karigarName) = switch (designMappings.get(masterRow.designCode)) {
          case (null) { (null, null) };
          case (?mapping) { (?(mapping.genericName), ?(mapping.karigarName)) };
        };

        let newOrder : Order = {
          orderNo = masterRow.orderNo;
          orderType = masterRow.orderType;
          product = "";
          design = masterRow.designCode;
          weight = masterRow.weight;
          size = 0.0;
          quantity = masterRow.quantity;
          remarks = "";
          genericName;
          karigarName;
          status = #Pending;
          orderId;
          createdAt = timestamp;
          updatedAt = timestamp;
          readyDate = null;
          originalOrderId = null;
          orderDate = masterRow.orderDate;
          movedBy = null;
        };

        orders.add(orderId, newOrder);
        persistedRows.add(newOrder);
      };
    };

    let persisted = persistedRows.toArray();
    { persisted };
  };

  // New method for marking orders as pending
  public shared ({ caller }) func markOrdersAsPending(orderIds : [Text]) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) {
          Runtime.trap("Order with id " # orderId # " not found");
        };
        case (?order) {
          if (order.status != #Ready) {
            Runtime.trap("Order must be in Ready state to be marked as Pending");
          };
          let updatedOrder : Order = {
            order with
            status = #Pending;
            updatedAt = Time.now();
            readyDate = null;
            movedBy = null;
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };
};
