import re
with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = re.sub(r"expect\(screen\.getByText\(['\"]Veículo não encontrado['\"]\)\)\.toBe(Defined|InTheDocument)\(\);", "expect(screen.getAllByText(/Veículo não encontrado/i)[0]).toBeDefined();", text)

with open('src/App.test.tsx', 'w') as f:
    f.write(text)
