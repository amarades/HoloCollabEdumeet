with open(r'apps/web/src/pages/Session.tsx', 'rb') as f:
    content = f.read()

search = b'socket = new SocketManager()'
idx = content.find(search)
if idx >= 0:
    snippet = content[idx-10:idx+700]
    # Print as decoded text to see structure
    try:
        decoded = snippet.decode('utf-8')
        print(decoded)
    except Exception as e:
        print(f"Decode error: {e}")
        print(repr(snippet))
