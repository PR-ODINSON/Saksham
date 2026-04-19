class ApiConfig {
  // Use Android emulator host mapping by default.
  // - Android emulator: 10.0.2.2
  // - iOS simulator: localhost
  // - Real device: set to your LAN IP (e.g. http://192.168.1.x:5000)
  static const String baseUrl =
      String.fromEnvironment('SAKSHAM_API_BASE_URL', defaultValue: 'https://715e-2401-4900-53e5-a7bf-b8cc-5ce-3b54-9c0c.ngrok-free.app');

  static String? sessionCookie;
}

