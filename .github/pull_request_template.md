## Summary

Explain **what** this PR does in 2–3 sentences.

- Focus on the user-facing impact (candidates, admins, self-hosters).
- Mention the main area: report submission, rate limiting, companies listing, admin panel, etc.

---

## Related issue(s)

Opening an issue before submitting a PR is **required**.

Link the corresponding issue using one of the formats below:

- Closes #123
- Fixes #123
- Resolves #123
- Related to #123

---

## Changes in detail

List the key changes introduced by this PR.

If you touched any of the following, please call it out explicitly:

- Rate limiting / IP hashing
- Prisma schema / migrations
- Admin auth / sessions / cookies
- Security-relevant code paths (validation, CSRF, logging, etc.)

- [ ] ...

---

## Implementation notes (optional)

- Design decisions and trade-offs:
- Notable patterns or utilities introduced:
- Any deviations from existing conventions (and why):

---

## Screenshots / UI changes (if any)

- Not applicable (no UI changes)
- or: attach before/after screenshots or short recordings

---

## Testing

Describe **how** you tested this change.

Locally, please prefer the project scripts:

```bash
npm run lint
npm run check
npm run test
# npm run test:coverage
# npm run test:e2e
```

**What have you actually run for this PR?**

- [ ] `npm run lint`
- [ ] `npm run check`
- [ ] `npm run test`
- [ ] `npm run test:coverage`
- [ ] `npm run test:e2e`
- [ ] `npm run verify`
- [ ] Other (describe above)

---

## Backwards compatibility / migration

**Prisma migration?**

- [ ] Yes (describe below)
- [ ] No

**Data backfill or manual admin steps?**

- [ ] Yes (describe below)
- [ ] No

**Migration / manual steps notes**

- Requires `prisma migrate dev` / `prisma migrate deploy`
- Additional steps:
  - ...
  - ...

---

## Security / privacy considerations

Does this PR affect any of the following?

- Rate limiting logic
- IP handling or logging
- Error logging / sensitive data
- Privacy guarantees described in `PRIVACY.md`

If yes, explain briefly and confirm alignment with `PRIVACY.md`.

- Impact:
- Alignment with PRIVACY.md:
- Additional notes:

---

## Developer experience (DX)

For changes that affect local setup or DX:

- README changes:
- Dev scripts impact (`scripts/dev/setup-db.sh`, `scripts/dev/seed-dummy-reports.js`):
- Other DX notes:

---

## Checklist

- [ ] PR scope is focused (no unrelated changes).
- [ ] Code follows the existing style (TypeScript, strict checks, JSDoc where relevant).
- [ ] New exported functions in `src/lib/**` or `src/app/**/_lib/**` include JSDoc.
- [ ] Tests and lints pass locally using the project scripts.
- [ ] Documentation (`README` / `PRIVACY` / comments) has been updated if behaviour changed.
