# Conductor: Backend

## Project Structure

- `auth/`: Authentication handler + encompassing gateway
- `ticket/`: Feature module implementing ticket CRUD endpoints + Prisma schema, migrations, and database client setup
- `user/`: Feature module implementing user creation and listing all users
- `encore.gen/, .encore/`: Encore-generated code, created by running encore dev (or pnpm dev) (do not edit manually)

## Developer Notes

Run two separate terminals for `Encore` and `Prisma`.

### Encore

#### How to Start Encore Locally:

```bash
cd backend
encore run
```

<!-- a. Get database connection URLs
(if/once Prisma is generated or if there are no `DB_URL` + `SHADOW_URL`):

```bash
cd backend
encore db conn-uri ticket
encore db conn-uri ticket --shadow
``` -->

## Prisma

### Run Prisma Studio Locally

```bash
cd backend
npx prisma studio --schema=ticket/schema.prisma
```

### Seed

```bash
cd backend
npx prisma db seed seed/seed.ts
```
