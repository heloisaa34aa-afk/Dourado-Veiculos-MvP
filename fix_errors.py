import sys

with open('src/App.tsx', 'r') as f:
    text = f.read()

# fix useParams import
if 'useParams' not in text:
    text = text.replace("import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom';", "import { Routes, Route, useNavigate, Navigate, useLocation, useParams } from 'react-router-dom';")

# fix duplicate navigate
# The first one is around line 50. The second one is from missing.tsx around line 312.
# We can just remove the second one.
text = text.replace("  const navigate = useNavigate();\n\n  const handleSelectCarDetails = (car: Car) => {", "  const handleSelectCarDetails = (car: Car) => {")

with open('src/App.tsx', 'w') as f:
    f.write(text)

