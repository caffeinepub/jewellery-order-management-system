import Time "mo:core/Time";
import List "mo:core/List";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Iter "mo:core/Iter";
import Text "mo:core/Text";
import Migration "migration";

(with migration = Migration.run)
actor {
  type OrderType = {
    #CO;
    #RB;
    #SO;
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
  };

  type DesignMapping = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    createdBy : Text;
    updatedBy : ?Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type ReturnRequest = {
    orderNo : Text;
    totalQuantity : Nat;
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

  var orders = Map.empty<Text, Order>();
  var designMappings = Map.empty<Text, DesignMapping>();
  var designImages = Map.empty<Text, Storage.ExternalBlob>();
  var karigars = Map.empty<Text, Karigar>();
  var masterDesignKarigars = Map.empty<Text, Nat>();
  var masterDesignExcel : ?Storage.ExternalBlob = null;
  var activeKarigar : ?Text = null;

  include MixinStorage();

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
          };
          orders.add(orderId, readyOrder);
        };
        let remainingQuantity = Nat.sub(originalOrder.quantity, suppliedQuantity);
        if (remainingQuantity > 0) {
          let pendingOrder : Order = {
            originalOrder with
            quantity = remainingQuantity;
            updatedAt = Time.now();
          };
          orders.add(orderId, pendingOrder);
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
        };
        orders.add(orderId, order);
      };
    };
  };

  public shared ({ caller }) func addKarigar(name : Text) : async () {
    if (karigars.containsKey(name)) {
      Runtime.trap("Karigar already exists");
    };
    let karigar : Karigar = {
      name;
      createdBy = "system";
      createdAt = Time.now();
    };
    karigars.add(name, karigar);
  };

  public query ({ caller }) func getKarigars() : async [Karigar] {
    karigars.values().toArray();
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
    orders.remove(orderId);
  };

  public shared ({ caller }) func batchDeleteOrders(orderIds : [Text]) : async () {
    for (orderId in orderIds.values()) {
      orders.remove(orderId);
    };
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
    orders := remainingOrders;
  };

  public shared ({ caller }) func deleteReadyOrder(orderId : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        if (order.status == #Ready) {
          let pendingOrder : Order = {
            order with status = #Pending;
          };
          orders.add(orderId, pendingOrder);
        } else {
          Runtime.trap("Only 'Ready' orders can be moved back to 'Pending' status");
        };
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

  public shared ({ caller }) func updateDesignGroupStatus(designCodes : [Text]) : async () {
    for (code in designCodes.values()) {
      switch (orders.get(code)) {
        case (null) {
          Runtime.trap("Order with id " # code # " not found");
        };
        case (?order) {
          if (order.status != #Ready) {
            Runtime.trap("Order must be in Ready state to be marked as Hallmark");
          };
          let updatedOrder : Order = {
            order with
            status = #Hallmark;
            updatedAt = Time.now();
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

  public shared ({ caller }) func batchSupplyRBOrders(orderQuantities : [(Text, Nat)]) : async () {
    let timestamp = Time.now();

    for ((orderId, suppliedQuantity) in orderQuantities.values()) {
      switch (orders.get(orderId)) {
        case (null) {
          Runtime.trap("Order with id " # orderId # " not found");
        };
        case (?originalOrder) {
          if (originalOrder.orderType != #RB) {
            Runtime.trap("Order " # orderId # " is not an RB order");
          };

          if (suppliedQuantity > 0) {
            let readyOrder : Order = {
              originalOrder with
              quantity = suppliedQuantity;
              status = #Ready;
              updatedAt = timestamp;
              readyDate = ?timestamp;
              originalOrderId = ?orderId;
            };

            let newOrderId = orderId # "_ready_" # suppliedQuantity.toText();
            orders.add(newOrderId, readyOrder);
          };

          let remainingQuantity = Nat.sub(originalOrder.quantity, suppliedQuantity);
          if (remainingQuantity > 0) {
            let pendingOrder : Order = {
              originalOrder with
              quantity = remainingQuantity;
              updatedAt = timestamp;
            };
            orders.add(orderId, pendingOrder);
          };
        };
      };
    };
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

  public shared ({ caller }) func returnOrdersToPending(orderNo : Text, returnedQty : Nat) : async () {
    let readyOrders = orders.filter(
      func(_, order) {
        order.status == #Ready and order.orderNo == orderNo
      }
    );

    let totalReadyQty = sumQuantities(readyOrders.values().toArray());

    if (totalReadyQty != returnedQty) {
      Runtime.trap("Returned quantity does not match total ready quantity for order " # orderNo);
    };

    let remainingOrders = orders.filter(
      func(_, order) {
        order.status != #Ready or order.orderNo != orderNo
      }
    );
    orders := remainingOrders;

    var found = false;
    var firstReadyOrder : ?Order = null;

    for ((_, order) in readyOrders.entries()) {
      if (not found) {
        firstReadyOrder := ?order;
        found := true;
      };
    };

    switch (firstReadyOrder) {
      case (null) {
        Runtime.trap("No ready orders found for " # orderNo);
      };
      case (?order) {
        let newOrder : Order = {
          order with
          quantity = returnedQty;
          status = #Pending;
          updatedAt = Time.now();
        };
        orders.add("returned_" # orderNo, newOrder);
      };
    };
  };

  public shared ({ caller }) func batchReturnOrdersToPending(orderRequests : [(Text, Nat)]) : async () {
    for ((orderNo, returnedQty) in orderRequests.values()) {
      await returnOrdersToPending(orderNo, returnedQty);
    };
  };

  public shared ({ caller }) func batchSupplyNewRBOrders(orderQuantities : [(Text, Nat)]) : async () {
    let timestamp = Time.now();

    for ((orderId, suppliedQuantity) in orderQuantities.values()) {
      switch (orders.get(orderId)) {
        case (null) {
          Runtime.trap("Order with id " # orderId # " not found");
        };
        case (?originalOrder) {
          if (originalOrder.orderType != #RB) {
            Runtime.trap("Order " # orderId # " is not an RB order");
          };

          supplyRbOrder(orderId, suppliedQuantity, originalOrder, timestamp);
        };
      };
    };
  };

  func supplyRbOrder(orderId : Text, suppliedQuantity : Nat, originalOrder : Order, timestamp : Time.Time) {
    if (suppliedQuantity > 0) {
      let readyOrder : Order = {
        originalOrder with
        quantity = suppliedQuantity;
        status = #Ready;
        updatedAt = timestamp;
        readyDate = ?timestamp;
        originalOrderId = ?orderId;
      };
      let newOrderId = orderId # "_ready_" # suppliedQuantity.toText();
      orders.add(newOrderId, readyOrder);
    };

    let remainingQuantity = Nat.sub(originalOrder.quantity, suppliedQuantity);
    if (remainingQuantity > 0) {
      let pendingOrder : Order = {
        originalOrder with
        quantity = remainingQuantity;
        updatedAt = timestamp;
      };
      orders.add(orderId, pendingOrder);
    };
  };

  public shared ({ caller }) func returnReadyOrderToPending(orderId : Text, returnedQty : Nat) : async () {
    switch (orders.get(orderId)) {
      case (null) {
        Runtime.trap("Order with id " # orderId # " not found");
      };
      case (?readyOrder) {
        let newPendingOrder : Order = {
          readyOrder with quantity = returnedQty; status = #Pending; updatedAt = Time.now()
        };

        orders.add(orderId, newPendingOrder);
      };
    };
  };

  func sumQuantities(orders : [Order]) : Nat {
    var sum = 0;
    for (order in orders.values()) {
      sum += order.quantity;
    };
    sum;
  };

  type MasterDataRow = {
    orderNo : Text;
    designCode : Text;
    karigar : Text;
    weight : Float;
    quantity : Nat;
    orderDate : ?Time.Time;
  };

  type ReconciliationResult = {
    newLines : [MasterDataRow];
    missingInMaster : [Order];
    totalUploadedRows : Nat;
    alreadyExistingRows : Nat;
    newLinesCount : Nat;
    missingInMasterCount : Nat;
  };

  public type MasterReconciliationResult = {
    newLines : [MasterDataRow];
    missingInMaster : [Order];
    totalUploadedRows : Nat;
    alreadyExistingRows : Nat;
    newLinesCount : Nat;
    missingInMasterCount : Nat;
  };

  public type MasterPersistedResponse = {
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

    let alreadyExistingRows = masterDataRows.size() - newLines.size();

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
          orderType = #CO;
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
        };

        orders.add(orderId, newOrder);
        persistedRows.add(newOrder);
      };
    };

    let persisted = persistedRows.toArray();
    {
      persisted;
    };
  };
};
