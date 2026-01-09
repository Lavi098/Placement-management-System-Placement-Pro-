# Maintenance scripts

## Placement admin migration

Run `src/scripts/migratePlacementAdmins.ts` once to move the legacy root-level `placementAdmins` documents into the new tenant-scoped hierarchy under `/colleges/{collegeId}/placementAdmins` while also bumping `/colleges/{collegeId}/meta.placementAdminCount`.

### Environment

Make sure you supply Firebase admin credentials via one of the following environment variables:

- `FIREBASE_SERVICE_ACCOUNT_PATH`: path to a JSON service account file.
- `FIREBASE_SERVICE_ACCOUNT_JSON`: raw JSON payload (useful in CI).

### Execution

Install `ts-node` (if not already available) and run:

```bash
npm install -g ts-node
ts-node src/scripts/migratePlacementAdmins.ts
```

Or compile via `tsc` and run the emitted JS with `node`.

After the script finishes, verify Firestore to ensure each college has the new `placementAdmins` subcollection and the legacy root documents were deleted. You can rerun safely only if you first delete `/colleges/{collegeId}/placementAdmins/{adminId}` entries you expect to migrate again.
