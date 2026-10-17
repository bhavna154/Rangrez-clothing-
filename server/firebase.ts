import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';

/**
 * RANGREZ Atelier - Firebase Admin SDK & Cloud Firestore Service
 *
 * Requirements:
 * 1. Accept service account JSON in ONE environment variable named FIREBASE_SERVICE_ACCOUNT_JSON,
 *    parse on server, and fix private_key newlines automatically (\n -> real newlines, trim quotes/spaces).
 *    If set, ignore the three separate variables.
 * 2. At startup, check which credentials are present and log only their names and lengths, never values.
 *    If client email or private key is missing or invalid, log exactly which one, and report in Setup Status.
 * 3. Show green "Firestore connected" badge ONLY after real test write and read to "healthcheck" collection succeeds.
 *    Otherwise show real error. Never print "Seeded products into Firestore" unless write really succeeded.
 * 4. Never silently fall back to local file when Firebase variables are set. Show error instead.
 */

export interface StoredImageDoc {
  id: string;
  fileName: string;
  contentType: string;
  base64: string;
  size: number;
  createdAt: string;
}

export interface CredentialDiagnostics {
  sourceName: string;
  sourceLength?: number;
  projectIdPresent: boolean;
  projectIdLength?: number;
  clientEmailPresent: boolean;
  clientEmailValid: boolean;
  clientEmailLength?: number;
  privateKeyPresent: boolean;
  privateKeyValid: boolean;
  privateKeyLength?: number;
  missingOrInvalidFields: string[];
}

export interface FirebaseParsedCredentials {
  source: 'FIREBASE_SERVICE_ACCOUNT_JSON' | 'SEPARATE_ENV_VARS' | 'NONE';
  projectId: string;
  clientEmail: string;
  privateKey: string;
  diagnostics: CredentialDiagnostics;
}

let adminApp: App | null = null;
let firestoreDb: Firestore | null = null;

let cachedHealthcheck: {
  testedAt: number;
  success: boolean;
  error?: string;
} | null = null;

/**
 * Automatically repairs private_key newlines:
 * - Strips leading/trailing quotes (single, double, or backticks)
 * - Replaces literal 2-character escape sequences '\n' or '\r\n' with actual newlines
 * - Trims extraneous whitespace
 */
export function cleanPrivateKey(rawKey: unknown): string {
  if (typeof rawKey !== 'string') return '';
  let key = rawKey.trim();

  // Strip surrounding quotes if wrapped in .env
  while (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'")) ||
    (key.startsWith('`') && key.endsWith('`'))
  ) {
    key = key.slice(1, -1).trim();
  }

  // Replace literal '\n' and '\r\n' sequences with real newlines
  key = key
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  // Handle double-escaped newlines if present
  key = key.replace(/\\\\n/g, '\n');

  return key.trim();
}

/**
 * Validates service account client email format.
 */
function isValidClientEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  return trimmed.length > 5 && trimmed.includes('@') && trimmed.includes('.');
}

/**
 * Validates PEM format of private key.
 */
function isValidPrivateKey(key: string): boolean {
  if (!key || typeof key !== 'string') return false;
  const cleaned = cleanPrivateKey(key);
  const hasBegin =
    cleaned.includes('-----BEGIN PRIVATE KEY-----') ||
    cleaned.includes('-----BEGIN RSA PRIVATE KEY-----');
  const hasEnd =
    cleaned.includes('-----END PRIVATE KEY-----') ||
    cleaned.includes('-----END RSA PRIVATE KEY-----');
  return hasBegin && hasEnd && cleaned.length > 200;
}

/**
 * Checks which credentials are present and parses them.
 * Prioritizes FIREBASE_SERVICE_ACCOUNT_JSON over the three separate variables.
 */
export function inspectFirebaseCredentials(): FirebaseParsedCredentials {
  const serviceAccountJsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim();

  // 1. If FIREBASE_SERVICE_ACCOUNT_JSON is set, parse it and ignore separate variables
  if (serviceAccountJsonRaw) {
    let cleanJson = serviceAccountJsonRaw;
    while (
      (cleanJson.startsWith('"') && cleanJson.endsWith('"')) ||
      (cleanJson.startsWith("'") && cleanJson.endsWith("'"))
    ) {
      cleanJson = cleanJson.slice(1, -1).trim();
    }

    let parsed: any = null;
    try {
      parsed = JSON.parse(cleanJson);
    } catch (e: any) {
      return {
        source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
        projectId: '',
        clientEmail: '',
        privateKey: '',
        diagnostics: {
          sourceName: 'FIREBASE_SERVICE_ACCOUNT_JSON',
          sourceLength: serviceAccountJsonRaw.length,
          projectIdPresent: false,
          clientEmailPresent: false,
          clientEmailValid: false,
          privateKeyPresent: false,
          privateKeyValid: false,
          missingOrInvalidFields: [
            `FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (${e?.message || 'parse error'})`
          ]
        }
      };
    }

    const projectId = (parsed.project_id || parsed.projectId || parsed.project_name || '').trim();
    const rawClientEmail = (parsed.client_email || parsed.clientEmail || '').trim();
    const rawPrivateKey = parsed.private_key || parsed.privateKey || '';
    const cleanedKey = cleanPrivateKey(rawPrivateKey);

    const clientEmailValid = isValidClientEmail(rawClientEmail);
    const privateKeyValid = isValidPrivateKey(cleanedKey);

    const missingOrInvalidFields: string[] = [];
    if (!projectId) {
      missingOrInvalidFields.push('project_id is missing in FIREBASE_SERVICE_ACCOUNT_JSON');
    }
    if (!rawClientEmail) {
      missingOrInvalidFields.push('client_email is missing in FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (!clientEmailValid) {
      missingOrInvalidFields.push(
        'client_email in FIREBASE_SERVICE_ACCOUNT_JSON is invalid (must be a valid service account email)'
      );
    }
    if (!rawPrivateKey) {
      missingOrInvalidFields.push('private_key is missing in FIREBASE_SERVICE_ACCOUNT_JSON');
    } else if (!privateKeyValid) {
      missingOrInvalidFields.push(
        'private_key in FIREBASE_SERVICE_ACCOUNT_JSON is invalid (must include "-----BEGIN PRIVATE KEY-----" and valid line breaks)'
      );
    }

    return {
      source: 'FIREBASE_SERVICE_ACCOUNT_JSON',
      projectId,
      clientEmail: rawClientEmail,
      privateKey: cleanedKey,
      diagnostics: {
        sourceName: 'FIREBASE_SERVICE_ACCOUNT_JSON',
        sourceLength: serviceAccountJsonRaw.length,
        projectIdPresent: Boolean(projectId),
        projectIdLength: projectId.length,
        clientEmailPresent: Boolean(rawClientEmail),
        clientEmailValid,
        clientEmailLength: rawClientEmail.length,
        privateKeyPresent: Boolean(rawPrivateKey),
        privateKeyValid,
        privateKeyLength: cleanedKey.length,
        missingOrInvalidFields
      }
    };
  }

  // 2. Fall back to separate environment variables
  const sepProjectId = process.env.FIREBASE_PROJECT_ID?.trim() || '';
  const sepClientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || '';
  const sepRawKey = process.env.FIREBASE_PRIVATE_KEY?.trim() || '';

  const anySeparateSet = Boolean(sepProjectId || sepClientEmail || sepRawKey);
  if (!anySeparateSet) {
    return {
      source: 'NONE',
      projectId: '',
      clientEmail: '',
      privateKey: '',
      diagnostics: {
        sourceName: 'NONE',
        projectIdPresent: false,
        clientEmailPresent: false,
        clientEmailValid: false,
        privateKeyPresent: false,
        privateKeyValid: false,
        missingOrInvalidFields: []
      }
    };
  }

  const cleanedKey = cleanPrivateKey(sepRawKey);
  const clientEmailValid = isValidClientEmail(sepClientEmail);
  const privateKeyValid = isValidPrivateKey(cleanedKey);

  const missingOrInvalidFields: string[] = [];
  if (!sepProjectId) {
    missingOrInvalidFields.push('FIREBASE_PROJECT_ID is missing or empty');
  }
  if (!sepClientEmail) {
    missingOrInvalidFields.push('FIREBASE_CLIENT_EMAIL is missing or empty');
  } else if (!clientEmailValid) {
    missingOrInvalidFields.push(
      'FIREBASE_CLIENT_EMAIL is invalid (must be a valid service account email)'
    );
  }
  if (!sepRawKey) {
    missingOrInvalidFields.push('FIREBASE_PRIVATE_KEY is missing or empty');
  } else if (!privateKeyValid) {
    missingOrInvalidFields.push(
      'FIREBASE_PRIVATE_KEY is invalid (must include "-----BEGIN PRIVATE KEY-----" and valid line breaks)'
    );
  }

  return {
    source: 'SEPARATE_ENV_VARS',
    projectId: sepProjectId,
    clientEmail: sepClientEmail,
    privateKey: cleanedKey,
    diagnostics: {
      sourceName: 'SEPARATE_ENV_VARS',
      projectIdPresent: Boolean(sepProjectId),
      projectIdLength: sepProjectId.length,
      clientEmailPresent: Boolean(sepClientEmail),
      clientEmailValid,
      clientEmailLength: sepClientEmail.length,
      privateKeyPresent: Boolean(sepRawKey),
      privateKeyValid,
      privateKeyLength: cleanedKey.length,
      missingOrInvalidFields
    }
  };
}

/**
 * At startup, check which credentials are present and log ONLY their names and lengths, NEVER their values.
 * If client email or private key is missing or invalid, log exactly which one.
 */
export function logCredentialStartupDiagnostics(): void {
  const creds = inspectFirebaseCredentials();

  if (creds.source === 'FIREBASE_SERVICE_ACCOUNT_JSON') {
    console.log(
      `[Firebase] Credential check: FIREBASE_SERVICE_ACCOUNT_JSON detected (length: ${creds.diagnostics.sourceLength ?? 0} chars). Separate variables ignored.`
    );
    console.log(
      `[Firebase] Parsed fields: project_id (length: ${creds.diagnostics.projectIdLength ?? 0}), client_email (length: ${creds.diagnostics.clientEmailLength ?? 0}), private_key (length: ${creds.diagnostics.privateKeyLength ?? 0})`
    );
  } else if (creds.source === 'SEPARATE_ENV_VARS') {
    console.log(
      `[Firebase] Credential check: Separate environment variables detected.`
    );
    console.log(
      `[Firebase] Variable lengths: FIREBASE_PROJECT_ID (length: ${creds.diagnostics.projectIdLength ?? 0}), FIREBASE_CLIENT_EMAIL (length: ${creds.diagnostics.clientEmailLength ?? 0}), FIREBASE_PRIVATE_KEY (length: ${creds.diagnostics.privateKeyLength ?? 0})`
    );
  } else {
    console.log('[Firebase] Credential check: No Firebase variables configured. Running on local data store.');
    return;
  }

  if (creds.diagnostics.missingOrInvalidFields.length > 0) {
    for (const msg of creds.diagnostics.missingOrInvalidFields) {
      console.error(`[Firebase] Credential validation failure: ${msg}`);
    }
  } else {
    console.log('[Firebase] Credential check: All credential fields are structurally valid.');
  }
}

/**
 * Checks if Firebase variables are present in the environment.
 */
export function isFirebaseConfigured(): boolean {
  const creds = inspectFirebaseCredentials();
  return creds.source !== 'NONE';
}

/**
 * Initializes the Firebase Admin SDK using verified credentials.
 */
export function initFirebase(): {
  app: App | null;
  db: Firestore | null;
  isReady: boolean;
  error?: string;
} {
  if (adminApp && firestoreDb) {
    return { app: adminApp, db: firestoreDb, isReady: true };
  }

  const creds = inspectFirebaseCredentials();
  if (creds.source === 'NONE') {
    return { app: null, db: null, isReady: false, error: 'No Firebase credentials configured in environment' };
  }

  if (creds.diagnostics.missingOrInvalidFields.length > 0) {
    return {
      app: null,
      db: null,
      isReady: false,
      error: creds.diagnostics.missingOrInvalidFields.join('; ')
    };
  }

  try {
    if (getApps().length === 0) {
      adminApp = initializeApp({
        credential: cert({
          projectId: creds.projectId,
          clientEmail: creds.clientEmail,
          privateKey: creds.privateKey
        })
      });
    } else {
      adminApp = getApps()[0];
    }

    firestoreDb = getFirestore(adminApp);
    firestoreDb.settings({ ignoreUndefinedProperties: true });

    return { app: adminApp, db: firestoreDb, isReady: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    console.error('[Firebase Admin] Initialization error:', errorMsg);
    return { app: null, db: null, isReady: false, error: errorMsg };
  }
}

/**
 * Live test write and read to the "healthcheck" collection.
 * The green "Firestore connected" badge is shown ONLY after this succeeds.
 * Otherwise returns the real error.
 */
export async function verifyFirestoreConnection(forceRecheck = false): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!forceRecheck && cachedHealthcheck && Date.now() - cachedHealthcheck.testedAt < 30000) {
    return {
      success: cachedHealthcheck.success,
      error: cachedHealthcheck.error
    };
  }

  const creds = inspectFirebaseCredentials();
  if (creds.source === 'NONE') {
    cachedHealthcheck = {
      testedAt: Date.now(),
      success: false,
      error: 'No Firebase credentials configured in environment'
    };
    return cachedHealthcheck;
  }

  if (creds.diagnostics.missingOrInvalidFields.length > 0) {
    const errorMsg = `Credential error: ${creds.diagnostics.missingOrInvalidFields.join('; ')}`;
    cachedHealthcheck = {
      testedAt: Date.now(),
      success: false,
      error: errorMsg
    };
    return cachedHealthcheck;
  }

  const initResult = initFirebase();
  if (!initResult.db || !initResult.isReady) {
    const errorMsg = initResult.error || 'Firebase Admin SDK initialization failed';
    cachedHealthcheck = {
      testedAt: Date.now(),
      success: false,
      error: errorMsg
    };
    return cachedHealthcheck;
  }

  try {
    const db = initResult.db;
    const healthRef = db.collection('healthcheck').doc('ping');
    const testPayload = {
      ping: 'ok',
      timestamp: new Date().toISOString(),
      service: 'RANGREZ Atelier Server'
    };

    // 1. Live write test
    await healthRef.set(testPayload);

    // 2. Live read test
    const snap = await healthRef.get();
    if (!snap.exists) {
      throw new Error('Test document write succeeded, but verification read returned an empty document.');
    }

    cachedHealthcheck = {
      testedAt: Date.now(),
      success: true
    };
    console.log('[Firebase] Cloud Firestore live write/read to "healthcheck" collection succeeded.');
    return { success: true };
  } catch (err: any) {
    const errorMsg = err?.message || String(err);
    cachedHealthcheck = {
      testedAt: Date.now(),
      success: false,
      error: errorMsg
    };
    console.error(`[Firebase] Cloud Firestore live healthcheck FAILED: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * Returns latest healthcheck status if available.
 */
export function getCachedFirestoreHealth(): { success: boolean; error?: string } | null {
  if (!cachedHealthcheck) return null;
  return { success: cachedHealthcheck.success, error: cachedHealthcheck.error };
}

// -------------------------------------------------------------
// Cloud Firestore Data Operations (Products, Orders, Customers, Coupons, Settings)
// -------------------------------------------------------------

export async function fetchAllFromFirestore<T>(collectionName: string): Promise<T[]> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return [];

  try {
    const snapshot = await db.collection(collectionName).get();
    return snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as T));
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to fetch collection "${collectionName}":`, err?.message || err);
    throw err;
  }
}

/**
 * Strips sensitive commercial data (cost prices, margins, profits, private notes)
 * from product documents before persisting to Firestore, since products are publicly readable.
 */
function sanitizeProductForPublicFirestore(product: any): any {
  if (!product || typeof product !== 'object') return product;
  const clone = { ...product };

  const sensitiveKeys = [
    'costPrice', 'cost_price', 'cost', 'cogs',
    'margin', 'margins', 'profit', 'profitMargin',
    'privateNotes', 'internalNotes', 'adminNotes', 'notes',
    'supplierInfo', 'vendorPrice', 'supplier', 'vendor'
  ];

  for (const key of sensitiveKeys) {
    delete clone[key];
  }

  if (Array.isArray(clone.variants)) {
    clone.variants = clone.variants.map((v: any) => {
      if (typeof v === 'object' && v !== null) {
        const vClone = { ...v };
        for (const key of sensitiveKeys) {
          delete vClone[key];
        }
        return vClone;
      }
      return v;
    });
  }

  return clone;
}

export async function saveToFirestore(collectionName: string, docId: string, data: any): Promise<boolean> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return false;

  try {
    let payload = data;
    if (collectionName === 'products') {
      payload = sanitizeProductForPublicFirestore(data);
    }

    // Sanitize data: remove undefined values which Firestore rejects
    const sanitized = JSON.parse(JSON.stringify(payload));
    await db.collection(collectionName).doc(docId).set(sanitized, { merge: true });
    return true;
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to save doc "${docId}" in "${collectionName}":`, err?.message || err);
    return false;
  }
}

export async function deleteFromFirestore(collectionName: string, docId: string): Promise<boolean> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return false;

  try {
    await db.collection(collectionName).doc(docId).delete();
    return true;
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to delete doc "${docId}" in "${collectionName}":`, err?.message || err);
    return false;
  }
}

export async function getDocFromFirestore<T>(collectionName: string, docId: string): Promise<T | null> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return null;

  try {
    const docSnap = await db.collection(collectionName).doc(docId).get();
    if (docSnap.exists) {
      return { ...docSnap.data(), id: docSnap.id } as T;
    }
    return null;
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to get doc "${docId}" in "${collectionName}":`, err?.message || err);
    return null;
  }
}

// -------------------------------------------------------------
// Cloud Firestore Image Storage (Zero Firebase Storage dependency)
// Stores images directly as base64 documents in the 'images' collection
// -------------------------------------------------------------

export async function saveImageToFirestore(
  id: string,
  fileName: string,
  contentType: string,
  base64: string,
  size: number
): Promise<string | null> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return null;

  try {
    const docData: StoredImageDoc = {
      id,
      fileName,
      contentType,
      base64,
      size,
      createdAt: new Date().toISOString()
    };
    await db.collection('images').doc(id).set(docData, { merge: true });
    return `/api/images/${id}`;
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to save image "${id}" to Firestore:`, err?.message || err);
    return null;
  }
}

export async function getImageFromFirestore(id: string): Promise<StoredImageDoc | null> {
  const { db, isReady } = initFirebase();
  if (!db || !isReady) return null;

  try {
    const docSnap = await db.collection('images').doc(id).get();
    if (docSnap.exists) {
      return docSnap.data() as StoredImageDoc;
    }
    return null;
  } catch (err: any) {
    console.error(`[Firebase Admin] Failed to get image "${id}" from Firestore:`, err?.message || err);
    return null;
  }
}
