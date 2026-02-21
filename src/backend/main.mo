import Text "mo:core/Text";
import Map "mo:core/Map";
import Runtime "mo:core/Runtime";
import Array "mo:core/Array";
import Time "mo:core/Time";
import List "mo:core/List";
import Principal "mo:core/Principal";
import MixinStorage "blob-storage/Mixin";
import Storage "blob-storage/Storage";
import Iter "mo:core/Iter";



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

  // Order
  type Order = {
    orderNo : Text;
    orderType : OrderType;
    product : Text;
    design : Text;
    weight : Float;
    size : Float;
    quantity : Nat;
    remarks : Text;
    genericName : Text;
    karigarName : Text;
    status : OrderStatus;
    orderId : Text;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  // Design Mapping
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

  // Persistent Storage
  let orders = Map.empty<Text, Order>();
  let designMappings = Map.empty<Text, DesignMapping>();
  let designImages = Map.empty<Text, Storage.ExternalBlob>();
  let karigars = Map.empty<Text, Karigar>();

  // Order Functions
  public shared ({ caller }) func saveOrder(
    orderNo : Text,
    orderType : OrderType,
    product : Text,
    design : Text,
    weight : Float,
    size : Float,
    quantity : Nat,
    remarks : Text,
    genericName : Text,
    karigarName : Text,
    status : OrderStatus,
    orderId : Text,
  ) : async () {
    let timestamp = Time.now();
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
      status;
      orderId;
      createdAt = timestamp;
      updatedAt = timestamp;
    };
    orders.add(orderId, order);
  };

  // Karigar Management
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

  // Design Mapping Functions
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

  // Get Orders with Filters
  public query ({ caller }) func getOrders(
    statusFilter : ?OrderStatus,
    typeFilter : ?OrderType,
    searchText : ?Text,
  ) : async [Order] {
    orders.values().toArray();
  };

  // Get Design Mapping
  public query ({ caller }) func getDesignMapping(designCode : Text) : async DesignMapping {
    switch (designMappings.get(designCode)) {
      case (null) { Runtime.trap("Design mapping not found") };
      case (?mapping) { mapping };
    };
  };

  // Delete Order
  public shared ({ caller }) func deleteOrder(orderId : Text) : async () {
    if (not orders.containsKey(orderId)) {
      Runtime.trap("Order not found");
    };
    orders.remove(orderId);
  };

  // Design Image Upload
  public shared ({ caller }) func uploadDesignImage(designCode : Text, blob : Storage.ExternalBlob) : async () {
    designImages.add(designCode, blob);
  };

  // Batch Upload Design Images
  public shared ({ caller }) func batchUploadDesignImages(images : [(Text, Storage.ExternalBlob)]) : async () {
    images.forEach(func((designCode, blob)) { designImages.add(designCode, blob) });
  };

  // Get Design Image
  public query ({ caller }) func getDesignImage(designCode : Text) : async ?Storage.ExternalBlob {
    designImages.get(designCode);
  };
};
