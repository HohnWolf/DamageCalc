package de.hohnwolf.rattatalab;

import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.provider.Settings;

import androidx.core.content.FileProvider;

import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.security.MessageDigest;

/**
 * App-Update ohne Play Store: laedt die neue APK (GitHub-Release), prueft sie und startet den Android-Installer.
 * Android verlangt dabei die Signatur des installierten Schluessels und fragt den Nutzer selbst nach der Bestaetigung.
 */
@CapacitorPlugin(name = "AppUpdate")
public class AppUpdatePlugin extends Plugin {

    private File apkFile() {
        File dir = new File(getContext().getCacheDir(), "updates");
        dir.mkdirs();
        return new File(dir, "update.apk");
    }

    private PackageInfo ownInfo() throws PackageManager.NameNotFoundException {
        return getContext().getPackageManager().getPackageInfo(getContext().getPackageName(), 0);
    }

    @SuppressWarnings("deprecation")
    private long codeOf(PackageInfo pi) {
        return Build.VERSION.SDK_INT >= 28 ? pi.getLongVersionCode() : pi.versionCode;
    }

    @PluginMethod
    public void getInfo(PluginCall call) {
        try {
            PackageInfo pi = ownInfo();
            JSObject r = new JSObject();
            r.put("version", pi.versionName);
            r.put("code", codeOf(pi));
            call.resolve(r);
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /** Laedt die APK nach cache/updates/update.apk, meldet 'progress' (percent) und loest nach der Pruefung auf. */
    @PluginMethod
    public void download(final PluginCall call) {
        final String url = call.getString("url");
        final String sha256 = call.getString("sha256");
        if (url == null || !url.startsWith("https://")) { call.reject("Ungueltige Adresse"); return; }
        new Thread(new Runnable() {
            @Override public void run() {
                File out = apkFile(), tmp = new File(out.getPath() + ".part");
                try {
                    HttpURLConnection c = open(url);
                    long total = c.getContentLengthLong();
                    MessageDigest md = MessageDigest.getInstance("SHA-256");
                    InputStream in = c.getInputStream();
                    FileOutputStream fo = new FileOutputStream(tmp);
                    byte[] buf = new byte[64 * 1024];
                    long got = 0;
                    int last = -1, n;
                    while ((n = in.read(buf)) > 0) {
                        fo.write(buf, 0, n);
                        md.update(buf, 0, n);
                        got += n;
                        int pct = total > 0 ? (int) (got * 100 / total) : 0;
                        if (pct != last) {
                            last = pct;
                            JSObject p = new JSObject();
                            p.put("percent", pct);
                            notifyListeners("progress", p);
                        }
                    }
                    fo.close();
                    in.close();
                    c.disconnect();
                    if (sha256 != null && !sha256.isEmpty() && !hex(md.digest()).equalsIgnoreCase(sha256)) {
                        tmp.delete();
                        call.reject("Pruefsumme stimmt nicht");
                        return;
                    }
                    PackageInfo own = ownInfo();
                    PackageInfo apk = getContext().getPackageManager().getPackageArchiveInfo(tmp.getPath(), 0);
                    if (apk == null || !own.packageName.equals(apk.packageName)) {
                        tmp.delete();
                        call.reject("Keine gueltige App-Datei");
                        return;
                    }
                    if (codeOf(apk) <= codeOf(own)) {
                        tmp.delete();
                        call.reject("Die Datei ist nicht neuer als die installierte Version");
                        return;
                    }
                    if (out.exists()) out.delete();
                    if (!tmp.renameTo(out)) {
                        call.reject("Datei konnte nicht gespeichert werden");
                        return;
                    }
                    call.resolve();
                } catch (Exception e) {
                    tmp.delete();
                    call.reject(String.valueOf(e.getMessage()));
                }
            }
        }).start();
    }

    /** Oeffnet den Installer. Fehlt die Erlaubnis "Unbekannte Apps installieren", oeffnet sich deren Einstellung (Code permission). */
    @PluginMethod
    public void install(PluginCall call) {
        File f = apkFile();
        if (!f.exists()) { call.reject("Keine Update-Datei vorhanden"); return; }
        if (Build.VERSION.SDK_INT >= 26 && !getContext().getPackageManager().canRequestPackageInstalls()) {
            Intent s = new Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + getContext().getPackageName()));
            s.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(s);
            call.reject("Installation aus dieser Quelle nicht erlaubt", "permission");
            return;
        }
        try {
            Uri uri = FileProvider.getUriForFile(getContext(), getContext().getPackageName() + ".fileprovider", f);
            Intent i = new Intent(Intent.ACTION_VIEW);
            i.setDataAndType(uri, "application/vnd.android.package-archive");
            i.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_ACTIVITY_NEW_TASK);
            getContext().startActivity(i);
            call.resolve();
        } catch (Exception e) {
            call.reject(String.valueOf(e.getMessage()));
        }
    }

    /** Folgt Weiterleitungen (GitHub zum CDN) selbst, aber nur ueber https und nur zu GitHub-Hosts. */
    private HttpURLConnection open(String url) throws Exception {
        for (int i = 0; i < 6; i++) {
            URL u = new URL(url);
            String h = u.getHost();
            boolean ok = h.equals("github.com") || h.endsWith(".github.com") || h.endsWith(".githubusercontent.com");
            if (!"https".equals(u.getProtocol()) || !ok) throw new Exception("Unerwartete Quelle: " + h);
            HttpURLConnection c = (HttpURLConnection) u.openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(15000);
            c.setReadTimeout(30000);
            c.setRequestProperty("User-Agent", "RattataLab-Android");
            int code = c.getResponseCode();
            if (code >= 300 && code < 400) {
                url = c.getHeaderField("Location");
                c.disconnect();
                if (url == null) break;
                continue;
            }
            if (code != 200) {
                c.disconnect();
                throw new Exception("HTTP " + code);
            }
            return c;
        }
        throw new Exception("Zu viele Weiterleitungen");
    }

    private static String hex(byte[] b) {
        StringBuilder s = new StringBuilder();
        for (byte x : b) s.append(String.format("%02x", x));
        return s.toString();
    }
}
