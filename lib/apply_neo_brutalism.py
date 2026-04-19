import re
import os

def rewrite():
    file_path = 'main.dart'
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        neo_components = """
// Neo Brutalist tokens and helpers
const _navy = Color(0xFF0F172A);
const _blue = Color(0xFF2563EB);
const _slate50 = Color(0xFFF8FAFC);

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
"""
        content = re.sub(r"(import 'package:flutter/material\.dart';)", r"\1\n" + neo_components, content)
        
        neo_theme = """ThemeData(
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
            textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
          ).copyWith(
            shadowColor: MaterialStateProperty.all(_blue),
            elevation: MaterialStateProperty.resolveWith((states) => states.contains(MaterialState.pressed) ? 0 : 6),
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
            textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16),
          ).copyWith(
            shadowColor: MaterialStateProperty.all(const Color(0x190F172A)),
            elevation: MaterialStateProperty.resolveWith((states) => states.contains(MaterialState.pressed) ? 0 : 4),
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
          labelStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Color(0xFF64748B), letterSpacing: 1.5),
        ),
      )"""
        
        content = re.sub(
            r"ThemeData\(\s*useMaterial3: true,\s*fontFamily: 'sans-serif',\s*\)", 
            neo_theme, 
            content,
            flags=re.MULTILINE
        )

        builder_snippet = "builder: (context, child) => Stack(children: [const Positioned.fill(child: GridBackground()), if (child != null) child]),\n      home: _role == null"
        content = content.replace("home: _role == null", builder_snippet)
        
        content = re.sub(r"\bCard\(", "NeoBox(", content)
        
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success rewriting main.dart")
    except Exception as e:
        print(f"Error: {e}")

rewrite()
