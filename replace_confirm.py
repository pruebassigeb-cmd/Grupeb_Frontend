import os
import re

base_dir = r"c:\Users\josev\GrupEB_Frontend\src"
target_dirs = [os.path.join(base_dir, 'pages'), os.path.join(base_dir, 'components')]

# Expresión regular para buscar 'confirm('
regex = re.compile(r'\bconfirm\s*\(')

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Special handling to prevent matching window.confirm if it exists, though we will just replace the word confirm
    # actually window.confirm -> window.await showConfirm is invalid JS, so let's fix window.confirm as well.
    content = content.replace("window.confirm(", "confirm(")

    if regex.search(content):
        if "import { showConfirm }" in content or "import {showConfirm}" in content:
            new_content = regex.sub('await showConfirm(', content)
        else:
            rel = os.path.relpath(os.path.join(base_dir, 'components', 'CustomConfirm'), os.path.dirname(filepath))
            rel = rel.replace('\\', '/')
            if not rel.startswith('.'):
                rel = './' + rel
            
            import_statement = f"import {{ showConfirm }} from '{rel}';\n"
            
            new_content = regex.sub('await showConfirm(', content)
            
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
                if file == "CustomConfirm.tsx": continue
                process_file(os.path.join(root, file))
