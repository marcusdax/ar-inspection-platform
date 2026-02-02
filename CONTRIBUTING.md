# Contributing to AR Inspection Platform

We welcome contributions to the AR Inspection Platform! This guide will help you get started with contributing to our project.

## 🤝 How to Contribute

### Reporting Bugs
- Search for existing issues before creating a new one
- Use the bug report template when creating new issues
- Include steps to reproduce, expected behavior, and actual behavior
- Include screenshots, device information, and app version

### Suggesting Features
- Check if the feature has been requested before
- Use the feature request template
- Describe the use case and expected behavior
- Consider if it benefits the broader community

### Submitting Pull Requests

#### 1. Fork and Clone
```bash
# Fork the repository on GitHub
git clone https://github.com/YOUR_USERNAME/ar-inspection-platform.git
cd ar-inspection-platform
```

#### 2. Create a Branch
```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or a bugfix branch
git checkout -b fix/bug-description
```

#### 3. Make Your Changes
- Follow the existing code style
- Add tests for new functionality
- Update documentation as needed
- Ensure all tests pass

#### 4. Commit Your Changes
```bash
# Add your changes
git add .

# Commit with conventional commit message
git commit -m "feat: add new AR annotation feature"

# Push to your fork
git push origin feature/your-feature-name
```

#### 5. Create a Pull Request
- Visit your fork on GitHub
- Click "New Pull Request"
- Fill out the PR template
- Wait for review and feedback

## 📋 Development Guidelines

### Code Style
- Use TypeScript for type safety
- Follow ESLint configuration
- Format code with Prettier
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

### Testing
- Write tests for all new functionality
- Maintain test coverage above 80%
- Use Jest for unit tests
- Use Detox for E2E tests
- Test on multiple platforms when possible

### Commit Messages
Follow [Conventional Commits](https://conventionalcommits.org/) specification:

- `feat:` for new features
- `fix:` for bug fixes
- `docs:` for documentation changes
- `style:` for code style changes (formatting, etc.)
- `refactor:` for code refactoring
- `test:` for adding or updating tests
- `chore:` for maintenance tasks

### Branch Naming
- `feature/feature-name` for new features
- `fix/bug-description` for bug fixes
- `docs/documentation-update` for documentation
- `refactor/refactoring-description` for refactoring
- `test/test-improvement` for test improvements

## 🛠️ Development Setup

### Prerequisites
- Node.js 16.0+
- npm 8.0+ or yarn 1.22+
- React Native CLI
- Xcode 13+ (for iOS)
- Android Studio (for Android)

### Setup Steps
1. **Clone and Install**
   ```bash
   git clone https://github.com/YOUR_USERNAME/ar-inspection-platform.git
   cd ar-inspection-platform/apps/mobile
   npm install
   ```

2. **iOS Setup**
   ```bash
   cd ios
   pod install
   cd ..
   ```

3. **Android Setup**
   ```bash
   # Open android/settings.gradle
   # Configure Android SDK path
   ./gradlew build
   ```

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run E2E tests
npm run e2e:android
npm run e2e:ios
```

### Linting and Formatting
```bash
# Run ESLint
npm run lint

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check
```

## 🏗️ Project Structure

```
apps/mobile/src/
├── components/          # React components
│   ├── ar/            # AR-specific components
│   ├── analytics/      # Analytics dashboard
│   ├── security/      # Security settings
│   ├── deployment/     # Deployment management
│   └── performance/   # Performance monitoring
├── services/           # Business logic services
│   ├── ar/            # AR functionality
│   ├── analytics/      # Analytics service
│   ├── security/      # Security service
│   ├── deployment/     # Deployment service
│   ├── performance/   # Performance service
│   ├── storage/       # Data persistence
│   └── native/        # Native bridges
├── hooks/              # Custom React hooks
├── contexts/           # React context providers
├── utils/              # Utility functions
└── __tests__/          # Test files
```

## 🧪 Testing Guidelines

### Unit Tests
- Test components in isolation
- Mock external dependencies
- Test both happy paths and error cases
- Use descriptive test names

```typescript
describe('ARInterface', () => {
  it('should create annotation correctly', async () => {
    // Arrange
    const arInterface = new ARInterface();
    const annotationData = {
      type: 'text',
      position: [0, 0, 0],
      content: 'Test annotation',
    };

    // Act
    const annotation = await arInterface.createAnnotation(annotationData);

    // Assert
    expect(annotation).toBeDefined();
    expect(annotation.type).toBe('text');
  });
});
```

### Component Tests
- Test component rendering
- Test user interactions
- Test component state changes
- Use React Native Testing Library

```typescript
import { render, fireEvent } from '@testing-library/react-native';

describe('WorldMapManager', () => {
  it('should display world maps correctly', async () => {
    // Arrange
    const mockWorldMaps = [/* mock data */];

    // Act
    render(<WorldMapManager worldMaps={mockWorldMaps} />);

    // Assert
    expect(screen.getByText('World Maps')).toBeTruthy();
  });
});
```

## 📝 Documentation

### Code Documentation
- Add JSDoc comments for complex functions
- Document public APIs
- Include examples in documentation

### README Updates
- Update README when adding major features
- Include setup instructions for new features
- Add screenshots or GIFs when helpful

## 🔍 Code Review Process

### What We Look For
- Code follows project style guidelines
- Tests are included and passing
- Documentation is updated when necessary
- Changes don't break existing functionality
- Performance implications are considered

### Review Steps
1. Automated checks pass (linting, tests, build)
2. Code review by maintainers
3. Address any feedback
4. Merge when approved

## 🚀 Release Process

### Version Management
- Follow semantic versioning
- Update version numbers in package.json
- Tag releases in Git
- Create release notes

### Deployment
- Automated CI/CD handles deployment
- Manual deployments for hotfixes
- Feature flags for gradual rollouts

## 🤖 Community

### Getting Help
- Search existing issues and discussions
- Join our Discord/Slack community
- Check documentation before asking questions

### Ways to Contribute
- Code contributions
- Bug reports and feature requests
- Documentation improvements
- Test new releases
- Share success stories

## 📋 Checklist Before Submitting

- [ ] Code follows style guidelines
- [ ] Tests are added and passing
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Works on all supported platforms
- [ ] Uses existing dependencies when possible
- [ ] Follows commit message conventions

## 📄 Additional Resources

- [React Native Documentation](https://reactnative.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)
- [Jest Testing Framework](https://jestjs.io/)
- [ARKit Documentation](https://developer.apple.com/documentation/arkit/)
- [ARCore Documentation](https://developers.google.com/ar)

## 📞 Contact

- Create an issue on GitHub
- Email: dev@arinspection.com
- Discord: [AR Inspection Platform Community](https://discord.gg/arinspection)

---

Thank you for contributing to AR Inspection Platform! 🎉