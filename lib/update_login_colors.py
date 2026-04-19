import re

def update_file():
    file_path = 'main.dart'
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # Update UserRoleLabel
        role_label_old = """extension UserRoleLabel on UserRole {
  String get title => switch (this) {
        UserRole.peon => 'Peon / Watchman View',
        UserRole.principal => 'Principal View',
        UserRole.deo => 'District Officer View',
        UserRole.contractor => 'Contractor View',
      };
}"""
        role_label_new = """extension UserRoleLabel on UserRole {
  String get title => switch (this) {
        UserRole.peon => 'Peon / Watchman View',
        UserRole.principal => 'Principal View',
        UserRole.deo => 'District Officer View',
        UserRole.contractor => 'Contractor View',
      };

  Color get color => switch (this) {
        UserRole.peon => const Color(0xFF475569),
        UserRole.principal => const Color(0xFF475569),
        UserRole.deo => const Color(0xFF2563EB),
        UserRole.contractor => const Color(0xFFEA580C),
      };
}"""
        content = content.replace(role_label_old, role_label_new)

        # Update AppBar title
        app_bar_old = """      appBar: AppBar(
        title: Text(role.title),
        actions: ["""
        app_bar_new = """      appBar: AppBar(
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
                style: const TextStyle(fontSize: 10, color: Colors.white, fontWeight: FontWeight.w900, letterSpacing: 1.5),
              ),
            ),
          ],
        ),
        actions: ["""
        content = content.replace(app_bar_old, app_bar_new)

        # Update LoginScreen body completely
        # We find 'class LoginScreen extends StatefulWidget' to 'class AppShell extends StatelessWidget'
        login_screen_regex = re.compile(r'(class LoginScreen extends StatefulWidget \{.*?)(?=class AppShell extends StatelessWidget \{)', re.DOTALL)
        
        new_login_screen = """class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key, required this.onLogin});

  final ValueChanged<UserRole> onLogin;

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _userController = TextEditingController();
  final _passwordController = TextEditingController();
  final _formKey = GlobalKey<FormState>();

  UserRole _resolveRoleFromUserId(String userId) {
    final id = userId.trim().toLowerCase();
    if (id.startsWith('pr')) return UserRole.principal;
    if (id.startsWith('deo')) return UserRole.deo;
    if (id.startsWith('con')) return UserRole.contractor;
    return UserRole.peon;
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
                            child: const Icon(Icons.domain, color: Colors.white, size: 28),
                          ),
                          const SizedBox(width: 16),
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              RichText(
                                text: const TextSpan(
                                  text: 'Saksham ',
                                  style: TextStyle(fontFamily: 'sans-serif', fontSize: 24, fontWeight: FontWeight.w900, color: _navy),
                                  children: [
                                    TextSpan(text: 'V3', style: TextStyle(color: _blue, fontStyle: FontStyle.italic)),
                                  ],
                                ),
                              ),
                              const Text('SECURE ACCESS GATEWAY', style: TextStyle(fontFamily: 'sans-serif', fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF94A3B8), letterSpacing: 1.2)),
                            ],
                          ),
                        ],
                      ),
                      const SizedBox(height: 40),
                      const Text('Welcome Back.', style: TextStyle(fontSize: 32, fontWeight: FontWeight.w900, color: _navy, letterSpacing: -0.5)),
                      const SizedBox(height: 8),
                      const Text('Enter your credentials to access the infrastructure portal.', style: TextStyle(color: Color(0xFF64748B), fontWeight: FontWeight.w600, fontSize: 13)),
                      const SizedBox(height: 32),
                      const Text('IDENTITY / EMAIL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF94A3B8), letterSpacing: 1.5)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _userController,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: _navy),
                        decoration: InputDecoration(
                          hintText: 'name@organization.gov',
                          hintStyle: TextStyle(color: _navy.withOpacity(0.3)),
                          prefixIcon: const Icon(Icons.email_outlined, color: Color(0xFF94A3B8)),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 24),
                      const Text('SECRET / PASSWORD', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Color(0xFF94A3B8), letterSpacing: 1.5)),
                      const SizedBox(height: 8),
                      TextFormField(
                        controller: _passwordController,
                        obscureText: true,
                        style: const TextStyle(fontWeight: FontWeight.w700, color: _navy),
                        decoration: InputDecoration(
                          hintText: '••••••••',
                          hintStyle: TextStyle(color: _navy.withOpacity(0.3)),
                          prefixIcon: const Icon(Icons.lock_outline, color: Color(0xFF94A3B8)),
                        ),
                        validator: (v) => (v == null || v.trim().isEmpty) ? 'Required' : null,
                      ),
                      const SizedBox(height: 32),
                      FilledButton(
                        onPressed: () {
                          if (_formKey.currentState?.validate() ?? false) {
                            widget.onLogin(_resolveRoleFromUserId(_userController.text));
                          }
                        },
                        child: const Padding(
                          padding: EdgeInsets.symmetric(vertical: 4),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [Text('Sign In'), SizedBox(width: 8), Icon(Icons.arrow_forward, size: 18)],
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

"""
        content = login_screen_regex.sub(new_login_screen, content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success updating login and colors")
    except Exception as e:
        print(f"Error: {e}")

update_file()
