# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img [ref=e7]
    - heading "Create Account" [level=2] [ref=e10]
    - paragraph [ref=e11]: Join the platform to get started
  - generic [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]: Full Name
      - textbox "John Doe" [ref=e15]
    - generic [ref=e16]:
      - generic [ref=e17]: Email Address
      - textbox "you@example.com" [ref=e18]
    - generic [ref=e19]:
      - generic [ref=e20]: Password
      - textbox "••••••••" [ref=e21]
    - generic [ref=e22]:
      - generic [ref=e23]: Role
      - generic [ref=e24]:
        - button "Student" [ref=e25]
        - button "Host/Admin" [ref=e26]
    - button "Create Account" [ref=e27]
  - paragraph [ref=e28]:
    - text: Already have an account?
    - link "Sign In" [ref=e29] [cursor=pointer]:
      - /url: /login
```