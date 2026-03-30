# 📝 GIT WORKFLOW dla Antigravity Team

## Branching Strategy

```
main (production ready)
  ↑
  ├─ feature/installer-ui-sandbox (ACTIVE)
  │  ├─ Installers + UI redesign
  │  └─ Sandboxed iframes
  │
  ├─ feature/docs-deployment
  │  └─ Docusaurus setup
  │
  └─ feature/auto-update
     └─ electron-updater integration
```

## Workflow

### 1. Start Feature Branch
```bash
git checkout main
git pull origin main
git checkout -b feature/installer-ui-sandbox
```

### 2. Commit Regularly with Good Messages
```bash
# Format: type(scope): description

# Examples:
git commit -m "feat(installer): add NSIS builder for Windows"
git commit -m "feat(ui): create floating panel system"
git commit -m "feat(sandbox): implement permission-based iframe"
git commit -m "feat(docs): add Docusaurus documentation"
git commit -m "fix(sandbox): fix postMessage origin validation"
git commit -m "chore(deps): update electron to v27"
git commit -m "test(sandbox): add unit tests for security"
git commit -m "docs(README): add setup instructions"
```

### 3. Push and Create PR
```bash
git push origin feature/installer-ui-sandbox

# Create PR via GitHub CLI
gh pr create \
  --title "feat: Complete ZENO v0.2 - Installers, Modern UI, Sandboxed Iframes" \
  --body "
## Summary
Complete implementation with installers, UI redesign, and sandboxed iframe system.

## Changes
- ✅ Multi-platform installers (Windows/Mac/Linux)
- ✅ Modern React-based UI
- ✅ Sandboxed iframe components
- ✅ Complete documentation
- ✅ Auto-update system
- ✅ CI/CD pipeline

## Type
- [ ] Feature
- [x] Bugfix
- [ ] Documentation
- [ ] Performance
- [ ] Security

## Testing
- [ ] Windows tested
- [ ] macOS tested
- [ ] Linux tested
- [ ] Mobile tested
- [ ] Security validated

## Checklist
- [x] Code follows style guidelines
- [x] Tests pass locally
- [x] No new warnings
- [x] Documentation updated
- [x] Changes reviewed
" \
  --base main
```

### 4. Code Review & Feedback
- Respond to comments
- Push fixes to same branch
- Request re-review

### 5. Merge & Deploy
```bash
# Option 1: GitHub UI
# Click "Merge pull request" button

# Option 2: GitHub CLI
gh pr merge feature/installer-ui-sandbox --squash

# After merge:
git checkout main
git pull origin main
git branch -d feature/installer-ui-sandbox
```

### 6. Create Release
```bash
# Tag version
git tag -a v0.2.0 -m "Release v0.2.0 - Installers, UI, Sandbox"
git push origin v0.2.0

# GitHub Actions triggers:
# - Build installers
# - Run tests
# - Deploy docs
# - Create release
# - Upload artifacts
```

---

## Commit Message Types

```
feat:     New feature
fix:      Bug fix
docs:     Documentation only
style:    Formatting, style (no code change)
refactor: Code restructuring (no feature change)
perf:     Performance improvement
test:     Tests only
chore:    Build, deps, config
ci:       CI/CD configuration
security: Security fix
```

---

## Pro Tips

```bash
# 1. Interactive rebase (clean history)
git rebase -i HEAD~5
# Then squash similar commits

# 2. Check what changed
git diff main...feature/installer-ui-sandbox

# 3. View commit log with graph
git log --oneline --graph --all

# 4. Stash work in progress
git stash
git checkout main
# ... later ...
git checkout feature/installer-ui-sandbox
git stash pop

# 5. Amend last commit (before push!)
git commit --amend --no-edit

# 6. Force push (ONLY if local branch)
git push origin feature/installer-ui-sandbox --force-with-lease

# 7. Check branch status
git status

# 8. See who changed what
git blame src/components/SandboxPanel.tsx

# 9. Cherry-pick specific commits
git cherry-pick abc123

# 10. Revert recent commit
git revert HEAD
```

---

## Code Review Checklist

Before merging, verify:

- [ ] Code follows TypeScript strict mode
- [ ] All tests pass
- [ ] No console.error in production code
- [ ] Commits are atomic (one feature per commit)
- [ ] Commit messages are clear
- [ ] No merge conflicts
- [ ] Documentation is updated
- [ ] No hardcoded secrets/passwords
- [ ] Performance acceptable
- [ ] Accessibility maintained
- [ ] Security best practices followed
- [ ] No unused imports/variables

---

## Emergency Procedures

### Rollback Recent Merge
```bash
git revert -m 1 abc123  # Commits that revert the merge
git push origin main
```

### Fix Broken Main
```bash
git checkout main
git reset --hard abc123  # Go back to known good commit
git push --force-with-lease origin main
```

### Recover Lost Commits
```bash
git reflog  # Find commit SHA
git cherry-pick abc123
```

---

**Happy coding! 🚀**