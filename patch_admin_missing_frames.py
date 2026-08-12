import sys
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

old = """<FrameUploader onUpload={uploadFrames} uploading={uploading} progress={uploadProgress} />"""
new = """<FrameUploader viewType={viewType} currentFrameCount={0} onUpload={async (files, m) => { await uploadFrames(files, m); }} uploading={uploading} progress={uploadProgress} />"""
text = text.replace(old, new)

with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)
