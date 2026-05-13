import os
import re

base_dir = r"c:\Users\josev\GrupEB_Frontend\src"
target_dirs = [os.path.join(base_dir, 'pages'), os.path.join(base_dir, 'components')]

# Expresión regular para buscar 'alert(' respetando límites de palabra
regex = re.compile(r'\balert\s*\(')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    if regex.search(content):
        if "import { showAlert }" in content or "import {showAlert}" in content:
            new_content = regex.sub('showAlert(', content)
        else:
            rel = os.path.relpath(os.path.join(base_dir, 'components', 'CustomAlert'), os.path.dirname(filepath))
            rel = rel.replace('\\', '/')
            if not rel.startswith('.'):
                rel = './' + rel
            
            import_statement = f"import {{ showAlert }} from '{rel}';\n"
            
            new_content = regex.sub('showAlert(', content)
            
            imports_end = 0
            for it in re.finditer(r'^import .*$', new_content, re.MULTILINE):
                imports_end = it.end()
            
            if imports_end > 0:
                new_content = new_content[:imports_end] + "\n" + import_statement + new_content[imports_end:]
            else:
                new_content = import_statement + new_content
        
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Modified {filepath}")

for d in target_dirs:
    for root, dirs, files in os.walk(d):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                if file == "CustomAlert.tsx": continue
                process_file(os.path.join(root, file))
