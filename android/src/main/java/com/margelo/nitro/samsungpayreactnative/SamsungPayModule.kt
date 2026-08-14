package com.margelo.nitro.samsungpayreactnative

import android.app.Activity
import android.view.ViewGroup
import android.widget.FrameLayout
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UiThreadUtil
import com.tap.company.samsungpay_sdk.SamsungPayConfiguration
import com.tap.company.samsungpay_sdk.TapSamsungPay
import com.tap.company.samsungpay_sdk.TapSamsungPayStatusDelegate
import org.json.JSONObject

/**
 * Headless Samsung Pay: creates the SDK's button (WebView) natively and attaches it
 * off-screen to the activity's decor view, so nothing has to be rendered in the React
 * tree. JS interacts purely through init/startPayment/dispose and event emitters.
 */
class SamsungPayModule(reactContext: ReactApplicationContext) :
    NativeSamsungPayModuleSpec(reactContext) {

    private var container: FrameLayout? = null
    private var payView: TapSamsungPay? = null
    private var configurationJson: String? = null

    @Volatile private var ready = false
    @Volatile private var inProgress = false

    override fun getName(): String = NAME

    override fun init(configuration: String) {
        configurationJson = configuration
        UiThreadUtil.runOnUiThread { createAndAttach(configuration) }
    }

    override fun startPayment(): Boolean {
        if (!ready || inProgress) return false
        val view = payView ?: return false
        UiThreadUtil.runOnUiThread {
            SamsungPayInternals.findWebView(view)?.let {
                SamsungPayInternals.dispatchSyntheticTap(it)
            }
        }
        return true
    }

    override fun isReady(): Boolean = ready && !inProgress

    override fun dispose() {
        configurationJson = null
        UiThreadUtil.runOnUiThread { detach() }
    }

    override fun invalidate() {
        super.invalidate()
        configurationJson = null
        UiThreadUtil.runOnUiThread { detach() }
    }

    private fun createAndAttach(configuration: String) {
        detach()
        val activity: Activity? = reactApplicationContext.currentActivity
        if (activity == null) {
            emitOnSamsungPayError(
                "Samsung Pay init failed: no foreground Activity. Call init() after the app is visible."
            )
            return
        }
        val decor = activity.window?.decorView as? ViewGroup
        if (decor == null) {
            emitOnSamsungPayError("Samsung Pay init failed: activity window not available.")
            return
        }

        val density = activity.resources.displayMetrics.density
        val widthPx = (BUTTON_WIDTH_DP * density).toInt()
        val heightPx = (BUTTON_HEIGHT_DP * density).toInt()

        val view = TapSamsungPay(activity)
        val frame = FrameLayout(activity).apply {
            addView(
                view,
                FrameLayout.LayoutParams(
                    ViewGroup.LayoutParams.MATCH_PARENT,
                    ViewGroup.LayoutParams.MATCH_PARENT
                )
            )
            // Off-screen + invisible: the WebView stays attached and functional
            // (loads the Tap web SDK, receives the synthetic tap) but is never
            // visible and can never intercept the user's real touches.
            translationX = -4f * widthPx
            alpha = 0f
            importantForAccessibility =
                android.view.View.IMPORTANT_FOR_ACCESSIBILITY_NO_HIDE_DESCENDANTS
        }
        decor.addView(frame, FrameLayout.LayoutParams(widthPx, heightPx))
        container = frame
        payView = view

        val configMap = SamsungPayInternals.jsonObjectToHashMap(JSONObject(configuration))
        SamsungPayConfiguration.configureWithTapSamsungPayDictionaryConfiguration(
            activity,
            view,
            configMap,
            HeadlessDelegate()
        )
    }

    private fun detach() {
        ready = false
        inProgress = false
        container?.let { (it.parent as? ViewGroup)?.removeView(it) }
        container = null
        payView = null
    }

    /**
     * Recreates the hidden button after a completed payment, mirroring the component
     * mode's remount-on-success behavior so the next payment starts fresh.
     */
    private fun recreate() {
        val configuration = configurationJson ?: return
        UiThreadUtil.runOnUiThread { createAndAttach(configuration) }
    }

    private inner class HeadlessDelegate : TapSamsungPayStatusDelegate {
        override fun onSamsungPayReady() {
            ready = true
            emitOnSamsungPayReady()
        }

        override fun onSamsungPayClick() {
            inProgress = true
            emitOnSamsungPayClick()
        }

        override fun onSamsungPaySuccess(data: String) {
            inProgress = false
            emitOnSamsungPaySuccess(data)
            recreate()
        }

        override fun onSamsungPayChargeCreated(data: String) {
            inProgress = false
            emitOnSamsungPayChargeCreated(data)
            recreate()
        }

        override fun onSamsungPayOrderCreated(data: String) {
            emitOnSamsungPayOrderCreated(data)
        }

        override fun onSamsungPayCancel() {
            inProgress = false
            emitOnSamsungPayCancel()
        }

        override fun onSamsungPayError(error: String) {
            inProgress = false
            emitOnSamsungPayError(error)
        }
    }

    companion object {
        const val NAME = "SamsungPayModule"
        private const val BUTTON_WIDTH_DP = 300f
        private const val BUTTON_HEIGHT_DP = 48f
    }
}
