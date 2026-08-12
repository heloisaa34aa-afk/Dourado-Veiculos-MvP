import sys
with open('src/App.tsx', 'r') as f:
    lines = f.readlines()

for i, line in enumerate(lines):
    if "useLayoutEffect(() => {" in line and i != 780: # 781 is 1-indexed, so 780 in 0-index
        lines[i] = line.replace("useLayoutEffect", "useEffect")

with open('src/App.tsx', 'w') as f:
    f.writelines(lines)
