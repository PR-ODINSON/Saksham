import 'dart:math';

import 'dart:convert';

import 'package:flutter/material.dart';
import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';
import 'package:image_picker/image_picker.dart';
import 'package:video_player/video_player.dart';

import 'core/api/api_config.dart';
import 'core/l10n/app_localizations.dart';

// ── Design tokens ────────────────────────────────────────────────────────────
const _navy = Color(0xFF0F172A);
const _blue = Color(0xFF2563EB);
const _slate50 = Color(0xFFF8FAFC);

// ── Shorthand accessor ───────────────────────────────────────────────────────
AppLocalizations get _l => AppLocalizations.instance;

// ── Grid Background ──────────────────────────────────────────────────────────
class GridBackground extends StatelessWidget {
  const GridBackground({super.key});
  @override
  Widget build(BuildContext context) {
    return CustomPaint(
      painter: _GridPainter(),
      child: const SizedBox.expand(),
    );
  }
}

class _GridPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = const Color(0x0D1E3A8A)
      ..strokeWidth = 1;
    const spacing = 40.0;
    for (double i = 0; i < size.width; i += spacing) {
      canvas.drawLine(Offset(i, 0), Offset(i, size.height), paint);
    }
    for (double i = 0; i < size.height; i += spacing) {
      canvas.drawLine(Offset(0, i), Offset(size.width, i), paint);
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => false;
}

// ── NeoBox ───────────────────────────────────────────────────────────────────
class NeoBox extends StatelessWidget {
  const NeoBox({
    super.key,
    required this.child,
    this.margin,
    this.padding = EdgeInsets.zero,
    this.color = Colors.white,
  });

  final Widget child;
  final EdgeInsetsGeometry? margin;
  final EdgeInsetsGeometry padding;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: margin,
      decoration: BoxDecoration(
        color: color,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: _navy, width: 2),
        boxShadow: const [
          BoxShadow(
            color: Color(0x190F172A),
            offset: Offset(8, 8),
          ),
        ],
      ),
      padding: padding,
      child: child,
    );
  }
}

// ── Language Dropdown ───────────────────────────────────────────────────────
/// A styled dropdown that allows users to select EN, HI, or GU.
/// Rebuild is triggered by [ListenableBuilder] at the [MaterialApp] level.
class _LanguageDropdown extends StatelessWidget {
  const _LanguageDropdown();

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: _l,
      builder: (context, _) {
        return Container(
          margin: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          padding: const EdgeInsets.symmetric(horizontal: 12),
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: _navy, width: 2),
            boxShadow: const [
              BoxShadow(
                color: Color(0x190F172A),
                offset: Offset(4, 4),
              ),
            ],
          ),
          child: DropdownButtonHideUnderline(
            child: DropdownButton<AppLocale>(
              value: _l.locale,
              icon: const Icon(Icons.keyboard_arrow_down_rounded,
                  color: _navy, size: 20),
              dropdownColor: Colors.white,
              borderRadius: BorderRadius.circular(12),
              style: const TextStyle(
                color: _navy,
                fontWeight: FontWeight.w900,
                fontSize: 13,
              ),
              onChanged: (AppLocale? newValue) {
                if (newValue != null) {
                  _l.setLocale(newValue);
                }
              },
              items: AppLocale.values
                  .map<DropdownMenuItem<AppLocale>>((AppLocale value) {
                return DropdownMenuItem<AppLocale>(
                  value: value,
                  child: Text(_l.nameOf(value)),
                );
              }).toList(),
            ),
          ),
        );
      },
    );
  }
}

// ── Entry point ──────────────────────────────────────────────────────────────
void main() {
  runApp(const MyApp());
}

enum UserRole { peon, principal, deo, contractor }

extension UserRoleLabel on UserRole {
  /// Title respects the active locale automatically, since [AppShell] is
  /// rebuilt by the [ListenableBuilder] that wraps [MaterialApp].
  String get title => _l.t(switch (this) {
        UserRole.peon => 'role_peon',
        UserRole.principal => 'role_principal',
        UserRole.deo => 'role_deo',
        UserRole.contractor => 'role_contractor',
      });

  Color get color => switch (this) {
        UserRole.peon => const Color(0xFF475569),
        UserRole.principal => const Color(0xFF475569),
        UserRole.deo => const Color(0xFF2563EB),
        UserRole.contractor => const Color(0xFFEA580C),
      };
}

// ── Root App ─────────────────────────────────────────────────────────────────
class MyApp extends StatefulWidget {
  const MyApp({super.key});

  @override
  State<MyApp> createState() => _MyAppState();
}

class _MyAppState extends State<MyApp> {
  UserRole? _role;
  bool _isOffline = false;
  bool _showSplash = true;

  void _onSplashComplete() => setState(() => _showSplash = false);
  void _login(UserRole role) => setState(() => _role = role);
  void _logout() => setState(() => _role = null);
  void _toggleOffline() => setState(() => _isOffline = !_isOffline);

  @override
  Widget build(BuildContext context) {
    // ListenableBuilder ensures every widget in the tree rebuilds on
    // locale change – string lookups via _l.t('key') yield fresh values.
    return ListenableBuilder(
      listenable: AppLocalizations.instance,
      builder: (context, _) => MaterialApp(
        debugShowCheckedModeBanner: false,
        title: 'Predictive Maintenance Engine',
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: 'sans-serif',
          scaffoldBackgroundColor: Colors.white,
          colorScheme: const ColorScheme.light(
            primary: _navy,
            secondary: _blue,
            surface: Colors.white,
            onSurface: _navy,
          ),
          appBarTheme: const AppBarTheme(
            backgroundColor: Colors.white,
            elevation: 0,
            scrolledUnderElevation: 0,
            centerTitle: false,
            iconTheme: IconThemeData(color: _navy),
            titleTextStyle: TextStyle(
              color: _navy,
              fontWeight: FontWeight.w900,
              fontSize: 20,
              letterSpacing: -0.5,
            ),
          ),
          filledButtonTheme: FilledButtonThemeData(
            style: FilledButton.styleFrom(
              backgroundColor: _navy,
              foregroundColor: Colors.white,
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
                side: const BorderSide(color: _navy, width: 2),
              ),
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
              textStyle:
                  const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ).copyWith(
              shadowColor: WidgetStateProperty.all(_blue),
              elevation: WidgetStateProperty.resolveWith(
                  (s) => s.contains(WidgetState.pressed) ? 0 : 6),
            ),
          ),
          outlinedButtonTheme: OutlinedButtonThemeData(
            style: OutlinedButton.styleFrom(
              foregroundColor: _navy,
              backgroundColor: Colors.white,
              side: const BorderSide(color: _navy, width: 2),
              elevation: 0,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(12),
              ),
              padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
              textStyle:
                  const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
            ).copyWith(
              shadowColor: WidgetStateProperty.all(const Color(0x190F172A)),
              elevation: WidgetStateProperty.resolveWith(
                  (s) => s.contains(WidgetState.pressed) ? 0 : 4),
            ),
          ),
          inputDecorationTheme: InputDecorationTheme(
            filled: true,
            fillColor: _slate50,
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _navy, width: 2),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _navy, width: 2),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(12),
              borderSide: const BorderSide(color: _blue, width: 2),
            ),
            labelStyle: const TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: Color(0xFF64748B),
                letterSpacing: 1.5),
          ),
        ),
        builder: (context, child) => Stack(children: [
          const Positioned.fill(child: GridBackground()),
          if (child != null) child
        ]),
        home: AnimatedSwitcher(
          duration: const Duration(milliseconds: 600),
          switchInCurve: Curves.easeOut,
          switchOutCurve: Curves.easeIn,
          child: _role == null
              ? (_showSplash
                  ? SplashScreen(
                      key: const ValueKey('splash'),
                      onComplete: _onSplashComplete)
                  : LoginScreen(key: const ValueKey('login'), onLogin: _login))
              : AppShell(
                  key: const ValueKey('shell'),
                  role: _role!,
                  isOffline: _isOffline,
                  onLogout: _logout,
                  onToggleOffline: _toggleOffline,
                ),
        ),
      ),
    );
  }
}

// ── Splash Screen ─────────────────────────────────────────────────────────────
class SplashScreen extends StatefulWidget {
  final VoidCallback onComplete;
  const SplashScreen({super.key, required this.onComplete});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  late VideoPlayerController _controller;
  bool _isVideoError = false;

  @override
  void initState() {
    super.initState();
    _controller = VideoPlayerController.asset('assets/splashscreen.mp4')
      ..initialize().then((_) {
        if (!mounted) return;
        setState(() {});
        _controller.play();
        _controller.addListener(_checkVideoCompletion);
      }).catchError((e) {
        if (!mounted) return;
        setState(() => _isVideoError = true);
        Future.delayed(const Duration(seconds: 2), widget.onComplete);
      });
  }

  void _checkVideoCompletion() {
    if (_controller.value.isInitialized) {
      if (_controller.value.position >= _controller.value.duration) {
        widget.onComplete();
        _controller.removeListener(_checkVideoCompletion);
      }
    }
  }

  @override
  void dispose() {
    _controller.removeListener(_checkVideoCompletion);
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.white,
      body: Center(
        child: _isVideoError
            ? const Text('Loading...',
                style: TextStyle(color: _navy, fontSize: 24))
            : _controller.value.isInitialized
                ? AspectRatio(
                    aspectRatio: _controller.value.aspectRatio,
                    child: VideoPlayer(_controller),
                  )
                : const CircularProgressIndicator(color: _blue),
      ),
    );
  }
}

// ── Login Screen ──────────────────────────────────────────────────────────────
class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});
  final ValueChanged<UserRole> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _isLoading = false;

  Future<void> _handleLogin() async {
    if (!(_formKey.currentState?.validate() ?? false)) return;
    setState(() => _isLoading = true);

    try {
      final response = await http.post(
        Uri.parse('${ApiConfig.baseUrl}/api/auth/login'),
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true',
        },
        body: jsonEncode({
          'email': _userController.text.trim(),
          'password': _passwordController.text,
        }),
      );

      if (!mounted) return;
      setState(() => _isLoading = false);

      if (response.statusCode == 200) {
        final rawCookie = response.headers['set-cookie'];
        if (rawCookie != null) {
          int index = rawCookie.indexOf(';');
          ApiConfig.sessionCookie =
              (index == -1) ? rawCookie : rawCookie.substring(0, index);
        }

        final data = jsonDecode(response.body);
        final roleStr = data['user']?['role']?.toString().toLowerCase() ?? '';

        UserRole role;
        if (roleStr == 'principal') {
          role = UserRole.principal;
        } else if (roleStr == 'deo') {
          role = UserRole.deo;
        } else if (roleStr == 'contractor') {
          role = UserRole.contractor;
        } else {
          role = UserRole.peon;
        }

        widget.onLogin(role);
      } else {
        final data = jsonDecode(response.body);
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(data['message'] ?? _l.t('login_failed'))),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(_l.t('network_error'))),
      );
    }
  }

  @override
  void dispose() {
    _userController.dispose();
    _passwordController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: NeoBox(
                color: Colors.white,
                padding: const EdgeInsets.all(32),
                child: Form(
                  key: _formKey,
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      // ── Header row ──────────────────────────────────────
                      Row(
                        children: [
                          Container(
                            width: 48,
                            height: 48,
                            decoration: BoxDecoration(
                              color: _navy,
                              borderRadius: BorderRadius.circular(12),
                              boxShadow: const [
                                BoxShadow(
                                  color: Color(0x332563EB),
                                  blurRadius: 16,
                                  offset: Offset(0, 4),
                                ),
                              ],
                            ),
                            child: const Icon(Icons.domain,
                                color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 16),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                RichText(
                                  text: TextSpan(
                                    text: '${_l.t('app_name')} ',
                                    style: const TextStyle(
                                        fontFamily: 'sans-serif',
                                        fontSize: 24,
                                        fontWeight: FontWeight.w900,
                                        color: _navy),
                                    children: const [
                                      TextSpan(
                                          text: 'V3',
                                          style: TextStyle(
                                              color: _blue,
                                              fontStyle: FontStyle.italic)),
                                    ],
                                  ),
                                ),
                                Text(
                                  _l.t('secure_access'),
                                  style: const TextStyle(
                                      fontFamily: 'sans-serif',
                                      fontSize: 10,
                                      fontWeight: FontWeight.w900,
                                      color: Color(0xFF94A3B8),
                                      letterSpacing: 1.2),
                                ),
                              ],
                            ),
                          ),
                          // ── Language choice dropdown on login ──────────
                          _LanguageDropdown(),
                        ],
                      ),
                      const SizedBox(height: 40),
                      Text(
                        _l.t('welcome_back'),
                        style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.w900,
                            color: _navy,
                            letterSpacing: -0.5),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        _l.t('login_subtitle'),
                        style: const TextStyle(
                            color: Color(0xFF64748B),
                            fontWeight: FontWeight.w600,
                            fontSize: 13),
                      ),
                      const SizedBox(height: 32),
                      // ── Email ──────────────────────────────────────────
                      Text(
                        _l.t('identity_email'),
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF94A3B8),
                            letterSpacing: 1.5),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _userController,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, color: _navy),
                        decoration: InputDecoration(
                          hintText: _l.t('email_hint'),
                          hintStyle:
                              TextStyle(color: _navy.withValues(alpha: 0.3)),
                          prefixIcon: const Icon(Icons.email_outlined,
                              color: Color(0xFF94A3B8)),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? _l.t('required')
                            : null,
                      ),
                      const SizedBox(height: 24),
                      // ── Password ───────────────────────────────────────
                      Text(
                        _l.t('secret_password'),
                        style: const TextStyle(
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            color: Color(0xFF94A3B8),
                            letterSpacing: 1.5),
                      ),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        style: const TextStyle(
                            fontWeight: FontWeight.w700, color: _navy),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle:
                              TextStyle(color: _navy.withValues(alpha: 0.3)),
                          prefixIcon: const Icon(Icons.lock_outline,
                              color: Color(0xFF94A3B8)),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty)
                            ? _l.t('required')
                            : null,
                      ),
                      const SizedBox(height: 32),
                      FilledButton(
                        onPressed: _isLoading ? null : _handleLogin,
                        child: Padding(
                          padding: const EdgeInsets.symmetric(vertical: 4),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 24,
                                  height: 24,
                                  child: CircularProgressIndicator(
                                      color: Colors.white, strokeWidth: 2))
                              : Row(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    Text(_l.t('sign_in')),
                                    const SizedBox(width: 8),
                                    const Icon(Icons.arrow_forward, size: 18)
                                  ],
                                ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ── App Shell ─────────────────────────────────────────────────────────────────
class AppShell extends StatelessWidget {
  const AppShell({
    super.key,
    required this.role,
    required this.isOffline,
    required this.onLogout,
    required this.onToggleOffline,
  });

  final UserRole role;
  final bool isOffline;
  final VoidCallback onLogout;
  final VoidCallback onToggleOffline;

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: role.color,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: _navy, width: 2),
              ),
              child: Text(
                role.title.toUpperCase(),
                style: const TextStyle(
                    fontSize: 10,
                    color: Colors.white,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.5),
              ),
            ),
          ],
        ),
        actions: [
          // ── Language choice dropdown (only on dashboards) ──────────────
          _LanguageDropdown(),
          IconButton(
            onPressed: () {},
            icon: const Icon(Icons.notifications_none_rounded),
            tooltip: _l.t('notifications'),
          ),
          PopupMenuButton<String>(
            icon: const Icon(Icons.settings_outlined),
            onSelected: (value) {
              if (value == 'offline') onToggleOffline();
              if (value == 'logout') onLogout();
            },
            itemBuilder: (context) => [
              PopupMenuItem<String>(
                value: 'offline',
                child: Text(
                    isOffline ? _l.t('go_online') : _l.t('simulate_offline')),
              ),
              PopupMenuItem<String>(
                value: 'logout',
                child: Text(_l.t('sign_out')),
              ),
            ],
          ),
        ],
      ),
      body: Column(
        children: [
          if (isOffline)
            MaterialBanner(
              content: Text(_l.t('offline_banner')),
              actions: const [SizedBox.shrink()],
            ),
          Expanded(
            child: switch (role) {
              UserRole.peon => const PeonDashboardScreen(),
              UserRole.principal => const PrincipalDashboardScreen(),
              UserRole.deo => const DeoDashboardScreen(),
              UserRole.contractor => const ContractorInboxScreen(),
            },
          ),
        ],
      ),
    );
  }
}

// ── Peon Dashboard ────────────────────────────────────────────────────────────
class PeonDashboardScreen extends StatelessWidget {
  const PeonDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final submissions = [
      ('15 Apr 2026', true),
      ('08 Apr 2026', true),
      ('01 Apr 2026', false),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          _l.t('good_morning'),
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 6),
        Text(
          _l.t('assigned_school'),
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: 20),
        NeoBox(
          color: const Color(0xFFF0F9FF),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _l.t('weekly_infra_scan'),
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 8),
                Text(
                  _l.t('due_in_2_days'),
                  style: Theme.of(context).textTheme.bodyLarge,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton(
                    onPressed: () {
                      Navigator.of(context).push(
                        MaterialPageRoute<void>(
                          builder: (_) => const WeeklyConditionFormScreen(),
                        ),
                      );
                    },
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      child: Text(_l.t('start_weekly_report')),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),
        Text(
          _l.t('recent_submissions'),
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        ...submissions.map(
          (item) => ListTile(
            contentPadding: EdgeInsets.zero,
            title: Text(item.$1),
            trailing: Icon(
              item.$2 ? Icons.cloud_done_outlined : Icons.cloud_off_outlined,
            ),
          ),
        ),
      ],
    );
  }
}

// ── Weekly Condition Form ─────────────────────────────────────────────────────
class WeeklyConditionFormScreen extends StatefulWidget {
  const WeeklyConditionFormScreen({super.key});

  @override
  State<WeeklyConditionFormScreen> createState() =>
      _WeeklyConditionFormScreenState();
}

class _WeeklyConditionFormScreenState extends State<WeeklyConditionFormScreen>
    with SingleTickerProviderStateMixin {
  // Internal English values used for API payload and condition comparison.
  static const _statusOptions = [
    'Excellent',
    'Minor Wear',
    'Visible Damage',
    'Critical',
  ];

  // Maps English status → localization key.
  String _localizedStatus(String status) => _l.t(switch (status) {
        'Excellent' => 'excellent',
        'Minor Wear' => 'minor_wear',
        'Visible Damage' => 'visible_damage',
        'Critical' => 'critical',
        _ => status,
      });

  late final TabController _tabController;

  // Keys are English category names (sent to API). titleKey fields are
  // localization keys for FormItemState display labels.
  final Map<String, List<FormItemState>> _items = {
    'Plumbing': [
      FormItemState(title: 'Toilet Pipelines', titleKey: 'toilet_pipelines'),
      FormItemState(
          title: 'Wash Basin Drainage', titleKey: 'wash_basin_drainage'),
    ],
    'Electrical': [
      FormItemState(title: 'Classroom Lights', titleKey: 'classroom_lights'),
      FormItemState(
          title: 'Main Distribution Panel',
          titleKey: 'main_distribution_panel'),
    ],
    'Structural': [
      FormItemState(title: 'Classroom Walls', titleKey: 'classroom_walls'),
      FormItemState(
          title: 'Staircase Railings', titleKey: 'staircase_railings'),
    ],
  };

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: _items.keys.length, vsync: this);
  }

  Future<void> _attachPhoto(FormItemState item) async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery);

    if (pickedFile != null) {
      final random = Random();
      final lat = 20 + random.nextDouble() * 10;
      final lng = 70 + random.nextDouble() * 10;
      setState(() {
        item.localPhotoPath = pickedFile.path;
        item.photoAttached = true;
        item.timestamp = DateTime.now();
        item.gps = '${lat.toStringAsFixed(4)}, ${lng.toStringAsFixed(4)}';
      });
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(_l.t('photo_attached'))),
        );
      }
    }
  }

  bool _isSubmitting = false;

  void _handleNext() {
    if (_tabController.index < _tabController.length - 1) {
      _tabController.animateTo(_tabController.index + 1);
    } else {
      _tabController.animateTo(0);
    }
  }

  Future<void> _handleSubmit() async {
    setState(() => _isSubmitting = true);

    try {
      final request = http.MultipartRequest(
        'POST',
        Uri.parse('${ApiConfig.baseUrl}/api/reports/weekly'),
      );

      if (ApiConfig.sessionCookie != null) {
        request.headers['cookie'] = ApiConfig.sessionCookie!;
      }
      request.headers['ngrok-skip-browser-warning'] = 'true';

      request.fields['schoolId'] = '2126';
      request.fields['weekNumber'] = '1';
      request.fields['district'] = 'Kutch';
      request.fields['schoolType'] = 'Secondary';
      request.fields['isGirlsSchool'] = 'false';
      request.fields['numStudents'] = '500';
      request.fields['buildingAge'] = '10';
      request.fields['materialType'] = 'RCC';
      request.fields['weatherZone'] = 'Dry';

      final categoriesPayload = [];

      for (final entry in _items.entries) {
        final categoryName = entry.key.toLowerCase();
        final items = entry.value;

        int maxScore = 1;
        bool hasIssue = false;
        String? categoryPhotoPath;

        for (final item in items) {
          int score = 1;
          if (item.status == 'Minor Wear') score = 2;
          if (item.status == 'Visible Damage') score = 4;
          if (item.status == 'Critical') score = 5;

          if (score > maxScore) maxScore = score;
          if (score > 2) hasIssue = true;

          if (item.localPhotoPath != null && categoryPhotoPath == null) {
            categoryPhotoPath = item.localPhotoPath;
          }
        }

        if (categoryPhotoPath != null) {
          request.files.add(await http.MultipartFile.fromPath(
            'image_$categoryName',
            categoryPhotoPath,
            filename: 'photo_$categoryName.jpg',
            contentType: MediaType('image', 'jpeg'),
          ));
        }

        categoriesPayload.add({
          'category': categoryName,
          'conditionScore': maxScore.toString(),
          'issueFlag': hasIssue.toString(),
          'photoUploaded': (categoryPhotoPath != null).toString(),
        });
      }

      request.fields['categories'] = jsonEncode(categoriesPayload);

      final response = await request.send();

      if (!mounted) return;
      setState(() => _isSubmitting = false);

      // Cache messenger before async gap to satisfy use_build_context_synchronously.
      final messenger = ScaffoldMessenger.of(context);
      final navigator = Navigator.of(context);

      if (response.statusCode == 201) {
        messenger.showSnackBar(
          SnackBar(content: Text(_l.t('report_submitted'))),
        );
        navigator.pop();
      } else {
        final respStr = await response.stream.bytesToString();
        messenger.showSnackBar(
          SnackBar(content: Text('Failed: $respStr')),
        );
      }
    } catch (e) {
      if (!mounted) return;
      setState(() => _isSubmitting = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error: $e')),
      );
    }
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final categories = _items.keys.toList(growable: false);
    return Scaffold(
      appBar: AppBar(
        title: Text(_l.t('weekly_form_title')),
        bottom: TabBar(
          controller: _tabController,
          // Category key (English) → localized display name
          tabs:
              categories.map((c) => Tab(text: _l.t(c.toLowerCase()))).toList(),
        ),
      ),
      body: Column(
        children: [
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: categories.map((category) {
                final sectionItems = _items[category]!;
                return ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: sectionItems.length,
                  itemBuilder: (context, index) {
                    final item = sectionItems[index];
                    return NeoBox(
                      margin: const EdgeInsets.only(bottom: 14),
                      child: Padding(
                        padding: const EdgeInsets.all(14),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _l.t(item.titleKey),
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(fontWeight: FontWeight.w700),
                            ),
                            const SizedBox(height: 10),
                            DropdownButtonFormField<String>(
                              value: item.status,
                              decoration: InputDecoration(
                                labelText: _l.t('condition'),
                                border: const OutlineInputBorder(),
                              ),
                              items: _statusOptions
                                  .map((option) => DropdownMenuItem<String>(
                                        value: option,
                                        child: Text(_localizedStatus(option)),
                                      ))
                                  .toList(),
                              onChanged: (value) =>
                                  setState(() => item.status = value),
                            ),
                            const SizedBox(height: 10),
                            OutlinedButton.icon(
                              onPressed: () => _attachPhoto(item),
                              icon: const Icon(Icons.camera_alt_outlined),
                              label: Text(item.photoAttached
                                  ? _l.t('retake_photo')
                                  : _l.t('add_photo')),
                            ),
                            if (item.photoAttached && item.timestamp != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 8),
                                child: Text(
                                  'Captured ${item.timestamp} | GPS ${item.gps}',
                                  style: Theme.of(context).textTheme.bodySmall,
                                ),
                              ),
                          ],
                        ),
                      ),
                    );
                  },
                );
              }).toList(),
            ),
          ),
          SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      style: OutlinedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12)),
                      onPressed: _handleNext,
                      child: Text(_l.t('next_category')),
                    ),
                  ),
                  const SizedBox(width: 16),
                  Expanded(
                    child: FilledButton(
                      style: FilledButton.styleFrom(
                          padding: const EdgeInsets.symmetric(vertical: 12)),
                      onPressed: _isSubmitting ? null : _handleSubmit,
                      child: _isSubmitting
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(
                                  color: Colors.white, strokeWidth: 2))
                          : Text(_l.t('submit_report')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class FormItemState {
  FormItemState({required this.title, required this.titleKey});

  /// English title (kept for reference / backward-compat).
  final String title;

  /// Localization key — used for display via [AppLocalizations.instance.t].
  final String titleKey;

  String? status;
  bool photoAttached = false;
  DateTime? timestamp;
  String? gps;
  String? localPhotoPath;
}

// ── Principal Dashboard ───────────────────────────────────────────────────────
class PrincipalDashboardScreen extends StatelessWidget {
  const PrincipalDashboardScreen({super.key});

  @override
  Widget build(BuildContext context) {
    // Each tuple: (labelKey for badge, descKey, daysStr)
    final queue = [
      ('high_impact_toilet', 'plumbing_failure', '45'),
      ('high_impact_lab', 'electrical_overload', '30'),
    ];
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          _l.t('principal_school'),
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 14),
        NeoBox(
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _l.t('predictive_timeline'),
                  style: Theme.of(context)
                      .textTheme
                      .titleMedium
                      ?.copyWith(fontWeight: FontWeight.w700),
                ),
                const SizedBox(height: 14),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    Text(_l.t('next_30_days')),
                    Text(_l.t('next_60_days')),
                  ],
                ),
                const SizedBox(height: 8),
                InkWell(
                  onTap: () => _showWhyCard(context),
                  child: Container(
                    height: 56,
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(8),
                      border: Border.all(color: Theme.of(context).dividerColor),
                    ),
                    child: Row(
                      children: [
                        Expanded(
                          child: _RiskCell(
                            label: _l.t('electrical'),
                            alignment: Alignment.centerLeft,
                          ),
                        ),
                        Expanded(
                          child: _RiskCell(
                            label: _l.t('plumbing'),
                            alignment: Alignment.center,
                          ),
                        ),
                        Expanded(
                          child: _RiskCell(
                            label: _l.t('structural'),
                            alignment: Alignment.centerRight,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 18),
        Text(
          _l.t('urgent_attention'),
          style: Theme.of(context)
              .textTheme
              .titleMedium
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 8),
        ...queue.map(
          (entry) => NeoBox(
            color: const Color(0xFFFEF2F2),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(6),
                      border: Border.all(),
                    ),
                    child: Text(
                      _l.t(entry.$1),
                      style: const TextStyle(fontWeight: FontWeight.bold),
                    ),
                  ),
                  const SizedBox(height: 10),
                  Text(_l.t(entry.$2)),
                  Text(
                      '${_l.t('predicted_failure')} ${entry.$3} ${_l.t('days')}'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _showWhyCard(context),
                          child: Text(_l.t('review_approve')),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: TextButton(
                          onPressed: () {},
                          child: Text(_l.t('dismiss')),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showWhyCard(BuildContext context) {
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              _l.t('structural_45'),
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 12),
            Text(_l.t('trigger_evidence')),
            const SizedBox(height: 8),
            Text(_l.t('evidence_cracks')),
            Text(_l.t('evidence_age')),
            Text(_l.t('evidence_rainfall')),
            const SizedBox(height: 16),
            SizedBox(
              width: double.infinity,
              child: FilledButton(
                onPressed: () => Navigator.of(context).pop(),
                child: Text(_l.t('request_deo')),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _RiskCell extends StatelessWidget {
  const _RiskCell({required this.label, required this.alignment});

  final String label;
  final Alignment alignment;

  @override
  Widget build(BuildContext context) {
    return Align(
      alignment: alignment,
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        child: Chip(label: Text(label)),
      ),
    );
  }
}

// ── DEO Dashboard ─────────────────────────────────────────────────────────────
class DeoDashboardScreen extends StatefulWidget {
  const DeoDashboardScreen({super.key});

  @override
  State<DeoDashboardScreen> createState() => _DeoDashboardScreenState();
}

class _DeoDashboardScreenState extends State<DeoDashboardScreen> {
  // Store keys rather than raw English strings so dropdowns translate.
  String _sortBy = 'impact_level';
  String _filterBy = 'all';

  final List<DeoQueueItem> _items = [
    DeoQueueItem(
      schoolKey: 'deo_school_1',
      impactKey: 'high_impact',
      impactPriority: 2,
      categoryKey: 'plumbing',
      descriptionKey: 'deo_desc_1',
      predictedDays: 12,
    ),
    DeoQueueItem(
      schoolKey: 'deo_school_2',
      impactKey: 'medium_impact',
      impactPriority: 1,
      categoryKey: 'electrical',
      descriptionKey: 'deo_desc_2',
      predictedDays: 20,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final visibleItems = _items
        .where((item) => _filterBy == 'all' || item.categoryKey == _filterBy)
        .toList()
      ..sort((a, b) {
        if (_sortBy == 'time_to_failure') {
          return a.predictedDays.compareTo(b.predictedDays);
        }
        return b.impactPriority.compareTo(a.impactPriority);
      });

    final filterOptions = ['all', 'plumbing', 'electrical', 'structural'];
    final sortOptions = ['impact_level', 'time_to_failure'];

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          _l.t('north_district'),
          style: Theme.of(context)
              .textTheme
              .titleLarge
              ?.copyWith(fontWeight: FontWeight.w700),
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _sortBy,
                decoration: InputDecoration(
                  labelText: _l.t('sort_by'),
                  border: const OutlineInputBorder(),
                ),
                items: sortOptions
                    .map((key) => DropdownMenuItem(
                          value: key,
                          child: Text(_l.t(key)),
                        ))
                    .toList(),
                onChanged: (value) =>
                    setState(() => _sortBy = value ?? _sortBy),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: DropdownButtonFormField<String>(
                value: _filterBy,
                decoration: InputDecoration(
                  labelText: _l.t('filter_by'),
                  border: const OutlineInputBorder(),
                ),
                items: filterOptions
                    .map((key) => DropdownMenuItem(
                          value: key,
                          child: Text(_l.t(key)),
                        ))
                    .toList(),
                onChanged: (value) =>
                    setState(() => _filterBy = value ?? _filterBy),
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),
        ...visibleItems.map(
          (item) => NeoBox(
            color: item.impactPriority == 2
                ? const Color(0xFFFEF2F2)
                : const Color(0xFFFFF7ED),
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: Text(
                          _l.t(item.schoolKey),
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: item.impactPriority == 2
                              ? const Color(0xFFEF4444)
                              : const Color(0xFFF97316),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _navy, width: 2),
                        ),
                        child: Text(
                          _l.t(item.impactKey),
                          style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.bold,
                              fontSize: 10),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  Text(_l.t(item.descriptionKey)),
                  Text(
                      '${_l.t('predicted_failure')} ${item.predictedDays} ${_l.t('days')}'),
                  const SizedBox(height: 6),
                  ExpansionTile(
                    tilePadding: EdgeInsets.zero,
                    title: Text(_l.t('view_ai_evidence')),
                    childrenPadding: const EdgeInsets.only(bottom: 8),
                    children: [
                      ListTile(title: Text(_l.t('ai_evidence_1'))),
                      ListTile(title: Text(_l.t('ai_evidence_2'))),
                    ],
                  ),
                  Align(
                    alignment: Alignment.centerRight,
                    child: FilledButton(
                      onPressed: () =>
                          _showAssignContractorSheet(context, item),
                      child: Text(_l.t('assign_contractor')),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }

  void _showAssignContractorSheet(BuildContext context, DeoQueueItem item) {
    const contractors = [
      ('M/s Reliable Works', 2),
      ('Sharma Infra Services', 4),
      ('City Maintenance Group', 1),
    ];
    showModalBottomSheet<void>(
      context: context,
      showDragHandle: true,
      builder: (context) => Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              _l.t('assign_work_order'),
              style: Theme.of(context)
                  .textTheme
                  .titleLarge
                  ?.copyWith(fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 10),
            ...contractors.map(
              (contractor) => ListTile(
                title: Text(contractor.$1),
                subtitle: Text('${_l.t('active_workload')} ${contractor.$2}'),
                onTap: () {
                  Navigator.of(context).pop();
                  ScaffoldMessenger.of(context).showSnackBar(
                    SnackBar(
                      content: Text(
                        '${_l.t(item.schoolKey)} → ${contractor.$1}. ${_l.t('fcm_msg')}',
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DeoQueueItem {
  DeoQueueItem({
    required this.schoolKey,
    required this.impactKey,
    required this.impactPriority,
    required this.categoryKey,
    required this.descriptionKey,
    required this.predictedDays,
  });

  final String schoolKey;
  final String impactKey;
  final int impactPriority; // 2 = HIGH, 1 = MEDIUM (used for sorting)
  final String categoryKey; // matches filter keys: 'plumbing', etc.
  final String descriptionKey;
  final int predictedDays;
}

// ── Contractor Inbox ──────────────────────────────────────────────────────────
class ContractorInboxScreen extends StatefulWidget {
  const ContractorInboxScreen({super.key});

  @override
  State<ContractorInboxScreen> createState() => _ContractorInboxScreenState();
}

class _ContractorInboxScreenState extends State<ContractorInboxScreen> {
  int _selectedTab = 0;

  final List<WorkOrder> _orders = [
    WorkOrder(
      schoolKey: 'contractor_school_1',
      categoryKey: 'plumbing',
      slaKey: 'due_3_days',
      status: WorkOrderStatus.newOrder,
    ),
    WorkOrder(
      schoolKey: 'contractor_school_2',
      categoryKey: 'electrical',
      slaKey: 'due_5_days',
      status: WorkOrderStatus.active,
    ),
    WorkOrder(
      schoolKey: 'contractor_school_3',
      categoryKey: 'structural',
      slaKey: 'sla_completed',
      status: WorkOrderStatus.completed,
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final statuses = WorkOrderStatus.values;
    final activeStatus = statuses[_selectedTab];
    final visibleOrders =
        _orders.where((item) => item.status == activeStatus).toList();
    return Column(
      children: [
        const SizedBox(height: 8),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: SegmentedButton<int>(
            segments: [
              ButtonSegment(value: 0, label: Text(_l.t('new_order'))),
              ButtonSegment(value: 1, label: Text(_l.t('active_order'))),
              ButtonSegment(value: 2, label: Text(_l.t('completed_order'))),
            ],
            selected: {_selectedTab},
            onSelectionChanged: (selection) =>
                setState(() => _selectedTab = selection.first),
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: ListView.builder(
            padding: const EdgeInsets.all(16),
            itemCount: visibleOrders.length,
            itemBuilder: (context, index) {
              final order = visibleOrders[index];
              final color = order.status == WorkOrderStatus.completed
                  ? const Color(0xFFECFDF5)
                  : const Color(0xFFF0F9FF);
              return NeoBox(
                color: color,
                margin: const EdgeInsets.only(bottom: 12),
                child: ListTile(
                  title: Text(_l.t(order.schoolKey)),
                  subtitle: Text(
                      '${_l.t(order.categoryKey)} | ${_l.t(order.slaKey)}'),
                  trailing: Wrap(
                    spacing: 8,
                    children: [
                      IconButton(
                        tooltip: _l.t('navigate'),
                        onPressed: () {},
                        icon: const Icon(Icons.map_outlined),
                      ),
                      if (order.status == WorkOrderStatus.newOrder)
                        FilledButton(
                          onPressed: () => setState(
                              () => order.status = WorkOrderStatus.active),
                          child: Text(_l.t('accept')),
                        ),
                      if (order.status == WorkOrderStatus.active)
                        OutlinedButton(
                          onPressed: () {
                            Navigator.of(context).push(
                              MaterialPageRoute<void>(
                                builder: (_) => CompletionFeedbackScreen(
                                  onSubmit: () {
                                    setState(() => order.status =
                                        WorkOrderStatus.completed);
                                  },
                                ),
                              ),
                            );
                          },
                          child: Text(_l.t('start_work')),
                        ),
                    ],
                  ),
                ),
              );
            },
          ),
        ),
      ],
    );
  }
}

enum WorkOrderStatus { newOrder, active, completed }

class WorkOrder {
  WorkOrder({
    required this.schoolKey,
    required this.categoryKey,
    required this.slaKey,
    required this.status,
  });

  final String schoolKey;
  final String categoryKey;
  final String slaKey;
  WorkOrderStatus status;
}

// ── Completion & ML Feedback ──────────────────────────────────────────────────
class CompletionFeedbackScreen extends StatefulWidget {
  const CompletionFeedbackScreen({super.key, required this.onSubmit});
  final VoidCallback onSubmit;

  @override
  State<CompletionFeedbackScreen> createState() =>
      _CompletionFeedbackScreenState();
}

class _CompletionFeedbackScreenState extends State<CompletionFeedbackScreen> {
  bool _beforeCaptured = false;
  bool _afterCaptured = false;
  // Internal English keys for the segmented button state.
  String _predictionAccuracy = 'yes';
  String? _actualIssue;

  bool get _canSubmit =>
      _beforeCaptured &&
      _afterCaptured &&
      (_predictionAccuracy == 'yes' || _actualIssue != null);

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_l.t('completion_title')),
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          Text(
            _l.t('evidence_upload'),
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              Expanded(
                child: _CaptureTile(
                  title: _l.t('before_photo'),
                  captured: _beforeCaptured,
                  onTap: () => setState(() => _beforeCaptured = true),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _CaptureTile(
                  title: _l.t('after_photo'),
                  captured: _afterCaptured,
                  onTap: () => setState(() => _afterCaptured = true),
                ),
              ),
            ],
          ),
          const SizedBox(height: 18),
          Text(
            _l.t('repair_feedback'),
            style: Theme.of(context)
                .textTheme
                .titleMedium
                ?.copyWith(fontWeight: FontWeight.w700),
          ),
          const SizedBox(height: 8),
          Text(_l.t('prediction_question')),
          const SizedBox(height: 10),
          SegmentedButton<String>(
            segments: [
              ButtonSegment(value: 'yes', label: Text(_l.t('yes'))),
              ButtonSegment(value: 'partially', label: Text(_l.t('partially'))),
              ButtonSegment(value: 'no', label: Text(_l.t('no'))),
            ],
            selected: {_predictionAccuracy},
            onSelectionChanged: (selection) {
              setState(() {
                _predictionAccuracy = selection.first;
                if (_predictionAccuracy == 'yes') _actualIssue = null;
              });
            },
          ),
          if (_predictionAccuracy != 'yes') ...[
            const SizedBox(height: 12),
            DropdownButtonFormField<String>(
              value: _actualIssue,
              decoration: InputDecoration(
                labelText: _l.t('actual_issue'),
                border: const OutlineInputBorder(),
              ),
              items: [
                DropdownMenuItem(
                    value: 'pipe_burst', child: Text(_l.t('pipe_burst'))),
                DropdownMenuItem(
                    value: 'water_pump_failure',
                    child: Text(_l.t('water_pump_failure'))),
                DropdownMenuItem(
                    value: 'circuit_short', child: Text(_l.t('circuit_short'))),
                DropdownMenuItem(
                    value: 'structural_erosion',
                    child: Text(_l.t('structural_erosion'))),
              ],
              onChanged: (value) => setState(() => _actualIssue = value),
            ),
          ],
          const SizedBox(height: 18),
          FilledButton(
            onPressed: _canSubmit
                ? () {
                    widget.onSubmit();
                    Navigator.of(context).pop();
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(content: Text(_l.t('work_order_closed'))),
                    );
                  }
                : null,
            child: Text(_l.t('submit_close')),
          ),
        ],
      ),
    );
  }
}

class _CaptureTile extends StatelessWidget {
  const _CaptureTile({
    required this.title,
    required this.captured,
    required this.onTap,
  });

  final String title;
  final bool captured;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      child: Ink(
        height: 120,
        padding: const EdgeInsets.all(10),
        decoration: BoxDecoration(
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Theme.of(context).dividerColor),
        ),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(captured
                ? Icons.check_circle_outline
                : Icons.camera_alt_outlined),
            const SizedBox(height: 8),
            Text(title, textAlign: TextAlign.center),
          ],
        ),
      ),
    );
  }
}
