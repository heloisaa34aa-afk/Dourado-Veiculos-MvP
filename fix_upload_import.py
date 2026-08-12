import sys

with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

# Add UploadCloud to lucide-react imports if not there
if "UploadCloud" not in text.split("from 'lucide-react'")[0]:
    text = text.replace("} from 'lucide-react';", ", UploadCloud } from 'lucide-react';")

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)
