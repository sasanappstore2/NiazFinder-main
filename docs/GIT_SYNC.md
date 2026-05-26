# همگام‌سازی با GitHub

Repo: [sasanappstore2/NiazFinder-main](https://github.com/sasanappstore2/NiazFinder-main)

## یک‌بار: ورود به GitHub

در ترمینال پروژه:

```bash
chmod +x scripts/git/push-to-github.sh
./scripts/git/push-to-github.sh
```

یا دستی:

```bash
brew install gh   # اگر نصب نیست
gh auth login -h github.com -p https -w
# با حساب sasanappstore2 وارد شوید (نه zibasazi)
git push -u origin main
```

## بعد از هر commit — push خودکار

- **Hook:** `.git/hooks/post-commit` بعد از هر commit روی `main`، `git push` می‌زند.
- **Cursor:** `git.postCommitCommand: push` — بعد از commit از UI هم push می‌شود.

## Save ≠ Push

ذخیره فایل (Cmd+S) فقط روی دیسک است. برای رفتن به GitHub:

1. Source Control → Stage (+)
2. Commit message بنویسید → Commit
3. Push خودکار با hook / تنظیمات Cursor انجام می‌شود

میانبر: **Cmd+Option+C** (commit) سپس push خودکار.

## خطای Permission denied (zibasazi)

Credential قدیمی در Keychain است. در macOS:

1. Keychain Access → جستجوی `github.com`
2. حذف ورودی مربوط به حساب اشتباه
3. دوباره `gh auth login` با **sasanappstore2**
