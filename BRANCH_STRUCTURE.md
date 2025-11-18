# ARTY™ Branch Structure and Deployment Strategy

## Overview
This repository supports multiple deployment types. To keep deployments clean and organized, each deployment type should have its own dedicated branch.

## Branch Structure

### Main Branches
- **`main`** - Production-ready code, stable releases
- **`develop`** - Development integration branch

### Deployment Branches
Each deployment type has a dedicated branch to maintain clean, deployment-specific configurations:

1. **`deploy/web`** - Web application deployment (Express/Node.js)
   - Contains: Node.js Express server, REST API, dashboard
   - Target: Traditional web hosting (Render, Railway, AWS, Azure)
   
2. **`deploy/bubble`** - Bubble.io no-code deployment
   - Contains: CSV schemas, prompts, Bubble setup documentation
   - Target: Bubble.io platform
   
3. **`deploy/flutter`** - Flutter mobile app deployment
   - Contains: Dart models, Flutter project structure, mobile UI
   - Target: iOS/Android app stores, MDM distribution
   
4. **`deploy/docker`** - Docker containerized deployment
   - Contains: Dockerfiles, docker-compose.yml, nginx configs
   - Target: Container orchestration (Docker, Kubernetes, ECS)

## Creating Deployment Branches

Run this script to create all deployment branches from the current clean codebase:

```bash
#!/bin/bash
# create_deployment_branches.sh

# Ensure we're on the latest clean code
git checkout main
git pull origin main

# Create web deployment branch
git checkout -b deploy/web
git push -u origin deploy/web

# Create bubble deployment branch
git checkout main
git checkout -b deploy/bubble
git push -u origin deploy/bubble

# Create flutter deployment branch
git checkout main
git checkout -b deploy/flutter
git push -u origin deploy/flutter

# Create docker deployment branch
git checkout main
git checkout -b deploy/docker
git push -u origin deploy/docker

# Return to main branch
git checkout main

echo "✅ All deployment branches created successfully!"
echo ""
echo "Branches created:"
echo "  - deploy/web"
echo "  - deploy/bubble"
echo "  - deploy/flutter"
echo "  - deploy/docker"
```

Save this as `create_deployment_branches.sh` and run:
```bash
chmod +x create_deployment_branches.sh
./create_deployment_branches.sh
```

## Workflow

### For New Features
1. Create feature branch from `develop`
2. Implement feature
3. Merge to `develop` for testing
4. When stable, merge to `main`
5. Cherry-pick or merge specific changes to deployment branches as needed

### For Deployment-Specific Changes
1. Checkout the specific deployment branch (e.g., `deploy/web`)
2. Make deployment-specific changes
3. Commit and push to that branch
4. Deploy from that branch to the target platform

### For Bug Fixes
1. Fix on `main` or `develop`
2. Merge fix to all affected deployment branches

## Deployment Commands

### Web Deployment
```bash
git checkout deploy/web
./deploy.sh web
```

### Bubble Deployment
```bash
git checkout deploy/bubble
# Follow BUBBLE_SETUP.md instructions
```

### Flutter Deployment
```bash
git checkout deploy/flutter
./deploy.sh flutter
flutter build apk --release
```

### Docker Deployment
```bash
git checkout deploy/docker
./deploy.sh docker
docker-compose up -d
```

## Benefits of This Structure

1. **Clean Separation**: Each deployment type has its own clean workspace
2. **No Conflicts**: Deployment-specific files don't pollute other deployment types
3. **Easy Rollback**: Can revert a specific deployment without affecting others
4. **Parallel Development**: Teams can work on different deployments simultaneously
5. **Selective Updates**: Choose which features go to which deployment
6. **Clear History**: Git history shows exactly what changed for each deployment type

## Branch Protection Rules (Recommended)

### For `main` branch:
- Require pull request reviews
- Require status checks to pass
- Require branches to be up to date
- Include administrators in restrictions

### For `deploy/*` branches:
- Require pull request reviews (optional)
- Allow force pushes for deployment automation
- Allow deletions (for recreation if needed)

## Continuous Integration

Each deployment branch should have its own CI/CD pipeline:

```yaml
# .github/workflows/deploy-web.yml
name: Deploy Web
on:
  push:
    branches: [deploy/web]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Render
        run: |
          # Deployment commands here
```

Create similar workflows for:
- `.github/workflows/deploy-bubble.yml`
- `.github/workflows/deploy-flutter.yml`
- `.github/workflows/deploy-docker.yml`

## Maintenance

### Syncing Deployment Branches with Main
When main is updated with core changes that should propagate to all deployments:

```bash
# Update web deployment
git checkout deploy/web
git merge main
git push origin deploy/web

# Update bubble deployment
git checkout deploy/bubble
git merge main
git push origin deploy/bubble

# Repeat for flutter and docker
```

### Cleaning Up Old Deployment Branches
If a deployment type is deprecated:

```bash
git push origin --delete deploy/deprecated-type
git branch -D deploy/deprecated-type
```

## Quick Reference

| Deployment Type | Branch | Command | Target |
|----------------|--------|---------|--------|
| Web | `deploy/web` | `./deploy.sh web` | Render/Railway/AWS |
| Bubble | `deploy/bubble` | Manual setup | Bubble.io |
| Flutter | `deploy/flutter` | `./deploy.sh flutter` | App Stores |
| Docker | `deploy/docker` | `./deploy.sh docker` | Container hosts |

## Notes

- Always test on deployment branches before deploying to production
- Keep deployment branches synchronized with main for security updates
- Document any deployment-specific configurations in branch READMEs
- Use tags for production releases on each deployment branch
