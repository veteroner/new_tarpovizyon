# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# If your project uses WebView with JS, uncomment the following
# and specify the fully qualified class name to the JavaScript interface
# class:
#-keepclassmembers class fqcn.of.javascript.interface.for.webview {
#   public *;
#}

# Uncomment this to preserve the line number information for
# debugging stack traces.
-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile

# ── Capacitor Rules ────────────────────────────────────
-keep @com.getcapacitor.annotation.CapacitorPlugin public class * {
    @com.getcapacitor.annotation.PermissionCallback <methods>;
    @com.getcapacitor.annotation.ActivityCallback <methods>;
    @com.getcapacitor.PluginMethod public <methods>;
}

# Keep all Capacitor plugin classes
-keep class com.getcapacitor.** { *; }
-keepclassmembers class com.getcapacitor.** { *; }

# Keep Cordova plugins
-keep class org.apache.cordova.** { *; }
-keepclassmembers class org.apache.cordova.** { *; }

# Keep OneSignal
-keep class com.onesignal.** { *; }
-dontwarn com.onesignal.**

# ── WebView + JavaScript Interface ────────────────────
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep JS interface classes
-keepattributes JavascriptInterface
-keepattributes *Annotation*

# ── General Android Rules ──────────────────────────────
-dontwarn org.xmlpull.v1.**
-dontwarn okhttp3.**
-dontwarn okio.**

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep AndroidX
-keep class androidx.** { *; }
-keep interface androidx.** { *; }
-dontwarn androidx.**

# Keep Google Services
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**
