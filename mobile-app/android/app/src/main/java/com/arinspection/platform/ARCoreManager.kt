// Android ARCore Native Module
// ARCoreManager.kt

package com.arinspection.platform

import android.content.Context
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableMap
import com.facebook.react.bridge.Promise

import com.google.ar.core.*
import com.google.ar.core.exceptions.UnavailableApkException
import com.google.ar.core.exceptions.UnavailableUserDeclinedInstallationException
import com.google.ar.core.exceptions.SessionPausedException
import com.google.ar.core.exceptions.SessionInterruptedException

import org.json.JSONArray
import org.json.JSONObject

class ARCoreManager(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule() {

    private var session: Session? = null
    private var sessionConfig: Config? = null
    private var isSessionRunning = false
    private var isARSupported = false
    
    companion object {
        const val NAME = "ARCoreManager"
        private val INITIAL_EVENT_TYPES = mapOf(
            "onPlaneDetected",
            "onPlaneUpdated", 
            "onPlaneRemoved",
            "onAnchorAdded",
            "onAnchorUpdated", 
            "onAnchorRemoved",
            "onSessionInterrupted",
            "onSessionResumed",
            "onTrackingQualityChanged"
        )
    }

    init {
        isARSupported = checkARCoreSupport(reactContext)
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun isSupported(promise: Promise) {
        try {
            promise.resolve(isARSupported)
        } catch (e: Exception) {
            promise.reject("ARCore check failed")
        }
    }

    @ReactMethod
    fun initialize(config: ReadableMap, promise: Promise) {
        try {
            if (!isARSupported) {
                promise.reject("ARCore not supported on this device")
                return
            }
            
            sessionConfig = createConfig(config)
            session = Session(reactContext, sessionConfig)
            
            val sessionConfigBuilder = Config.Builder()
                .setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL)
                .setLightEstimationMode(Config.LightEstimationMode.ENVIRONMENTAL_AMBIENT_INTENSITY)
                .setUpdateMode(Config.UpdateMode.BLOCKING)
                .setFocusMode(Config.FocusMode.AUTO)
            
            val enablePlaneDetection = config.hasKey("planeDetection") && config.getBoolean("planeDetection")
            val enableLightEstimation = config.hasKey("lightEstimation") && config.getBoolean("lightEstimation")
            val worldAlignment = config.getString("worldAlignment", "gravity")
            
            when (worldAlignment) {
                "gravity" -> sessionConfigBuilder.setWorldAlignment(Config.WorldAlignmentMode.Gravity)
                "gravityAndHeading" -> sessionConfigBuilder.setWorldAlignment(Config.WorldAlignmentMode.GravityAndHeading)
                "camera" -> sessionConfigBuilder.setWorldAlignment(Config.WorldAlignmentMode.Camera)
            }
            
            if (enablePlaneDetection) {
                sessionConfigBuilder.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL)
            }
            
            if (enableLightEstimation) {
                sessionConfigBuilder.setLightEstimationMode(Config.LightEstimationMode.ENVIRONMENTAL_AMBIENT_INTENSITY)
            }
            
            session.configure(sessionConfigBuilder.build())
            session.resume()
            
            isSessionRunning = true
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to initialize ARCore: ${e.message}")
        }
    }

    @ReactMethod
    fun startSession(promise: Promise) {
        try {
            if (!isARSupported || session == null) {
                promise.reject("ARCore not supported or not initialized")
                return
            }
            
            session?.resume()
            isSessionRunning = true
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to start AR session: ${e.message}")
        }
    }

    @ReactMethod
    fun pauseSession(promise: Promise) {
        try {
            session?.pause()
            isSessionRunning = false
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to pause AR session: ${e.message}")
        }
    }

    @ReactMethod
    fun stopSession(promise: Promise) {
        try {
            session?.close()
            session = null
            isSessionRunning = false
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to stop AR session: ${e.message}")
        }
    }

    @ReactMethod
    fun hitTest(x: Double, y: Double, type: String, promise: Promise) {
        try {
            if (!isSessionRunning || session == null) {
                promise.reject("AR session not running")
                return
            }
            
            val frame = session?.update()
            if (frame == null) {
                promise.reject("Failed to get AR frame")
                return
            }
            
            val hitTestResult = frame.hitTest(x.toFloat(), y.toFloat())
            val results = JSONArray()
            
            for (hit in hitTestResult) {
                val hitResult = JSONObject()
                val pose = hit.hit.pose
                
                hitResult.put("position", JSONObject().apply {
                    put("x", pose.tx())
                    put("y", pose.ty())
                    put("z", pose.tz())
                })
                
                hitResult.put("distance", hit.distance)
                
                if (hit.trackable != null && hit.trackable!!.createAnchors()) {
                    hitResult.put("planeId", hit.trackable!!.anchor!!.identifier)
                }
                
                results.put(hitResult)
            }
            
            promise.resolve(results.toString())
        } catch (e: Exception) {
            promise.reject("Failed to perform hit test: ${e.message}")
        }
    }

    @ReactMethod
    fun createAnchor(position: ReadableMap, promise: Promise) {
        try {
            if (!isSessionRunning || session == null) {
                promise.reject("AR session not running")
                return
            }
            
            val frame = session?.update()
            if (frame == null) {
                promise.reject("Failed to get AR frame")
                return
            }
            
            val x = position.getDouble("x")
            val y = position.getDouble("y")
            val z = position.getDouble("z")
            
            val pose = Pose(floatArrayOf(x, y, z), floatArrayOf(0f, 0f, 0f, 1f))
            val anchor = session!!.createAnchor(pose)
            
            // Create anchor data to return
            val anchorData = JSONObject().apply {
                put("id", anchor!!.identifier)
                put("type", "plane")
            }
            
            promise.resolve(anchorData.toString())
        } catch (e: Exception) {
            promise.reject("Failed to create anchor: ${e.message}")
        }
    }

    @ReactMethod
    fun removeAnchor(anchorId: String, promise: Promise) {
        try {
            if (session == null) {
                promise.reject("AR session not initialized")
                return
            }
            
            val anchor = session!!.getAnchor(anchorId)
            if (anchor != null) {
                session!!.removeAnchor(anchor)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to remove anchor: ${e.message}")
        }
    }

    @ReactMethod
    fun add3DAnnotation(annotation: ReadableMap, promise: Promise) {
        try {
            if (!isSessionRunning || session == null) {
                promise.reject("AR session not running")
                return
            }
            
            val frame = session?.update()
            if (frame == null) {
                promise.reject("Failed to get AR frame")
                return
            }
            
            val type = annotation.getString("type")
            val position = annotation.getDouble("x")
            val y = annotation.getDouble("y")
            val z = annotation.getDouble("z")
            val color = annotation.getString("color")
            val text = annotation.getString("text")
            
            val pose = Pose(floatArrayOf(x, y, z), floatArrayOf(0f, 0f, 0f, 1f))
            
            when (type) {
                "sphere" -> createSphereNode(frame, pose, color)
                "box" -> createBoxNode(frame, pose, color)
                "arrow" -> createArrowNode(frame, pose, color)
                "text" -> createTextNode(frame, pose, color, text)
                "circle" -> createCircleNode(frame, pose, color)
                "line" -> createLineNode(frame, pose, color)
                else -> createDefaultNode(frame, pose, color)
            }
            
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("Failed to add 3D annotation: ${e.message}")
        }
    }

    // Helper methods
    private fun checkARCoreSupport(context: ReactApplicationContext): Boolean {
        return try {
            GoogleApiAvailability.getInstance()
                .isArCoreSupported(context.applicationContext)
        } catch (e: UnavailableUserDeclinedInstallationException) {
            println("ARCore not supported: User declined installation")
            false
        } catch (e: UnavailableApkException) {
            println("ARCore not supported: APK not available")
            false
        } catch (e: Exception) {
            println("ARCore availability check failed: ${e.message}")
            false
        }
    }

    private fun createConfig(config: ReadableMap): Config {
        val builder = Config.Builder()
        
        if (config.hasKey("planeDetection")) {
            builder.setPlaneFindingMode(Config.PlaneFindingMode.HORIZONTAL_AND_VERTICAL)
        }
        
        if (config.hasKey("lightEstimation")) {
            builder.setLightEstimationMode(Config.LightEstimationMode.ENVIRONMENTAL_AMBIENT_INTENSITY)
        }
        
        val worldAlignment = config.getString("worldAlignment", "gravity")
        when (worldAlignment) {
            "gravity" -> builder.setWorldAlignment(Config.WorldAlignmentMode.Gravity)
            "gravityAndHeading" -> builder.setWorldAlignment(Config.WorldAlignmentMode.GravityAndHeading)
            "camera" -> builder.setWorldAlignment(Config.WorldAlignmentMode.Camera)
        }
        
        return builder.build()
    }

    private fun createSphereNode(frame: Frame, pose: Pose, color: String) {
        // Create sphere geometry and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        val sphere = ShapeBuilder().setSphere(0.05f).setMaterial(material).build()
        val node = NodeBuilder().setRenderable(sphere).build()
        node.setWorldPosition(pose)
        frame.getScene().addChild(node)
    }

    private fun createBoxNode(frame: Frame, pose: Pose, color: String) {
        // Create box geometry and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        val box = ShapeBuilder().setBox(0.1f, 0.1f, 0.1f).setMaterial(material).build()
        val node = NodeBuilder().setRenderable(box).build()
        node.setWorldPosition(pose)
        frame.getScene().addChild(node)
    }

    private fun createArrowNode(frame: Frame, pose: Pose, color: String) {
        // Create arrow geometry (cylinder + cone) and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        
        val cylinder = ShapeBuilder().setCylinder(0.01f, 0.2f).setMaterial(material).build()
        val cone = ShapeBuilder().setCone(0f, 0.02f, 0.06f).setMaterial(material).build()
        
        val cylinderNode = NodeBuilder().setRenderable(cylinder).build()
        cylinderNode.setWorldPosition(pose)
        
        val coneNode = NodeBuilder().setRenderable(cone).build()
        coneNode.setWorldPosition(Pose(floatArrayOf(0f, 0.1f, 0f, 0f), floatArrayOf(0f, 0f, 0f, 1f)))
        coneNode.setParent(cylinderNode)
        
        frame.getScene().addChild(cylinderNode)
    }

    private fun createTextNode(frame: Frame, pose: Pose, color: String, text: String) {
        // Create text geometry and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        val textShape = ShapeBuilder().setTextBox(text, 0.1f, 0.1f).setMaterial(material).build()
        val node = NodeBuilder().setRenderable(textShape).build()
        node.setWorldPosition(pose)
        frame.getScene().addChild(node)
    }

    private fun createCircleNode(frame: Frame, pose: Pose, color: String) {
        // Create circle geometry and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        val circle = ShapeBuilder().setCircle(0.05f, 0.01f).setMaterial(material).build()
        val node = NodeBuilder().setRenderable(circle).build()
        node.setWorldPosition(pose)
        frame.getScene().addChild(node)
    }

    private fun createLineNode(frame: Frame, pose: Pose, color: String) {
        // Create line geometry and add to scene
        val material = Material.Builder().setColor(parseColor(color)).build()
        val line = ShapeBuilder().setLine(0.1f, 0.1f).setMaterial(material).build()
        val node = NodeBuilder().setRenderable(line).build()
        node.setWorldPosition(pose)
        frame.getScene().addChild(node)
    }

    private fun createDefaultNode(frame: Frame, pose: Pose, color: String) {
        // Create default node (sphere)
        createSphereNode(frame, pose, color)
    }

    private fun parseColor(color: String): Int {
        return try {
            Color.parseColor(color).toArgb()
        } catch (e: IllegalArgumentException) {
            // Return black if color parsing fails
            Color.BLACK.toArgb()
        }
    }

    override fun onCatalystInstanceDestroy() {
        cleanup()
    }

    private fun cleanup() {
        try {
            session?.close()
            session = null
            isSessionRunning = false
        } catch (e: Exception) {
            println("Error during cleanup: ${e.message}")
        }
    }
}