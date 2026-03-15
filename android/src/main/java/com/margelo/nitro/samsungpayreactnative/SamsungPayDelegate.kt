package com.margelo.nitro.samsungpayreactnative

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.events.Event
import com.facebook.react.uimanager.events.EventDispatcher
import com.tap.company.samsungpay_sdk.TapSamsungPay
import com.tap.company.samsungpay_sdk.TapSamsungPayStatusDelegate

private class SamsungPayEvent(
    surfaceId: Int,
    viewTag: Int,
    private val name: String,
    private val data: WritableMap?
) : Event<SamsungPayEvent>(surfaceId, viewTag) {
    override fun getEventName(): String = name
    override fun getEventData(): WritableMap? = data
}

class SamsungPayDelegate(private val view: TapSamsungPay) : TapSamsungPayStatusDelegate {

    private fun dispatch(eventName: String, payload: Map<String, Any?> = emptyMap()) {
        val reactContext = view.context as? ThemedReactContext ?: return
        val surfaceId = UIManagerHelper.getSurfaceId(reactContext)
        val dispatcher: EventDispatcher =
            UIManagerHelper.getEventDispatcherForReactTag(reactContext, view.id) ?: return
        val args: WritableMap? = if (payload.isEmpty()) null else {
            val map = Arguments.createMap()
            payload.forEach { (key, value) ->
                when (value) {
                    is String -> map.putString(key, value)
                    is Boolean -> map.putBoolean(key, value)
                    is Double -> map.putDouble(key, value)
                    is Int -> map.putInt(key, value)
                    null -> map.putNull(key)
                }
            }
            map
        }
        dispatcher.dispatchEvent(SamsungPayEvent(surfaceId, view.id, eventName, args))
    }

    override fun onSamsungPayReady() {
        dispatch("topSamsungPayReady")
    }

    override fun onSamsungPayClick() {
        dispatch("topSamsungPayClick")
    }

    override fun onSamsungPaySuccess(data: String) {
        dispatch("topSamsungPaySuccess", mapOf("data" to data))
    }

    override fun onSamsungPayChargeCreated(data: String) {
        dispatch("topSamsungPayChargeCreated", mapOf("data" to data))
    }

    override fun onSamsungPayOrderCreated(data: String) {
        dispatch("topSamsungPayOrderCreated", mapOf("data" to data))
    }

    override fun onSamsungPayCancel() {
        dispatch("topSamsungPayCancel")
    }

    override fun onSamsungPayError(error: String) {
        dispatch("topSamsungPayError", mapOf("error" to error))
    }
}
