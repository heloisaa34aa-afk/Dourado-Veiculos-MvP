import sys

with open('src/App.test.tsx', 'r') as f:
    text = f.read()

text = text.replace("mileage: 0", "km: 0")

with open('src/App.test.tsx', 'w') as f:
    f.write(text)

