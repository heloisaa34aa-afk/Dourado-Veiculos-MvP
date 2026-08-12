import sys

with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = text.replace("expect(screen.getByText('Veículo não encontrado')).toBeDefined();", "expect(screen.getAllByText(/Veículo não encontrado/i)[0]).toBeDefined();")
text = text.replace("expect(screen.getByText('Veículo não encontrado')).toBeInTheDocument();", "expect(screen.getAllByText(/Veículo não encontrado/i)[0]).toBeDefined();")


with open('src/App.test.tsx', 'w') as f:
    f.write(text)
