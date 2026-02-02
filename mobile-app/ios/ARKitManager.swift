// iOS ARKit Native Module
// ARKitManager.swift

import Foundation
import ARKit

@objc(ARKitManager)
class ARKitManager: NSObject {

  static let sharedInstance = ARKitManager()

  // MARK: - AR Session Management
  @objc static func requiresMainQueueSetup() -> Bool {
    return true
  }

  @objc func initialize(_ config: [String: Any]) -> Bool {
    guard ARWorldTrackingConfiguration.isSupported else {
      print("ARWorldTrackingConfiguration is not supported")
      return false
    }
    
    let configuration = ARWorldTrackingConfiguration()
    
    // Configure plane detection
    if let planeDetection = config["planeDetection"] as? Bool, planeDetection {
      configuration.planeDetection = [.horizontal, .vertical]
    }
    
    // Configure light estimation
    if let lightEstimation = config["lightEstimation"] as? Bool, lightEstimation {
      configuration.isLightEstimationEnabled = true
    }
    
    // Configure world alignment
    if let worldAlignment = config["worldAlignment"] as? String, worldAlignment {
      switch worldAlignment {
      case "gravity":
        configuration.worldAlignment = .gravity
      case "gravityAndHeading":
        configuration.worldAlignment = .gravityAndHeading
      case "camera":
        configuration.worldAlignment = .camera
      default:
        configuration.worldAlignment = .gravity
      }
    }
    
    sharedInstance.arView = ARSCNView(frame: UIScreen.main.bounds, configuration: configuration)
    sharedInstance.session = ARSession(configuration: configuration)
    
    // Set up delegates
    sharedInstance.session.delegate = sharedInstance
    sharedInstance.arView.session = sharedInstance.session
    
    return true
  }

  @objc func startSession() {
    sharedInstance.session.run()
    print("ARKit session started")
  }

  @objc func stopSession() {
    sharedInstance.session.pause()
    print("ARKit session paused")
  }

  @objc func createAnchor(_ position: [String: NSNumber]) -> String? {
    guard let x = position[0] as? Double,
          let y = position[1] as? Double,
          let z = position[2] as? Double else {
      print("Invalid position for anchor")
      return nil
    }
    
    let anchor = ARAnchor(name: "ar_anchor", transform: matrix_identity_float4x4(rows: [0,0,0,1], [0,1,0,0,0]))
    
    // Send anchor to native delegate
    sharedInstance.session.add(anchor: anchor)
    
    return anchor.identifier.uuidString
  }

  @objc func removeAnchor(_ anchorId: String) {
    guard let anchor = sharedInstance.getAnchor(with: anchorId) else {
      print("Anchor not found: \\(anchorId)")
      return
    }
    
    sharedInstance.session.remove(anchor: anchor)
    print("Anchor removed: \\(anchorId)")
  }

  @objc func performHitTest(_ x: CGFloat, _ y: CGFloat, type: String) -> [String: Any] {
    let point = CGPoint(x: x, y: y)
    
    var arHitTestResultType: ARHitTestResultType = .existingPlaneUsingExtent
    switch type {
      case "existingPlane":
        arHitTestResultType = .existingPlaneUsingExtent
      case "estimatedHorizontalPlane":
        arHitTestResultType = .estimatedHorizontalPlane
      case "estimatedVerticalPlane":
        arHitTestResultType = .estimatedVerticalPlane
      case "featurePoint":
        arHitTestResultType = .featurePoint
      default:
        arHitTestResultType = .existingPlaneUsingExtent
    }
    
    let results = sharedInstance.arView.hitTest(point, types: arHitTestResultType)
    
    var hitResults: [[String: Any]] = []
    
    for result in results {
      if let anchor = result.anchor {
        var hitResult: [String: Any] = [
          "position": [
            "x": result.worldTransform.columns.3.x,
            "y": result.worldTransform.columns.3.y,
            "z": result.worldTransform.columns.3.z
          ],
          "distance": result.distance,
          "planeId": anchor.identifier.uuidString
        ]
        hitResults.append(hitResult)
      }
    }
    
    return hitResults
  }

  @objc func add3DAnnotation(_ annotation: [String: Any]) -> Bool {
    guard let position = annotation["position"] as? [String: NSNumber],
          let type = annotation["type"] as? String,
          let color = annotation["color"] as? String else {
      print("Invalid annotation data")
      return false
    }
    
    let x = position["x"] as? Double ?? 0.0
    let y = position["y"] as? Double ?? 0.0
    let z = position["z"] as? Double ?? 0.0
    
    // Create SCNNode based on annotation type
    let node = SCNNode()
    
    switch type {
    case "sphere":
      let sphere = SCNSphere(radius: 0.05)
      sphere.firstMaterial?.diffuse.contents = UIColor(hex: color)
      node.geometry = sphere
      
    case "box":
      let box = SCNBox(width: 0.1, height: 0.1, length: 0.1)
      box.firstMaterial?.diffuse.contents = UIColor(hex: color)
      node.geometry = box
      
    case "arrow":
      let cylinder = SCNCylinder(radius: 0.01, height: 0.2)
      cylinder.firstMaterial?.diffuse.contents = UIColor(hex: color)
      
      let cone = SCNCone(topRadius: 0, bottomRadius: 0.02, height: 0.06)
      cone.firstMaterial?.diffuse.contents = UIColor(hex: color)
      
      let cylinderNode = SCNNode(geometry: cylinder)
      let coneNode = SCNNode(geometry: cone)
      coneNode.position = SCNVector3(0, 0.1, 0)
      
      node.addChildNode(cylinderNode)
      node.addChildNode(coneNode)
      
    case "text":
      guard let text = annotation["text"] as? String,
            let fontSize = annotation["fontSize"] as? CGFloat else {
        print("Invalid text annotation")
        return false
      }
      
      let textGeometry = SCNText(string: text, extrusionDepth: 0.001)
      textGeometry.firstMaterial?.diffuse.contents = UIColor(hex: color)
      node.geometry = textGeometry
      
    case "circle":
      let circle = SCNTorus(ringRadius: 0.05, pipeRadius: 0.01)
      circle.firstMaterial?.diffuse.contents = UIColor(hex: color)
      node.geometry = circle
      
    case "line":
      let lineSource = SCNGeometry()
      // Create line geometry - this is simplified
      node.geometry = lineSource
      
    default:
      let sphere = SCNSphere(radius: 0.05)
      sphere.firstMaterial?.diffuse.contents = UIColor(hex: color)
      node.geometry = sphere
    }
    
    node.position = SCNVector3(x, y, z)
    sharedInstance.arView.scene.rootNode.addChildNode(node)
    
    return true
  }

  @objc func remove3DAnnotation(_ nodeId: String) -> Bool {
    // This is a simplified implementation
    // In production, you'd track nodes and remove them properly
    print("Removing 3D annotation: \\(nodeId)")
    
    // For now, remove all child nodes (simplified)
    sharedInstance.arView.scene.rootNode.childNodes?.forEach { node in
      node.removeFromParentNode()
    }
    
    return true
  }

  @objc func saveWorldMap() -> String? {
    // Get current world map
    guard let worldMap = sharedInstance.session.currentWorldMap else {
      print("No world map available")
      return nil
    }
    
    // Save to file or send to server
    let data = worldMap.archivedData()
    return data.base64EncodedString()
  }

  @objc func loadWorldMap(_ worldMapData: String) -> Bool {
    guard let data = Data(base64Encoded: worldMapData) else {
      print("Invalid world map data")
      return false
    }
    
    do {
      let worldMap = try ARWorldMap.unarchived(data)
      let configuration = ARWorldTrackingConfiguration()
      configuration.initialWorldMap = worldMap
      
      sharedInstance.session.run(configuration: configuration)
      print("World map loaded successfully")
      return true
    } catch {
      print("Failed to load world map: \\(error)")
      return false
    }
  }

  @objc func getCameraTransform() -> [String: Any] {
    guard let cameraTransform = sharedInstance.session.currentFrame?.camera?.transform else {
      return [:]
    }
    
    return [
      "position": [
        "x": cameraTransform.columns.3.x,
        "y": cameraTransform.columns.3.y,
        "z": cameraTransform.columns.3.z
      ],
      "rotation": [
        "x": cameraTransform.columns.0.x,
        "y": cameraTransform.columns.0.y,
        "z": cameraTransform.columns.0.z,
        "w": cameraTransform.columns.0.w
      ]
    ]
  }

  @objc func hitTest(_ x: CGFloat, _ y: CGFloat, type: String, resolve: @escaping RCTPromiseResolveBlock) {
    let results = performHitTest(x, y, type: type)
    resolve(results)
  }

  // MARK: - Helper Methods
  private func getAnchor(with identifier: String) -> ARAnchor? {
    return sharedInstance.session.anchors.first(where: { $0.identifier.uuidString == identifier })
  }

  // MARK: - ARSCNViewDelegate
  func renderer(_ renderer: SCNSceneRenderer, didAdd node: SCNNode, for anchor: ARAnchor) {
    // Node added to scene
    print("Node added for anchor: \\(anchor.identifier.uuidString)")
  }

  func session(_ session: ARSession, didAdd anchors: [ARAnchor]) {
    // Anchors added
    for anchor in anchors {
      print("Anchor added: \\(anchor.identifier.uuidString)")
      
      // Notify React Native
      if let anchorData = try? JSONSerialization.data(withJSONObject: [
        "type": "anchor_added",
        "id": anchor.identifier.uuidString,
        "transform": anchor.transform
      ], options: .fragmentsAllowed) as Data {
        
        ARKitManager.sharedInstance.sendEvent("onAnchorAdded", data: anchorData)
      }
    }
  }

  func session(_ session: ARSession, didUpdate anchors: [ARAnchor]) {
    // Anchors updated
    for anchor in anchors {
      print("Anchor updated: \\(anchor.identifier.uuidString)")
      
      if let anchorData = try? JSONSerialization.data(withJSONObject: [
        "type": "anchor_updated",
        "id": anchor.identifier.uuidString,
        "transform": anchor.transform
      ], options: .fragmentsAllowed) as Data {
        
        ARKitManager.sharedInstance.sendEvent("onAnchorUpdated", data: anchorData)
      }
    }
  }

  func session(_ session: ARSession, didRemove anchors: [ARAnchor]) {
    // Anchors removed
    for anchor in anchors {
      print("Anchor removed: \\(anchor.identifier.uuidString)")
      
      if let anchorData = try? JSONSerialization.data(withJSONObject: [
        "type": "anchor_removed",
        "id": anchor.identifier.uuidString
      ], options: .fragmentsAllowed) as Data {
        
        ARKitManager.sharedInstance.sendEvent("onAnchorRemoved", data: anchorData)
      }
    }
  }

  func session(_ session: ARSession, cameraTrackingStateChanged state: ARCamera.TrackingState) {
    let trackingState: String
    
    switch state {
    case .notAvailable:
      trackingState = "notAvailable"
    case .limited:
      trackingState = "limited"
    case .normal:
      trackingState = "normal"
    @unknown default:
      trackingState = "unknown"
    }
    
    if let eventData = try? JSONSerialization.data(withJSONObject: [
      "type": "tracking_quality_changed",
      "state": trackingState
    ], options: .fragmentsAllowed) as Data {
      
      ARKitManager.sharedInstance.sendEvent("onTrackingQualityChanged", data: eventData)
    }
  }

  // MARK: - Event Emission
  func sendEvent(_ eventName: String, data: Any) {
    // Send event to React Native
    if let reactNativeEventEmitter = ARKitManager.sharedInstance.eventEmitter {
      reactNativeEventEmitter.sendEventBody(eventName, body: data)
    }
  }
}

// Extension for UIColor
private extension UIColor {
  convenience init(hex: String) {
    var hexSanitized = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    var rgb: UInt64 = 0
    
    var scanner = Scanner(string: hexSanitized)
    scanner.scanHexInt32(&rgb)
    
    rgb = (rgb << 8) + rgb
    
    let red = Double((rgb >> 16) & 0xFF) / 255
    let green = Double((rgb >> 8) & 0xFF) / 255
    let blue = Double(rgb & 0xFF) / 255
    
    self.init(red: red, green: green, blue: blue, alpha: 1.0)
  }
}