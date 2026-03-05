import Map "mo:core/Map";
import Text "mo:core/Text";
import Time "mo:core/Time";
import List "mo:core/List";
import Array "mo:core/Array";
import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Float "mo:core/Float";
import Iter "mo:core/Iter";
import TimeUtil "mo:core/Time";
import Int "mo:core/Int";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
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
    movedBy : ?Text;
    updatedBy : ?Text;
    lastAction : ?Text;
  };

  type AppRole = { #Admin; #Staff; #Karigar };
  type AppStatus = { #Active; #Inactive };

  type AppUser = {
    id : Text;
    name : Text;
    loginId : Text;
    passwordHash : Text;
    role : AppRole;
    karigarName : ?Text;
    status : AppStatus;
    createdAt : Time.Time;
  };

  type OrderStatusLog = {
    id : Text;
    orderId : Text;
    oldStatus : OrderStatus;
    newStatus : OrderStatus;
    updatedBy : Text;
    updatedAt : Time.Time;
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

  type Karigar = {
    name : Text;
    createdBy : Text;
    createdAt : Time.Time;
  };

  type MappingRecord = {
    designCode : Text;
    genericName : Text;
    karigarName : Text;
    excelGenericName : Text;
  };

  type MasterDataRow = {
    designCode : Text;
    karigar : Text;
    genericName : Text;
  };

  type MasterReconciliationResult = {
    missingInSystem : [MasterDataRow];
    missingInExcel : [MasterDataRow];
    matchedRows : [MasterDataRow];
  };

  type MasterPersistedResponse = {
    persistedRows : [MasterDataRow];
    reconciliationResult : MasterReconciliationResult;
  };

  type MasterDesignMapping = {
    designCode : Text;
    karigar : Text;
    genericName : Text;
    excelGenericName : Text;
  };

  let orders = Map.empty<Text, Order>();
  let appUsers = Map.empty<Text, AppUser>();
  let orderStatusLogs = Map.empty<Text, OrderStatusLog>();
  let designMappings = Map.empty<Text, DesignMapping>();
  let designImages = Map.empty<Text, Storage.ExternalBlob>();
  let karigars = Map.empty<Text, Karigar>();
  let masterDesignKarigars = Map.empty<Text, Nat>();
  let filteredOutKarigars = Map.empty<Text, Bool>();
  var masterDesignExcel : ?Storage.ExternalBlob = null;
  var activeKarigar : ?Text = null;
  let rbTotalTracker = Map.empty<Text, (Nat, Nat)>();

  include MixinStorage();

  func statusToText(status : OrderStatus) : Text {
    switch (status) {
      case (#Pending) { "Pending" };
      case (#Ready) { "Ready" };
      case (#Hallmark) { "Hallmark" };
      case (#ReturnFromHallmark) { "ReturnFromHallmark" };
    };
  };

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

  // Initialize default admin user if no users exist
  public shared ({ caller }) func initDefaultAdmin() : async () {
    if (appUsers.isEmpty()) {
      let admin : AppUser = {
        id = "admin";
        name = "Ronak Mehta";
        loginId = "ronakmehta";
        passwordHash = "3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2";
        role = #Admin;
        karigarName = null;
        status = #Active;
        createdAt = Time.now();
      };
      appUsers.add("admin", admin);
    };
  };

  // Unconditionally forces creation or reset of the default admin user
  public shared ({ caller }) func resetDefaultAdmin() : async () {
    let admin : AppUser = {
      id = "admin";
      name = "Ronak Mehta";
      loginId = "ronakmehta";
      passwordHash = "3b612c75a7b5048a435fb6ec81e52ff92d6d795a8b5a9c17070f6a63c97a53b2";
      role = #Admin;
      karigarName = null;
      status = #Active;
      createdAt = Time.now();
    };
    appUsers.add("admin", admin);
  };

  // User authentication functions
  public query ({ caller }) func login(loginId : Text, hashedPassword : Text) : async ?{
    id : Text;
    name : Text;
    role : AppRole;
    karigarName : ?Text;
  } {
    let userOpt = appUsers.values().find(
      func(u) { u.loginId == loginId and u.passwordHash == hashedPassword }
    );
    switch (userOpt) {
      case (null) { null };
      case (?user) {
        ?{
          id = user.id;
          name = user.name;
          role = user.role;
          karigarName = user.karigarName;
        };
      };
    };
  };

  public shared ({ caller }) func createUser(
    name : Text,
    loginId : Text,
    passwordHash : Text,
    role : AppRole,
    karigarName : ?Text,
  ) : async Text {
    let id = name # Time.now().toText();
    let user : AppUser = {
      id;
      name;
      loginId;
      passwordHash;
      role;
      karigarName;
      status = #Active;
      createdAt = Time.now();
    };
    appUsers.add(id, user);
    id;
  };

  public query ({ caller }) func getUser(id : Text) : async ?AppUser {
    appUsers.get(id);
  };

  public shared ({ caller }) func updateUser(
    id : Text,
    name : Text,
    loginId : Text,
    role : AppRole,
    karigarName : ?Text,
    status : AppStatus,
  ) : async () {
    switch (appUsers.get(id)) {
      case (null) { Runtime.trap("User not found") };
      case (?existing) {
        let updatedUser : AppUser = {
          existing with name; loginId; role; karigarName; status;
        };
        appUsers.add(id, updatedUser);
      };
    };
  };

  public shared ({ caller }) func resetUserPassword(id : Text, newPasswordHash : Text) : async () {
    switch (appUsers.get(id)) {
      case (null) { Runtime.trap("User not found") };
      case (?existing) {
        let updatedUser : AppUser = {
          existing with passwordHash = newPasswordHash;
        };
        appUsers.add(id, updatedUser);
      };
    };
  };

  public query ({ caller }) func listUsers() : async [AppUser] {
    appUsers.values().toArray();
  };

  // Order status log functions
  public query ({ caller }) func getOrderStatusLog(orderId : Text) : async [OrderStatusLog] {
    orderStatusLogs.values().toArray().filter(
      func(log) { log.orderId == orderId }
    );
  };

  public shared ({ caller }) func logOrderStatusChange(
    orderId : Text,
    oldStatus : OrderStatus,
    newStatus : OrderStatus,
    updatedBy : Text,
  ) : async () {
    let log : OrderStatusLog = {
      id = orderId # Time.now().toText();
      orderId;
      oldStatus;
      newStatus;
      updatedBy;
      updatedAt = Time.now();
    };
    orderStatusLogs.add(log.id, log);
  };

  // New query functions for frontend support
  public query ({ caller }) func getAllOrderStatusLogs() : async [OrderStatusLog] {
    orderStatusLogs.values().toArray();
  };

  public query ({ caller }) func getUserByLoginId(loginId : Text) : async ?AppUser {
    appUsers.values().find(func(u) { u.loginId == loginId });
  };

  // THIS SECTION CONTAINS YOUR EXISTING LOGIC WHICH WAS PRESERVED DURING MIGRATION --------------
  // SAVE ORDER
  public shared ({ caller }) func createOrder(
    orderNo : Text,
    orderType : OrderType,
    product : Text,
    design : Text,
    weight : Float,
    size : Float,
    quantity : Nat,
    remarks : Text,
    genericName : ?Text,
    karigarName : ?Text,
  ) : async Text {
    let orderId = orderNo # Time.now().toText();
    let order : Order = {
      orderNo;
      orderType;
      product;
      design;
      weight;
      size;
      quantity;
      remarks;
      genericName;
      karigarName;
      status = #Pending;
      orderId;
      createdAt = Time.now();
      updatedAt = Time.now();
      readyDate = null;
      originalOrderId = null;
      orderDate = null;
      movedBy = null;
      updatedBy = null;
      lastAction = null;
    };
    orders.add(orderId, order);
    orderId;
  };

  // GET ORDER
  public query ({ caller }) func getOrder(orderId : Text) : async ?Order {
    orders.get(orderId);
  };

  // GET ALL ORDERS
  public query ({ caller }) func getAllOrders() : async [Order] {
    orders.values().toArray();
  };

  // GET READY ORDERS
  public query ({ caller }) func getReadyOrders() : async [Order] {
    let readyOrders = List.empty<Order>();
    for (order in orders.values()) {
      if (order.status == #Ready) {
        readyOrders.add(order);
      };
    };
    readyOrders.toArray();
  };

  // GET ORDERS BY STATUS
  public query ({ caller }) func getOrdersByStatus(status : OrderStatus) : async [Order] {
    let filteredOrders = List.empty<Order>();
    for (order in orders.values()) {
      if (order.status == status) {
        filteredOrders.add(order);
      };
    };
    filteredOrders.toArray();
  };

  // DELETE ORDER
  public shared ({ caller }) func deleteOrder(orderId : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?_) { orders.remove(orderId) };
    };
  };

  // RESET ACTIVE ORDERS
  public shared ({ caller }) func resetActiveOrders() : async () {
    let keysToDelete = orders.entries().toArray().map(
      func((key, order)) {
        switch (order.status) {
          case (#Pending) { ?key };
          case (#Ready) { ?key };
          case (#Hallmark) { ?key };
          case (#ReturnFromHallmark) { ?key };
        };
      }
    );

    for (keyOpt in keysToDelete.values()) {
      switch (keyOpt) {
        case (?key) { orders.remove(key) };
        case (null) {};
      };
    };
  };

  // GET DESIGN MAPPING
  public query ({ caller }) func getDesignMapping(designCode : Text) : async ?DesignMapping {
    designMappings.get(designCode);
  };

  // BATCH SAVE DESIGN MAPPINGS
  public shared ({ caller }) func batchSaveDesignMappings(mappings : [MappingRecord], createdBy : Text) : async () {
    for (mapping in mappings.values()) {
      let designMapping : DesignMapping = {
        designCode = mapping.designCode;
        genericName = mapping.genericName;
        karigarName = mapping.karigarName;
        createdBy;
        updatedBy = null;
        createdAt = Time.now();
        updatedAt = Time.now();
      };
      designMappings.add(mapping.designCode, designMapping);
    };
  };

  // CHANGES  -------------------------------------------------------
  // CHANGES  -------------------------------------------------------
  // CHANGES  -------------------------------------------------------

  // CREATE ORDER WITH DATE
  public shared ({ caller }) func createOrderWithDate(
    orderNo : Text,
    orderType : OrderType,
    product : Text,
    design : Text,
    weight : Float,
    size : Float,
    quantity : Nat,
    remarks : Text,
    genericName : ?Text,
    karigarName : ?Text,
    orderDate : ?Time.Time,
  ) : async Text {
    let orderId = orderNo # Time.now().toText();
    let order : Order = {
      orderNo;
      orderType;
      product;
      design;
      weight;
      size;
      quantity;
      remarks;
      genericName;
      karigarName;
      status = #Pending;
      orderId;
      createdAt = Time.now();
      updatedAt = Time.now();
      readyDate = null;
      originalOrderId = null;
      orderDate;
      movedBy = null;
      updatedBy = null;
      lastAction = null;
    };
    orders.add(orderId, order);
    orderId;
  };

  // UPDATE ORDER QUANTITY
  public shared ({ caller }) func updateOrderQuantity(orderId : Text, newQuantity : Nat, updatedBy : Text) : async () {
    switch (orders.get(orderId)) {
      case (null) { Runtime.trap("Order not found") };
      case (?order) {
        let updatedOrder : Order = {
          order with
          quantity = newQuantity;
          updatedAt = Time.now();
          updatedBy = ?updatedBy;
          lastAction = ?("Quantity Updated • " # updatedBy);
        };
        orders.add(orderId, updatedOrder);
      };
    };
  };

  public shared ({ caller }) func markOrdersAsReady(orderIds : [Text], updatedBy : Text) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) { Runtime.trap("Order not found") };
        case (?order) {
          if (order.status != #Pending) {
            Runtime.trap("Order must be Pending");
          };
          let updatedOrder : Order = {
            order with
            status = #Ready;
            updatedAt = Time.now();
            readyDate = ?Time.now();
            updatedBy = ?updatedBy;
            lastAction = ?("Ready • " # updatedBy);
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };

  // MARK ORDER AS PENDING
  public shared ({ caller }) func markOrdersAsPending(orderIds : [Text], updatedBy : Text) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) { Runtime.trap("Order not found") };
        case (?order) {
          if (order.status != #Ready) {
            Runtime.trap("Order must be Ready");
          };
          let updatedOrder : Order = {
            order with
            status = #Pending;
            updatedAt = Time.now();
            readyDate = null;
            updatedBy = ?updatedBy;
            lastAction = ?("Pending • " # updatedBy);
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };

  public shared ({ caller }) func batchUpdateOrderStatus(
    orderIds : [Text],
    newStatus : OrderStatus,
    updatedBy : Text,
  ) : async () {
    for (orderId in orderIds.values()) {
      switch (orders.get(orderId)) {
        case (null) { Runtime.trap("Order not found") };
        case (?order) {
          let updatedOrder : Order = {
            order with
            status = newStatus;
            updatedAt = Time.now();
            readyDate = if (newStatus == #Ready) { ?Time.now() } else { order.readyDate };
            updatedBy = ?updatedBy;
            lastAction = ?(statusToText(newStatus) # " • " # updatedBy);
          };
          orders.add(orderId, updatedOrder);
        };
      };
    };
  };

  // SUPPLY ORDER WITH VALUE
  public shared ({ caller }) func supplyOrder(orderId : Text, suppliedQuantity : Nat, updatedBy : Text) : async () {
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

  // SUPPLY AND RETURN ORDER
  public shared ({ caller }) func supplyAndReturnOrder(
    orderId : Text,
    suppliedQuantity : Nat,
    updatedBy : Text,
  ) : async () {
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

  public shared ({ caller }) func uploadMasterDesignExcel(excelFile : Storage.ExternalBlob) : async () {
    masterDesignExcel := ?excelFile;
  };

  public query ({ caller }) func getMasterDesignExcel() : async ?Storage.ExternalBlob {
    masterDesignExcel;
  };

  // RECONCILE MASTER FILES
  public query ({ caller }) func reconcileMasterFile() : async MasterReconciliationResult {
    // Mock implementation
    let missingInSystemRows : [MasterDataRow] = [];
    let missingInExcelRows : [MasterDataRow] = [];
    let matchedRows : [MasterDataRow] = [];
    {
      missingInSystem = missingInSystemRows;
      missingInExcel = missingInExcelRows;
      matchedRows;
    };
  };

  public shared ({ caller }) func persistMasterDataRows(rows : [MasterDataRow]) : async MasterPersistedResponse {
    {
      persistedRows = rows;
      reconciliationResult = await reconcileMasterFile();
    };
  };

  public query ({ caller }) func getDesignCountByKarigar() : async [(Text, Nat)] {
    let designCount = Map.empty<Text, Nat>();

    for (mapping in designMappings.values()) {
      switch (designCount.get(mapping.karigarName)) {
        case (null) { designCount.add(mapping.karigarName, 1) };
        case (?count) {
          designCount.add(mapping.karigarName, count + 1);
        };
      };
    };

    designCount.toArray();
  };

  public query ({ caller }) func getAllMasterDesignMappings() : async [MasterDesignMapping] {
    designMappings.values().toArray().map<DesignMapping, MasterDesignMapping>(
      func(dm) {
        {
          designCode = dm.designCode;
          karigar = dm.karigarName;
          genericName = dm.genericName;
          excelGenericName = "";
        };
      }
    );
  };

  public query ({ caller }) func isExistingDesignCodes(designCode : Text) : async Bool {
    designMappings.containsKey(designCode);
  };

  public query ({ caller }) func getMasterDesigns() : async [Text] {
    let designSet = Map.empty<Text, Bool>();
    for (mapping in designMappings.values()) {
      designSet.add(mapping.designCode, true);
    };
    designSet.keys().toArray();
  };

  public shared ({ caller }) func saveDesignMapping(designMapping : DesignMapping) : async () {
    designMappings.add(designMapping.designCode, designMapping);
  };

  public query ({ caller }) func getDesignImageMapping() : async [(Text, DesignMapping)] {
    let resultList = List.empty<(Text, DesignMapping)>();
    let designArray = designMappings.toArray();
    let length = designArray.size();

    if (length > 0) {
      // Add first element from designMappings array
      let designPair = designArray[0];
      resultList.add(designPair);
    };

    // Iterate over designImages and add mappings
    let imagesArray = designImages.toArray().sliceToArray(0, length);
    if (imagesArray.size() > 0) {
      let (imageKey, _) = imagesArray[0];
      switch (designMappings.get(imageKey)) {
        case (null) {};
        case (?mapping) {
          resultList.add((imageKey, mapping));
        };
      };
    };
    resultList.toArray();
  };

  public shared ({ caller }) func uploadDesignImage(designCode : Text, image : Storage.ExternalBlob) : async () {
    designImages.add(designCode, image);
  };

  public shared ({ caller }) func clearAllDesignMappings() : async () {
    designMappings.clear();
  };

  public query ({ caller }) func getKarigars() : async [Karigar] {
    karigars.values().toArray();
  };

  public query ({ caller }) func getFilteredOutKarigars() : async [Text] {
    filteredOutKarigars.keys().toArray();
  };

  public shared ({ caller }) func updateMasterDesignKarigars(designCode : Text, count : Nat) : async () {
    masterDesignKarigars.add(designCode, count);
  };

  // GET UNIQUE KARIGARS FROM DESIGN MAPPINGS
  public query ({ caller }) func getUniqueKarigarsFromDesignMappings() : async [Text] {
    let karigarSet = Map.empty<Text, Bool>();
    for (mapping in designMappings.values()) {
      karigarSet.add(mapping.karigarName, true);
    };
    karigarSet.keys().toArray();
  };

  // END OF EXISTING FUNCTIONS
};
