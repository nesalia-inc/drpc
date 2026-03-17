# Security Policy

## Supported Versions

We actively support and provide security updates for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 1.x     | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

If you discover a security vulnerability, please send an email to:

**support@nesalia.com**

Please include:
- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact of the vulnerability
- Any possible fixes (if you have them)

We aim to acknowledge vulnerability reports within 48 hours and provide a timeline for a fix.

## Security Best Practices

When using @deessejs/server:

1. **Never expose internal queries via HTTP** - Use `internalQuery` and `internalMutation` for sensitive operations
2. **Validate all inputs** - Always use Zod schemas for args validation
3. **Keep dependencies updated** - Regularly update your dependencies to get security patches
4. **Use environment variables** - Don't hardcode sensitive data in your code

## Supported This Project

If you find a vulnerability, you can also:

1. Fork the repository
2. Create a private branch
3. Fix the issue
4. Submit a Pull Request with the fix

We appreciate your help in keeping @deessejs/server secure!
