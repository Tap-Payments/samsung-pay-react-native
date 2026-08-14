package com.margelo.nitro.samsungpayreactnative

import android.os.SystemClock
import android.view.MotionEvent
import android.view.View
import android.view.ViewGroup
import android.webkit.WebView
import org.json.JSONArray
import org.json.JSONObject

/** Helpers shared between the view manager (component mode) and the headless module. */
internal object SamsungPayInternals {

    /** Depth-first search for the SDK's internal WebView. */
    fun findWebView(view: View): WebView? {
        if (view is WebView) return view
        if (view is ViewGroup) {
            for (i in 0 until view.childCount) {
                findWebView(view.getChildAt(i))?.let { return it }
            }
        }
        return null
    }

    /**
     * Dispatches a synthetic tap (down + up) at the WebView's center — identical to a
     * real user tap, so it triggers the Samsung Pay button regardless of the web DOM.
     */
    fun dispatchSyntheticTap(webView: WebView): Boolean {
        if (webView.width <= 0 || webView.height <= 0) return false
        val x = webView.width / 2f
        val y = webView.height / 2f
        val downTime = SystemClock.uptimeMillis()
        val down = MotionEvent.obtain(
            downTime, downTime, MotionEvent.ACTION_DOWN, x, y, 0
        )
        val up = MotionEvent.obtain(
            downTime, downTime + 50, MotionEvent.ACTION_UP, x, y, 0
        )
        webView.dispatchTouchEvent(down)
        webView.dispatchTouchEvent(up)
        down.recycle()
        up.recycle()
        return true
    }

    fun jsonObjectToHashMap(json: JSONObject): LinkedHashMap<String, Any> {
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
