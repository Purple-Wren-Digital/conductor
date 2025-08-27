## Conductor: Backend

### Developer Notes

Install `encore`:

- **macOS:** `brew install encoredev/tap/encore`
- **Linux:** `curl -L https://encore.dev/install.sh | bash`
- **Windows:** `iwr https://encore.dev/install.ps1 | iex`

1. From repo root:

```bash
# no need ot create an entirely separate app
encore auth signup
encore auth login
encore app link conductor-ee92
```

2. Then, run `cd backend`
3. Run two separate terminals for `Encore` and `Prisma`:

#### Start `Encore` Locally

```bash
encore run
```

- Select the `Development Dashboard URL` listed in the terminal once Encore is running to view/test each endpoint

4. Then refresh DB URIs and re-run Prisma

### Run `Prisma Studio` Locally

```bash
npm run studio
```

- Select the url (`http://localhost:<PORT>`) listed in the terminal once Prisma Studio is running to see changes in real time.
- Remaining scripts in `package.json`
