package io.ionic.starter;

import android.Manifest;
import android.content.pm.PackageManager;
import android.os.Bundle;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import com.bluetoothserial.plugin.BluetoothSerial;
import com.getcapacitor.BridgeActivity;
import java.util.ArrayList;
import java.util.List;

public class MainActivity extends BridgeActivity {
  private static final int CAMERA_MIC_PERMISSION_CODE = 1001;
  private static final String[] REQUIRED_PERMISSIONS = new String[] {
    Manifest.permission.CAMERA,
    Manifest.permission.RECORD_AUDIO
  };

  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    registerPlugin(BluetoothSerial.class);
    requestCameraAndMicPermissions();
  }

  private void requestCameraAndMicPermissions() {
    final List<String> permissionsToRequest = new ArrayList<>();
    for (final String permission : REQUIRED_PERMISSIONS) {
      if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
        permissionsToRequest.add(permission);
      }
    }

    if (!permissionsToRequest.isEmpty()) {
      ActivityCompat.requestPermissions(
        this,
        permissionsToRequest.toArray(new String[0]),
        CAMERA_MIC_PERMISSION_CODE
      );
    }
  }

  @Override
  public void onRequestPermissionsResult(
    int requestCode,
    String[] permissions,
    int[] grantResults
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
  }
}
