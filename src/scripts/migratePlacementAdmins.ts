import fs from "fs";
import path from "path";
import admin from "firebase-admin";

const SERVICE_ACCOUNT_PATH = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
const SERVICE_ACCOUNT_JSON = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;

if (!SERVICE_ACCOUNT_PATH && !SERVICE_ACCOUNT_JSON) {
  throw new Error(
    "Provide either FIREBASE_SERVICE_ACCOUNT_PATH or FIREBASE_SERVICE_ACCOUNT_JSON to initialize the Admin SDK"
  );
}

const credential = SERVICE_ACCOUNT_JSON
  ? JSON.parse(SERVICE_ACCOUNT_JSON)
  : JSON.parse(fs.readFileSync(path.resolve(SERVICE_ACCOUNT_PATH!), "utf-8"));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(credential),
  });
}

const db = admin.firestore();
const FIELD_VALUE = admin.firestore.FieldValue;
const MAX_BATCH_WRITES = 450;

const LEGACY_COLLECTIONS = {
  colleges: "colleges",
};

const SUBCOLLECTIONS = {
  institutionAdmins: "institutionAdmins",
  placementAdmins: "placementAdmins",
  drives: "drives",
  students: "students",
  applications: "applications",
  offers: "offers",
};

const TARGET_COLLECTIONS = {
  placementAdmins: "placementAdmins",
  drives: "drives",
  applications: "applications",
  offers: "offers",
};

const MIGRATION_MARKER = "flattenedFromNestedLegacy";

type PlacementContext = {
  collegeId: string;
  institutionAdminId: string;
  placementAdminId: string;
  collegeRef: admin.firestore.DocumentReference<admin.firestore.DocumentData>;
  placementDoc: admin.firestore.QueryDocumentSnapshot<admin.firestore.DocumentData>;
};

const generateDepartmentCode = (department?: string, course?: string) => {
  const source = (department ?? course ?? "PLACEMENT")
    .toString()
    .toUpperCase()
    .replace(/[^A-Z]/g, "");
  const prefix = (source.slice(0, 3) || "PLC").padEnd(3, "X");
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${prefix}${suffix}`;
};

const stripUndef = (data: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined)) as Record<string, unknown>;

const commitBatch = async (batch: admin.firestore.WriteBatch, writes: number) => {
  if (writes === 0) return { batch, writes };
  await batch.commit();
  return { batch: db.batch(), writes: 0 };
};

async function forEachPlacementAdmin(callback: (context: PlacementContext) => Promise<void>) {
  const collegesSnapshot = await db.collection(LEGACY_COLLECTIONS.colleges).get();
  for (const collegeDoc of collegesSnapshot.docs) {
    const institutionAdminsSnapshot = await collegeDoc
      .ref
      .collection(SUBCOLLECTIONS.institutionAdmins)
      .get();
    for (const institutionDoc of institutionAdminsSnapshot.docs) {
      const placementAdminsSnapshot = await institutionDoc
        .ref
        .collection(SUBCOLLECTIONS.placementAdmins)
        .get();
      for (const placementDoc of placementAdminsSnapshot.docs) {
        await callback({
          collegeId: collegeDoc.id,
          institutionAdminId: institutionDoc.id,
          placementAdminId: placementDoc.id,
          collegeRef: collegeDoc.ref,
          placementDoc,
        });
      }
    }
  }
}

async function migratePlacementAdmins() {
  let batch = db.batch();
  let writesInBatch = 0;
  let migrated = 0;

  await forEachPlacementAdmin(async (context) => {
    if (writesInBatch + 3 > MAX_BATCH_WRITES) {
      ({ batch, writes: writesInBatch } = await commitBatch(batch, writesInBatch));
    }

    const data = context.placementDoc.data();
    const sanitized = stripUndef({
      ...data,
      collegeId: context.collegeId,
      institutionAdminId: context.institutionAdminId,
      departmentCode:
        data.departmentCode ?? generateDepartmentCode(data.department as string | undefined, data.course as string | undefined),
      [MIGRATION_MARKER]: true,
      updatedAt: FIELD_VALUE.serverTimestamp(),
    });

    batch.set(db.collection(TARGET_COLLECTIONS.placementAdmins).doc(context.placementAdminId), sanitized, { merge: true });
    batch.set(
      context.collegeRef,
      {
        meta: {
          placementAdminCount: FIELD_VALUE.increment(1),
        },
      },
      { merge: true }
    );
    batch.delete(context.placementDoc.ref);

    writesInBatch += 3;
    migrated += 1;
  });

  await commitBatch(batch, writesInBatch);
  console.log(`Placement admins flattened: ${migrated}`);
  return migrated;
}

async function migrateDrives() {
  let batch = db.batch();
  let writesInBatch = 0;
  let migrated = 0;

  await forEachPlacementAdmin(async (context) => {
    const drivesSnapshot = await context.placementDoc
      .ref
      .collection(SUBCOLLECTIONS.drives)
      .get();

    for (const driveDoc of drivesSnapshot.docs) {
      if (writesInBatch + 2 > MAX_BATCH_WRITES) {
        ({ batch, writes: writesInBatch } = await commitBatch(batch, writesInBatch));
      }

      const sanitized = stripUndef({
        ...driveDoc.data(),
        collegeId: context.collegeId,
        institutionAdminId: context.institutionAdminId,
        placementAdminId: context.placementAdminId,
        [MIGRATION_MARKER]: true,
        updatedAt: FIELD_VALUE.serverTimestamp(),
      });

      batch.set(db.collection(TARGET_COLLECTIONS.drives).doc(driveDoc.id), sanitized, { merge: true });
      batch.delete(driveDoc.ref);

      writesInBatch += 2;
      migrated += 1;
    }
  });

  await commitBatch(batch, writesInBatch);
  console.log(`Drives flattened: ${migrated}`);
  return migrated;
}

async function migrateApplications() {
  let batch = db.batch();
  let writesInBatch = 0;
  let migrated = 0;

  await forEachPlacementAdmin(async (context) => {
    const studentsSnapshot = await context.placementDoc
      .ref
      .collection(SUBCOLLECTIONS.students)
      .get();

    for (const studentDoc of studentsSnapshot.docs) {
      const applicationsSnapshot = await studentDoc
        .ref
        .collection(SUBCOLLECTIONS.applications)
        .get();

      for (const applicationDoc of applicationsSnapshot.docs) {
        if (writesInBatch + 2 > MAX_BATCH_WRITES) {
          ({ batch, writes: writesInBatch } = await commitBatch(batch, writesInBatch));
        }

        const sanitized = stripUndef({
          ...applicationDoc.data(),
          collegeId: context.collegeId,
          institutionAdminId: context.institutionAdminId,
          placementAdminId: context.placementAdminId,
          studentId: studentDoc.id,
          [MIGRATION_MARKER]: true,
          updatedAt: FIELD_VALUE.serverTimestamp(),
        });

        batch.set(db.collection(TARGET_COLLECTIONS.applications).doc(applicationDoc.id), sanitized, { merge: true });
        batch.delete(applicationDoc.ref);

        writesInBatch += 2;
        migrated += 1;
      }
    }
  });

  await commitBatch(batch, writesInBatch);
  console.log(`Applications flattened: ${migrated}`);
  return migrated;
}

async function migrateOffers() {
  let batch = db.batch();
  let writesInBatch = 0;
  let migrated = 0;

  await forEachPlacementAdmin(async (context) => {
    const studentsSnapshot = await context.placementDoc
      .ref
      .collection(SUBCOLLECTIONS.students)
      .get();

    for (const studentDoc of studentsSnapshot.docs) {
      const offersSnapshot = await studentDoc
        .ref
        .collection(SUBCOLLECTIONS.offers)
        .get();

      for (const offerDoc of offersSnapshot.docs) {
        if (writesInBatch + 2 > MAX_BATCH_WRITES) {
          ({ batch, writes: writesInBatch } = await commitBatch(batch, writesInBatch));
        }

        const sanitized = stripUndef({
          ...offerDoc.data(),
          collegeId: context.collegeId,
          institutionAdminId: context.institutionAdminId,
          placementAdminId: context.placementAdminId,
          studentId: studentDoc.id,
          [MIGRATION_MARKER]: true,
          updatedAt: FIELD_VALUE.serverTimestamp(),
        });

        batch.set(db.collection(TARGET_COLLECTIONS.offers).doc(offerDoc.id), sanitized, { merge: true });
        batch.delete(offerDoc.ref);

        writesInBatch += 2;
        migrated += 1;
      }
    }
  });

  await commitBatch(batch, writesInBatch);
  console.log(`Offers flattened: ${migrated}`);
  return migrated;
}

(async () => {
  try {
    console.log("Flattening hierarchical Firestore data to top-level collections...");
    await migratePlacementAdmins();
    await migrateDrives();
    await migrateApplications();
    await migrateOffers();
    console.log("Migration completed. Double-check legacy subcollections before deleting them.");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
})();
