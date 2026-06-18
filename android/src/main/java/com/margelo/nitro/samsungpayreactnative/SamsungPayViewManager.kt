package com.margelo.nitro.samsungpayreactnative

import android.view.View
import android.view.ViewGroup
import android.view.ViewGroup.MarginLayoutParams
import android.webkit.WebView
import com.facebook.react.uimanager.BaseViewManagerDelegate
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.viewmanagers.NativeSamsungPayViewManagerDelegate
import com.facebook.react.viewmanagers.NativeSamsungPayViewManagerInterface
import com.tap.company.samsungpay_sdk.SamsungPayConfiguration
import com.tap.company.samsungpay_sdk.TapSamsungPay
import org.json.JSONArray
import org.json.JSONObject

class SamsungPayViewManager :
    SimpleViewManager<TapSamsungPay>(),
    NativeSamsungPayViewManagerInterface<TapSamsungPay> {

    private val delegate = NativeSamsungPayViewManagerDelegate(this)

    override fun getDelegate(): BaseViewManagerDelegate<TapSamsungPay, *> = delegate

    override fun getName(): String = "NativeSamsungPayView"

    override fun createViewInstance(context: ThemedReactContext): TapSamsungPay {
        val view = TapSamsungPay(context)
        view.setPadding(0, 0, 0, 0)
        view.clipToPadding = false
        if (view is ViewGroup) {
            view.clipChildren = false
            view.clipToPadding = false
        }
        clearPaddingRecursively(view)

        // The SDK's internal root layout uses match_parent height, which expands to fill the
        // entire screen before RN constrains it. Whenever Fabric calls layout() on this view,
        // directly call layout() on each child to force it into the RN-managed bounds.
        // Using child.layout() (not requestLayout) because Fabric's new arch does not process
        // requestLayout() calls on children of managed views.
        view.addOnLayoutChangeListener { v, left, top, right, bottom, _, _, _, _ ->
            val w = right - left
            val h = bottom - top
            if (h <= 0 || v !is ViewGroup || v.childCount == 0) return@addOnLayoutChangeListener
            forceChildBounds(v as ViewGroup, w, h)
        }

        return view
    }

    override fun onAfterUpdateTransaction(view: TapSamsungPay) {
        super.onAfterUpdateTransaction(view)
        view.setPadding(0, 0, 0, 0)
        clearPaddingRecursively(view)
    }

    override fun setConfiguration(view: TapSamsungPay, value: String?) {
        if (value.isNullOrEmpty()) return
        // Fabric re-sends props whenever the parent re-renders. Skip if this exact configuration
        // is already applied to this view so the SDK doesn't re-run its network configure
        // (base_url.json + config) on every re-render. A fresh view (after a key remount) has a
        // null tag and configures once.
        if (view.tag == value) return
        view.tag = value
        val reactContext = view.context as? ThemedReactContext ?: return
        val activity = reactContext.currentActivity ?: return
        val configMap = jsonObjectToHashMap(JSONObject(value))
        val samsungPayDelegate = SamsungPayDelegate(view)
        SamsungPayConfiguration.configureWithTapSamsungPayDictionaryConfiguration(
            activity,
            view,
            configMap,
            samsungPayDelegate
        )
        view.post {
            clearPaddingRecursively(view)
            // Backup: if Fabric already laid out the view before this post runs, apply now.
            if (view.width > 0 && view.height > 0) {
                forceChildBounds(view, view.width, view.height)
            }
        }
    }

    /**
     * Directly sets each child's bounds to [w] × [h] via View.layout(), recursing into
     * intermediate ViewGroups (but not WebView, to avoid disturbing its internal layout).
     *
     * This is necessary because the SDK's inner views (ConstraintLayout → LinearLayout →
     * WebView) all use match_parent. Android measures match_parent chains to 0 when no
     * explicit size is given, so ConstraintLayout's own onLayout relays those 0-sized
     * measurements to its children even after we force-position ConstraintLayout itself.
     * Direct recursive layout() calls bypass each parent's onLayout and stamp the correct
     * bounds all the way down to the WebView.
     */
    private fun forceChildBounds(parent: ViewGroup, w: Int, h: Int) {
        for (i in 0 until parent.childCount) {
            val child = parent.getChildAt(i)
            val lp = child.layoutParams
            if (lp != null && lp.height != h) {
                lp.height = h
                lp.width = ViewGroup.LayoutParams.MATCH_PARENT
                child.layoutParams = lp
            }
            child.layout(0, 0, w, h)
            if (child is ViewGroup && child !is WebView) {
                forceChildBounds(child, w, h)
            }
        }
    }

    /**
     * Clears padding and margins on the view and all descendants. The SamsungPay-Android SDK
     * inflates a layout with internal padding/margins; this removes them so the button fills the container.
     */
    private fun clearPaddingRecursively(view: View) {
        view.setPadding(0, 0, 0, 0)
        (view.layoutParams as? MarginLayoutParams)?.setMargins(0, 0, 0, 0)
        if (view is ViewGroup) {
            view.clipToPadding = false
            view.clipChildren = false
            for (i in 0 until view.childCount) {
                clearPaddingRecursively(view.getChildAt(i))
            }
        }
    }

    override fun getExportedCustomDirectEventTypeConstants(): MutableMap<String, Any> {
        return mutableMapOf(
            "topSamsungPayReady" to mapOf("registrationName" to "onSamsungPayReady"),
            "topSamsungPayClick" to mapOf("registrationName" to "onSamsungPayClick"),
            "topSamsungPaySuccess" to mapOf("registrationName" to "onSamsungPaySuccess"),
            "topSamsungPayChargeCreated" to mapOf("registrationName" to "onSamsungPayChargeCreated"),
            "topSamsungPayOrderCreated" to mapOf("registrationName" to "onSamsungPayOrderCreated"),
            "topSamsungPayCancel" to mapOf("registrationName" to "onSamsungPayCancel"),
            "topSamsungPayError" to mapOf("registrationName" to "onSamsungPayError")
        )
    }

    private fun jsonObjectToHashMap(json: JSONObject): LinkedHashMap<String, Any> {
        val result = LinkedHashMap<String, Any>()
        val keys = json.keys()
        while (keys.hasNext()) {
            val key = keys.next()
            val value = json.get(key)
            when (value) {
                is JSONObject -> result[key] = jsonObjectToHashMap(value)
                is JSONArray -> result[key] = jsonArrayToList(value)
                JSONObject.NULL -> { /* skip null values */ }
                else -> result[key] = value
            }
        }
        return result
    }

    private fun jsonArrayToList(array: JSONArray): List<Any> {
        val result = mutableListOf<Any>()
        for (i in 0 until array.length()) {
            val value = array.get(i)
            when (value) {
                is JSONObject -> result.add(jsonObjectToHashMap(value))
                is JSONArray -> result.add(jsonArrayToList(value))
                JSONObject.NULL -> { /* skip */ }
                else -> result.add(value)
            }
        }
        return result
    }
}
