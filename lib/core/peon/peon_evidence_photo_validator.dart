import 'dart:io';
import 'dart:math' as math;

import 'package:flutter/foundation.dart';
import 'package:geolocator/geolocator.dart';
import 'package:native_exif/native_exif.dart';

/// Client-side checks for peon evidence photos: in-camera capture, embedded
/// GPS near the device, and a recent capture time. Backend is unchanged.
class PeonEvidencePhotoValidator {
  PeonEvidencePhotoValidator._();

  /// Max horizontal distance between EXIF coordinates and device fix.
  static const double maxDistanceMeters = 150;

  /// After returning from the camera, capture metadata must be this fresh.
  static const Duration maxAgeAfterCapture = Duration(minutes: 4);

  /// At submit time, allow extra time for filling the form.
  static const Duration maxAgeAtSubmit = Duration(minutes: 25);

  static bool get supportedPlatform =>
      !kIsWeb &&
      (defaultTargetPlatform == TargetPlatform.android ||
          defaultTargetPlatform == TargetPlatform.iOS);

  static double haversineMeters(
    double lat1,
    double lon1,
    double lat2,
    double lon2,
  ) {
    const r = 6371000.0;
    final p1 = lat1 * math.pi / 180.0;
    final p2 = lat2 * math.pi / 180.0;
    final dLat = (lat2 - lat1) * math.pi / 180.0;
    final dLon = (lon2 - lon1) * math.pi / 180.0;
    final a = math.sin(dLat / 2) * math.sin(dLat / 2) +
        math.cos(p1) * math.cos(p2) * math.sin(dLon / 2) * math.sin(dLon / 2);
    final c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a));
    return r * c;
  }

  /// Ensures location services are on and returns a current fix, or `null`
  /// with reason key for localization.
  static Future<({Position? position, String? errorKey})>
      obtainCurrentPosition() async {
    if (!supportedPlatform) {
      return (position: null, errorKey: 'peon_photo_need_mobile');
    }
    final enabled = await Geolocator.isLocationServiceEnabled();
    if (!enabled) {
      return (position: null, errorKey: 'peon_photo_location_services_off');
    }
    var perm = await Geolocator.checkPermission();
    if (perm == LocationPermission.denied) {
      perm = await Geolocator.requestPermission();
    }
    if (perm == LocationPermission.denied ||
        perm == LocationPermission.deniedForever) {
      return (position: null, errorKey: 'peon_photo_location_permission');
    }
    try {
      final pos = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
        ),
      );
      return (position: pos, errorKey: null);
    } catch (_) {
      return (position: null, errorKey: 'peon_photo_location_unavailable');
    }
  }

  /// Validates [imagePath] using [device] as the reference location.
  /// [maxAge] controls how old EXIF / file time may be relative to [now].
  static Future<
      ({
        bool ok,
        String? errorKey,
        DateTime? captureTime,
        double? photoLat,
        double? photoLng,
      })> validateFile({
    required String imagePath,
    required Position device,
    required DateTime now,
    required Duration maxAge,
  }) async {
    if (!supportedPlatform) {
      return (
        ok: false,
        errorKey: 'peon_photo_need_mobile',
        captureTime: null,
        photoLat: null,
        photoLng: null,
      );
    }

    Exif? exif;
    try {
      exif = await Exif.fromPath(imagePath);
      final latLong = await exif.getLatLong();
      if (latLong == null) {
        return (
          ok: false,
          errorKey: 'peon_photo_no_gps_embedded',
          captureTime: null,
          photoLat: null,
          photoLng: null,
        );
      }

      final d = haversineMeters(
        latLong.latitude,
        latLong.longitude,
        device.latitude,
        device.longitude,
      );
      if (d > maxDistanceMeters) {
        return (
          ok: false,
          errorKey: 'peon_photo_site_mismatch',
          captureTime: null,
          photoLat: null,
          photoLng: null,
        );
      }

      DateTime? taken = await exif.getOriginalDate();
      taken ??= await File(imagePath).lastModified();
      if (now.difference(taken).abs() > maxAge) {
        return (
          ok: false,
          errorKey: 'peon_photo_not_fresh',
          captureTime: taken,
          photoLat: null,
          photoLng: null,
        );
      }

      return (
        ok: true,
        errorKey: null,
        captureTime: taken,
        photoLat: latLong.latitude,
        photoLng: latLong.longitude,
      );
    } catch (_) {
      return (
        ok: false,
        errorKey: 'peon_photo_exif_read_failed',
        captureTime: null,
        photoLat: null,
        photoLng: null,
      );
    } finally {
      final x = exif;
      if (x != null) {
        try {
          await x.close();
        } catch (_) {}
      }
    }
  }
}
