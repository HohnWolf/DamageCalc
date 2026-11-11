package de.hohnwolf.rattatalab;

import android.os.Bundle;

import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(AppUpdatePlugin.class); // App-Update per GitHub-Release (js/android_update.js)
        super.onCreate(savedInstanceState);
    }
}
