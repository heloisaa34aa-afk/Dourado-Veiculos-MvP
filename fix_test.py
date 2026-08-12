import sys

with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = text.replace("import React from 'react';", "import React from 'react';\nimport { describe, it, expect, vi } from 'vitest';")
text = text.replace("jest.mock", "vi.mock")
text = text.replace("jest.fn()", "vi.fn()")

with open('src/App.test.tsx', 'w') as f:
    f.write(text)

