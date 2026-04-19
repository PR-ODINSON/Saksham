import re

def rewrite():
    file_path = 'main.dart'
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()

        # 1. Peon Dashboard Scan Card
        peon_old = """        NeoBox(
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Weekly Infrastructure Scan',"""
        peon_new = """        NeoBox(
          color: const Color(0xFFF0F9FF),
          child: Padding(
            padding: const EdgeInsets.all(18),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Weekly Infrastructure Scan',"""
        content = content.replace(peon_old, peon_new)

        # 2. Principal Dashboard Cards
        prin_old = """        ...queue.map(
          (entry) => NeoBox(
            child: Padding(
              padding: const EdgeInsets.all(12),"""
        prin_new = """        ...queue.map(
          (entry) => NeoBox(
            color: const Color(0xFFFEF2F2),
            child: Padding(
              padding: const EdgeInsets.all(12),"""
        content = content.replace(prin_old, prin_new)

        # 3. DeoDashboard cards
        deo_old = """        ...visibleItems.map(
          (item) => NeoBox(
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
                          item.schoolName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(),
                        ),
                        child: Text(item.impact),
                      ),"""
        deo_new = """        ...visibleItems.map(
          (item) => NeoBox(
            color: item.impact.contains('HIGH') ? const Color(0xFFFEF2F2) : const Color(0xFFFFF7ED),
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
                          item.schoolName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: item.impact.contains('HIGH') ? const Color(0xFFEF4444) : const Color(0xFFF97316),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _navy, width: 2),
                        ),
                        child: Text(item.impact, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
                      ),"""
        # Since white space might not match exactly, let's use regex for DEO.
        # It's safer.
        deo_regex = re.compile(r"""\.\.\.visibleItems\.map\(\s*\(item\)\s*=>\s*NeoBox\(\s*margin:\s*const EdgeInsets\.only\(bottom:\s*12\),\s*child:\s*Padding\(\s*padding:\s*const EdgeInsets\.all\(12\),\s*child:\s*Column\(\s*crossAxisAlignment:\s*CrossAxisAlignment\.start,\s*children:\s*\[\s*Row\(\s*children:\s*\[\s*Expanded\(\s*child:\s*Text\(\s*item\.schoolName,\s*style:\s*const TextStyle\(fontWeight:\s*FontWeight\.bold\),\s*\),\s*\),\s*Container\(\s*padding:\s*const EdgeInsets\.symmetric\([\s\S]*?border:\s*Border\.all\(\),\s*\),\s*child:\s*Text\(item\.impact\),\s*\),""", re.MULTILINE)
        
        replacement = """...visibleItems.map(
          (item) => NeoBox(
            color: item.impact.contains('HIGH') ? const Color(0xFFFEF2F2) : const Color(0xFFFFF7ED),
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
                          item.schoolName,
                          style: const TextStyle(fontWeight: FontWeight.bold),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 5),
                        decoration: BoxDecoration(
                          color: item.impact.contains('HIGH') ? const Color(0xFFEF4444) : const Color(0xFFF97316),
                          borderRadius: BorderRadius.circular(6),
                          border: Border.all(color: _navy, width: 2),
                        ),
                        child: Text(item.impact, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 10)),
                      ),"""
        content = deo_regex.sub(replacement, content)

        # 4. Contractor Inbox
        contractor_regex = re.compile(r"""itemBuilder:\s*\(context,\s*index\)\s*\{\s*final order\s*=\s*visibleOrders\[index\];\s*return NeoBox\(\s*margin:\s*const EdgeInsets\.only\(bottom:\s*12\),""")
        contractor_new = """itemBuilder: (context, index) {
              final order = visibleOrders[index];
              final color = order.status == WorkOrderStatus.completed ? const Color(0xFFECFDF5) : const Color(0xFFF0F9FF);
              return NeoBox(
                color: color,
                margin: const EdgeInsets.only(bottom: 12),"""
        content = contractor_regex.sub(contractor_new, content)

        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Success updating card colors")
    except Exception as e:
        print(f"Error: {e}")

rewrite()
