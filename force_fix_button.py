import re
with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = re.sub(r"screen\.getByText\(['\"]Voltar ao Catálogo['\"]\)", "screen.getAllByText('Voltar ao Catálogo')[0]", text)

with open('src/App.test.tsx', 'w') as f:
    f.write(text)
