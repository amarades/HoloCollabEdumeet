import os

file_path = r'c:\Users\amara\Downloads\HoloCollabEduMeet\apps\web\src\pages\Session.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add session_id to formData
old_formdata = "formData.append('category', 'Session Upload');"
new_formdata = "formData.append('category', 'Session Upload');\n            if (sessionId) {\n                formData.append('session_id', sessionId);\n            }"

if old_formdata in content:
    content = content.replace(old_formdata, new_formdata)
    print("Updated FormData")
else:
    print("Could not find old_formdata")

# 2. Update error reporting
old_error = "alert('Failed to upload model. Please try again.');"
new_error = "const detail = error.message || 'Unknown error';\n            alert(`Failed to upload model: ${detail}`);"

if old_error in content:
    # Use replace with count=1 to be safe, though there might be others
    content = content.replace(old_error, new_error)
    print("Updated Error Reporting")
else:
    print("Could not find old_error")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
