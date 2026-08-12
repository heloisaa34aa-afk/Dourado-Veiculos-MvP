import re
with open('src/App.test.tsx', 'r') as f:
    text = f.read()
text = re.sub(r"screen\.getByTestId\(['\"]home-page['\"]\)", "screen.getAllByText('Estoque')[0]", text)
with open('src/App.test.tsx', 'w') as f:
    f.write(text)
