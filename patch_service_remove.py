import re

with open('src/services/vehicle360.service.ts', 'r') as f:
    text = f.read()

old_service = """  async removeFrame(projectId: string, frameId: string): Promise<{deleted_frame_id: string, deleted_frame_number: number, storage_path: string, remaining_frames: number}> {"""
new_service = """  async removeFrame(projectId: string, frameId: string): Promise<{deleted_frame_id: string, deleted_frame_number: number, storage_path: string, remaining_frames: number, project_status: string, was_unpublished: boolean}> {"""

text = text.replace(old_service, new_service)

with open('src/services/vehicle360.service.ts', 'w') as f:
    f.write(text)

