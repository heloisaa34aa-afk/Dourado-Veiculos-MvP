import sys
with open('src/App.tsx', 'r') as f:
    text = f.read()

text = text.replace("navigate(`/veiculo/\\${car.id}`);", "navigate(`/veiculo/${encodeURIComponent(car.id)}`);")
text = text.replace("vehicleService.incrementViews(car.id);", "")

with open('src/App.tsx', 'w') as f:
    f.write(text)
