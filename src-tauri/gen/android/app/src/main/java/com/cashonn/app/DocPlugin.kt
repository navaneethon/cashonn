package com.cashonn.app

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.print.PrintAttributes
import android.print.PrintManager
import android.webkit.WebResourceError
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.result.ActivityResult
import app.tauri.annotation.ActivityCallback
import app.tauri.annotation.Command
import app.tauri.annotation.InvokeArg
import app.tauri.annotation.TauriPlugin
import app.tauri.plugin.Invoke
import app.tauri.plugin.JSObject
import app.tauri.plugin.Plugin
import java.io.OutputStream

@InvokeArg
class OpenDocArgs

@InvokeArg
class WriteDocArgs {
  lateinit var uri: String
  lateinit var content: String
}

@InvokeArg
class PrintCashbookArgs {
  lateinit var html: String
  lateinit var jobName: String
}

@TauriPlugin
class DocPlugin(private val activity: Activity) : Plugin(activity) {

  private val tag = "CashonnDoc"

  /** Kept alive so the print adapter can still read the page while it paginates. */
  private var printWebView: WebView? = null

  private fun log(message: String) {
    android.util.Log.i(tag, message)
  }

  /**
   * Parked state for the file picker.
   *
   * The picker result cannot be delivered through the invoke that launched it. On tauri
   * 2.11.6 an `@ActivityCallback` response is dropped before it reaches the webview - the
   * command runs, the callback fires with a valid RESULT_OK and a content uri, `resolve()`
   * returns normally, and the JS promise still never settles. A response from a regular
   * `@Command` arrives correctly, so only a *deferred* response is lost. Rather than depend on
   * that path, `openDocument` answers immediately and the callback parks its result here;
   * `getPickResult` then hands it over over the normal command path.
   */
  companion object {
    const val IDLE = "idle"
    const val PICKING = "picking"
    const val OK = "ok"
    const val CANCELED = "canceled"
    const val FAILED = "failed"

    @Volatile private var state: String = IDLE
    @Volatile private var pickedUri: String? = null
    @Volatile private var failure: String? = null
  }

  /**
   * Opens a file with the same fast ACTION_GET_CONTENT picker the dialog plugin uses, but
   * additionally *asks* for a write grant. ACTION_OPEN_DOCUMENT would give a write grant
   * too, but on some OEM pickers (Samsung M14) it makes DocumentsUI enumerate every storage
   * and cloud DocumentsProvider before the list is usable, which stalls Open for tens of
   * seconds. ACTION_GET_CONTENT stays fast; providers that are willing to hand out write
   * access to a picked document do so, which is what makes Save a silent overwrite.
   *
   * No EXTRA_MIME_TYPES: an unknown extension (cshon) resolves through MimeTypeMap to
   * nothing, and an empty whitelist hides cloud providers such as Google Drive.
   *
   * Resolves as soon as the picker is on screen; the picked document is collected separately
   * through `getPickResult` because a response from an activity callback is never delivered.
   */
  @Command
  fun openDocument(invoke: Invoke) {
    try {
      invoke.parseArgs(OpenDocArgs::class.java)

      state = PICKING
      pickedUri = null
      failure = null

      val ret = JSObject()
      ret.put("state", PICKING)
      // Answer before the picker goes up: a response only arrives while the app is still in
      // the foreground, and launching the activity pauses it.
      invoke.resolve(ret)

      val intent = Intent(Intent.ACTION_GET_CONTENT)
      intent.addCategory(Intent.CATEGORY_OPENABLE)
      intent.type = "*/*"
      intent.flags = intent.flags or
        Intent.FLAG_GRANT_READ_URI_PERMISSION or
        Intent.FLAG_GRANT_WRITE_URI_PERMISSION

      startActivityForResult(invoke, intent, "openDocumentResult")
      log("openDocument: picker launched")
    } catch (ex: Exception) {
      state = FAILED
      failure = ex.message ?: "Failed to open the file picker"
      invoke.reject(failure!!)
    }
  }

  @ActivityCallback
  fun openDocumentResult(invoke: Invoke, result: ActivityResult) {
    val data = result.data?.data
    when {
      result.resultCode == Activity.RESULT_OK && data != null -> {
        state = OK
        pickedUri = data.toString()
        failure = null
      }
      result.resultCode == Activity.RESULT_CANCELED -> {
        state = CANCELED
        pickedUri = null
        failure = null
      }
      else -> {
        state = FAILED
        pickedUri = null
        failure = "The file picker closed unexpectedly (result code ${result.resultCode})"
      }
    }
    log("openDocumentResult: state=$state uri=$pickedUri")
  }

  /**
   * Collects the parked picker result. Answering while the picker is still open reports
   * "picking" and leaves the state alone; once the picker is done the result is handed over
   * exactly once and the state goes back to idle.
   */
  @Command
  fun getPickResult(invoke: Invoke) {
    val current = state
    val ret = JSObject()
    ret.put("state", current)
    current.let {
      if (it == OK) pickedUri?.let { uri -> ret.put("uri", uri) }
      if (it == FAILED) failure?.let { message -> ret.put("error", message) }
    }

    if (current != PICKING) {
      state = IDLE
      pickedUri = null
      failure = null
    }

    invoke.resolve(ret)
  }

  /**
   * Answers immediately, without touching the picker. Used to tell a live plugin bridge apart
   * from a dropped one when diagnosing Open on a device.
   */
  @Command
  fun ping(invoke: Invoke) {
    val ret = JSObject()
    ret.put("pong", true)
    ret.put("state", state)
    invoke.resolve(ret)
  }

  /**
   * Writes the cashbook to a content:// URI.
   *
   * This deliberately does not go through tauri-plugin-fs: its Android getFileDescriptor
   * has no try/catch, so when the content resolver throws (read-only grant, provider that
   * rejects the requested mode, revoked grant) the invoke is never resolved *or* rejected
   * and the frontend promise hangs forever - Save then looks like it did nothing, with no
   * message at all. Here every failure is reported back as a real error.
   *
   * "w" is tried first: ParcelFileDescriptor maps it to create+truncate+write, which is what
   * overwriting a file needs, and it is the mode the widest range of providers accept.
   * "wt" is the fallback for providers that insist on an explicit truncate.
   */
  @Command
  fun writeDocument(invoke: Invoke) {
    try {
      val args = invoke.parseArgs(WriteDocArgs::class.java)
      val uri = Uri.parse(args.uri)
      val bytes = args.content.toByteArray(Charsets.UTF_8)

      var failure: Exception? = null
      var written = false
      try {
        writeVia(uri, "w", bytes)
        written = true
      } catch (ex: Exception) {
        failure = ex
      }
      if (!written) {
        try {
          writeVia(uri, "wt", bytes)
          written = true
        } catch (ex: Exception) {
          if (failure == null) failure = ex
        }
      }

      if (!written) {
        invoke.reject(describe(failure, uri))
        return
      }
      invoke.resolve(JSObject())
    } catch (ex: Exception) {
      invoke.reject(ex.message ?: "Failed to write the file")
    }
  }

  private fun writeVia(uri: Uri, mode: String, bytes: ByteArray) {
    val stream: OutputStream = activity.contentResolver.openOutputStream(uri, mode)
      ?: throw java.io.FileNotFoundException("Provider returned no output stream for $uri")
    stream.use {
      it.write(bytes)
      it.flush()
    }
  }

  private fun describe(err: Exception?, uri: Uri): String {
    val detail = err?.let { "${it.javaClass.simpleName}: ${it.message}" } ?: "unknown error"
    return "Could not write $uri — $detail. If this file lives in cloud storage, " +
      "the provider may only grant read access; use File → Save As to save a copy instead."
  }

  /**
   * Opens the system print dialog for a cashbook.
   *
   * Android WebView does not implement `window.print()`, so the webview-side iframe trick can
   * never open a print dialog here. The supported route is a `PrintDocumentAdapter` produced
   * from a WebView, handed to `PrintManager` - that is what surfaces the real print UI, plus
   * "Save as PDF" and any installed printer.
   *
   * The print adapter pulls the page content lazily, so the WebView has to outlive this call.
   * It is held in [printWebView] and released when the next print starts, otherwise the content
   * can be garbage collected mid-pagination and the job silently comes out blank.
   */
  @Command
  fun printCashbook(invoke: Invoke) {
    val args = try {
      invoke.parseArgs(PrintCashbookArgs::class.java)
    } catch (ex: Exception) {
      invoke.reject(ex.message ?: "Failed to read the print request")
      return
    }

    activity.runOnUiThread {
      try {
        val printManager = activity.getSystemService(Context.PRINT_SERVICE) as? PrintManager
        if (printManager == null) {
          invoke.reject("This device has no print service")
          return@runOnUiThread
        }

        // Release the previous job's WebView before replacing it.
        printWebView?.destroy()

        val jobName = args.jobName.ifBlank { "Cashonn" }
        val webView = WebView(activity)
        printWebView = webView
        // Force a real layout pass; the adapter measures the document against it.
        webView.layout(0, 0, 1080, 1920)

        webView.webViewClient = object : WebViewClient() {
          override fun onPageFinished(view: WebView, url: String) {
            try {
              val adapter = view.createPrintDocumentAdapter(jobName)
              printManager.print(
                jobName,
                adapter,
                PrintAttributes.Builder()
                  .setMediaSize(PrintAttributes.MediaSize.UNKNOWN_PORTRAIT)
                  .build()
              )
              invoke.resolve(JSObject())
            } catch (ex: Exception) {
              invoke.reject("Could not start printing: ${ex.message}")
            }
          }

          override fun onReceivedError(
            view: WebView,
            request: WebResourceRequest,
            error: WebResourceError
          ) {
            invoke.reject("Could not render the document for printing: ${error.description}")
          }
        }

        webView.loadDataWithBaseURL(null, args.html, "text/html", "UTF-8", null)
      } catch (ex: Exception) {
        invoke.reject(ex.message ?: "Could not start printing")
      }
    }
  }
}
