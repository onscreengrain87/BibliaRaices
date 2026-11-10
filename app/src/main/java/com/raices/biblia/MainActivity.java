package com.raices.biblia;

import android.app.Activity;
import android.graphics.Color;
import android.os.Build;
import android.os.Bundle;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.widget.FrameLayout;
import android.webkit.JavascriptInterface;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.webkit.WebViewAssetLoader;

public class MainActivity extends Activity {
    private WebView web;
    private FrameLayout root;

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        web = new WebView(this);
        web.setBackgroundColor(Color.parseColor("#141114"));
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.parseColor("#141114"));
        root.addView(web, new FrameLayout.LayoutParams(
                FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT));
        setContentView(root);
        // Android 15 dibuja la app detrás de las barras del sistema: dejamos espacio para ellas
        if (Build.VERSION.SDK_INT >= 30) {
            root.setOnApplyWindowInsetsListener((v, insets) -> {
                android.graphics.Insets b = insets.getInsets(WindowInsets.Type.systemBars()
                        | WindowInsets.Type.displayCutout() | WindowInsets.Type.ime());
                v.setPadding(b.left, b.top, b.right, b.bottom);
                return WindowInsets.CONSUMED;
            });
        }

        final WebViewAssetLoader loader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(false);
        s.setTextZoom(100);

        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
                return loader.shouldInterceptRequest(r.getUrl());
            }
        });
        if (state != null) web.restoreState(state);
        else web.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @SuppressWarnings("deprecation")
    @Override
    public void onBackPressed() {
        web.evaluateJavascript("window.appBack ? appBack() : false", value -> {
            if (!"true".equals(value)) finish();
        });
    }

    class Bridge {
        @JavascriptInterface
        public void setBars(final String hex) {
            runOnUiThread(() -> {
                try {
                    int c = Color.parseColor(hex);
                    root.setBackgroundColor(c);
                    web.setBackgroundColor(c);
                    getWindow().setStatusBarColor(c);
                    getWindow().setNavigationBarColor(c);
                    if (Build.VERSION.SDK_INT >= 30 && getWindow().getInsetsController() != null) {
                        boolean light = (Color.red(c) * 299 + Color.green(c) * 587 + Color.blue(c) * 114) / 1000 > 150;
                        int mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                                | WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS;
                        getWindow().getInsetsController().setSystemBarsAppearance(light ? mask : 0, mask);
                    }
                } catch (Exception ignored) { }
            });
        }

        @JavascriptInterface
        public void openUrl(final String url) {
            runOnUiThread(() -> startActivity(new android.content.Intent(
                    android.content.Intent.ACTION_VIEW, android.net.Uri.parse(url))));
        }

        @JavascriptInterface
        public void share(final String text) {
            runOnUiThread(() -> {
                android.content.Intent i = new android.content.Intent(android.content.Intent.ACTION_SEND);
                i.setType("text/plain");
                i.putExtra(android.content.Intent.EXTRA_TEXT, text);
                startActivity(android.content.Intent.createChooser(i, "Compartir"));
            });
        }
    }
}
