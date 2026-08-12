import sys

# 1. Fix FrameUploaderProps
with open('src/components/360/FrameUploader.tsx', 'r') as f:
    text = f.read()

text = text.replace("  uploadMode: 'replace' | 'append';", "")
with open('src/components/360/FrameUploader.tsx', 'w') as f:
    f.write(text)


# 2. Fix useVehicle360.ts error about unpublishProject
# The service is called vehicle360Service.unpublishProject, but it might not exist.
with open('src/hooks/useVehicle360.ts', 'r') as f:
    text = f.read()

# I wrote `await vehicle360Service.unpublishProject(updatedProject.id);` inside removeFrame.
# I should change it to use the unpublishProject exposed by the hook, OR add it to service.
# Let's just use the hook's own method, but wait, the hook has `unpublishProject = async () => {...}` which doesn't take id.
# I'll change it in useVehicle360.ts
text = text.replace("await vehicle360Service.unpublishProject(updatedProject.id);", "await unpublishProject();")
with open('src/hooks/useVehicle360.ts', 'w') as f:
    f.write(text)


# 3. Expose removeFrame in useVehicle360 call in Admin360Module.tsx
with open('src/components/Admin360Module.tsx', 'r') as f:
    text = f.read()

text = text.replace("nextFrame, prevFrame, uploadFrames, uploading, uploadProgress,", "nextFrame, prevFrame, uploadFrames, removeFrame, uploading, uploadProgress,")
# 4. Import UploadCloud in Admin360Module.tsx
if "UploadCloud" not in text:
    text = text.replace("CheckCircle2,", "CheckCircle2, UploadCloud,")
with open('src/components/Admin360Module.tsx', 'w') as f:
    f.write(text)


# 5. Fix tests calling checklist360 without viewType
with open('src/utils/validation360.test.ts', 'r') as f:
    text = f.read()

text = text.replace("validation360.checklist360(mockProject, frames);", "validation360.checklist360(mockProject, frames, 'exterior');")
with open('src/utils/validation360.test.ts', 'w') as f:
    f.write(text)

