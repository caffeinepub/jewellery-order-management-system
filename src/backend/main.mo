import Runtime "mo:core/Runtime";
import Time "mo:core/Time";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Principal "mo:core/Principal";
import List "mo:core/List";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Iter "mo:core/Iter";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";

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

  public query ({ caller }) func getAllMasterDesignMappings() : async [(Text, DesignMapping)] {
    masterDesignMappings.toArray();
  };

  public shared ({ caller }) func updateMasterDesignKarigars(karigars : [Text]) : async () {
    masterDesignKarigars.clear();
    for (karigar in karigars.values()) {
      masterDesignKarigars.add(karigar, 1);
    };
  };

  func extractBaseDesignCode(designCode : Text) : Text {
    // Check if first two characters are uppercase letters (product prefix)
    let codeLength = designCode.size();
    if (codeLength <= 2) { return designCode };

    let chars = Array.tabulate(
      codeLength,
      func(i) {
        designCode.chars().toArray()[i];
      },
    );

    // Check if first two chars are uppercase letters (A-Z)
    let firstTwoAreLetters = chars[0] >= 'A' and chars[0] <= 'Z' and chars[1] >= 'A' and chars[1] <= 'Z';

    if (firstTwoAreLetters) {
      // Remove the first two characters (product prefix)
      Text.fromIter(chars.sliceToArray(2, codeLength).values());
    } else {
      // Check if only the first character is a letter and not from 0-9
      let firstCharIsLetter = chars[0] >= 'A' and chars[0] <= 'Z' and not (chars[1] >= '0' and chars[1] <= '9');

      if (firstCharIsLetter) {
        // Remove the first character (product prefix)
        Text.fromIter(chars.sliceToArray(1, codeLength).values());
      } else {
        // No prefix, keep the original code
        designCode;
      };
    };
  };

  func findMappingViaBaseDesign(design : Text) : ?DesignMapping {
    // 1. First Try: Direct search
    let direct = masterDesignMappings.get(design);
    switch (direct) {
      case (?mapping) { return ?mapping };
      case (null) {};
    };

    // 2. First Fallback with baseDesignCode
    let baseDesignCode = extractBaseDesignCode(design);

    let baseFallback = masterDesignMappings.get(baseDesignCode);
    switch (baseFallback) {
      case (?mapping) { return ?mapping };
      case (null) {};
    };

    // 3. Fallback via Partial Product Codes (for BR, H, etc.)
    let len = design.size();
    let chars = Array.tabulate(
      len,
      func(i) {
        design.chars().toArray()[i];
      },
    );

    if (len > 2 and chars[0] >= 'A' and chars[0] <= 'Z' and chars[1] >= '0' and chars[1] <= '9') {
      let substring = Text.fromIter(chars.sliceToArray(1, len).values());
      let fallback = masterDesignMappings.get(substring);
      switch (fallback) {
        case (?mapping) { return ?mapping };
        case (null) {};
      };
    };

    // 4. Remove leading zeros and check again
    let trimmedWithZeros = baseDesignCode.trimStart(#char ('0'));
    let lastFallback = masterDesignMappings.get(trimmedWithZeros);
    switch (lastFallback) {
      case (?mapping) { return ?mapping };
      case (null) {};
    };

    // Mapping not found
    null;
  };

  func mapOrderToOrderWithMappings(order : PersistentOrder) : Order {
    let mapping = findMappingViaBaseDesign(order.design);
    let genericName = switch (mapping) {
      case (null) { null };
      case (?mapping) { ?mapping.genericName };
    };

    let karigarName = switch (mapping) {
      case (null) { null };
      case (?mapping) { ?mapping.karigarName };
    };

    {
      order with
      remarks = order.remarks;
      genericName;
      karigarName;
    };
  };

  public query ({ caller }) func getOrdersWithMappings() : async [Order] {
    let persistentOrders = orders.values().toArray();
    persistentOrders.map(mapOrderToOrderWithMappings);
  };
};
