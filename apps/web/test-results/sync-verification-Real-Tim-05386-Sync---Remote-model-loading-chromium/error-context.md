# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e5]:
    - img [ref=e7]
    - heading "Welcome Back" [level=2] [ref=e10]
    - paragraph [ref=e11]: Sign in to your account
  - generic [ref=e12]:
    - generic [ref=e13]:
      - generic [ref=e14]: Email Address
      - textbox "you@example.com" [ref=e15]
    - generic [ref=e16]:
      - generic [ref=e17]: Password
      - textbox "••••••••" [ref=e18]
    - button "Sign In" [ref=e19]
  - paragraph [ref=e20]:
    - text: Don't have an account?
    - link "Sign Up" [ref=e21] [cursor=pointer]:
      - /url: /signup
```