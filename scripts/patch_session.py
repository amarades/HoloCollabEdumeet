"""
Patch Session.tsx to fix the onTogglePresentation handler so that
it actually starts/stops the ARScene presentation mode.
"""

with open(r'apps/web/src/pages/Session.tsx', 'rb') as f:
    raw = f.read()

old = b"                    onTogglePresentation={() => setPresentationMode(!presentationMode)}\r\n"
new_code = (
    b"                    onTogglePresentation={() => {\r\n"
    b"                        if (!presentationMode) {\r\n"
    b"                            // Start presentation: render current slides in 3D\r\n"
    b"                            if (arSceneRef.current && currentSlides.length > 0) {\r\n"
    b"                                arSceneRef.current.startPresentationMode(currentSlides);\r\n"
    b"                            }\r\n"
    b"                            setPresentationMode(true);\r\n"
    b"                        } else {\r\n"
    b"                            // Stop presentation\r\n"
    b"                            if (arSceneRef.current) {\r\n"
    b"                                arSceneRef.current.stopPresentationMode();\r\n"
    b"                            }\r\n"
    b"                            setPresentationMode(false);\r\n"
    b"                        }\r\n"
    b"                    }}\r\n"
)

if old in raw:
    patched = raw.replace(old, new_code, 1)
    with open(r'apps/web/src/pages/Session.tsx', 'wb') as f:
        f.write(patched)
    print("SUCCESS: onTogglePresentation fixed.")
else:
    print("ERROR: target not found.")
    idx = raw.find(b'onTogglePresentation')
    if idx >= 0:
        print(repr(raw[idx-5:idx+120]))
