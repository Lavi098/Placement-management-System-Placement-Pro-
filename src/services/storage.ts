import { getDownloadURL, ref, uploadBytesResumable, uploadBytes } from "firebase/storage";
import { storage } from "@/lib/firebase";

const MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB

export async function uploadDriveAttachment(params: {
  file: File;
  placementAdminId: string;
  onProgress?: (progress: number) => void;
}): Promise<{ url: string; name: string }> {
  const { file, placementAdminId } = params;

  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large. Max 5MB allowed.");
  }
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `drives/${placementAdminId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);

  try {
    return await new Promise((resolve, reject) => {
      const uploadTask = uploadBytesResumable(storageRef, file, { contentType: "application/pdf" });
      const timeoutMs = 45000; // fail fast if stuck
      const timeoutId = setTimeout(() => {
        uploadTask.cancel();
        reject(new Error("Upload timed out. Please try again."));
      }, timeoutMs);

      uploadTask.on(
        "state_changed",
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          params.onProgress?.(progress);
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        async () => {
          clearTimeout(timeoutId);
          const url = await getDownloadURL(uploadTask.snapshot.ref);
          resolve({ url, name: file.name });
        }
      );
    });
  } catch (resumableError) {
    // If resumable fails (CORS, network, or rule), fall back to a simple upload
    console.error("JD upload failed (resumable), retrying simple upload:", resumableError);
    const fallback = await uploadDriveAttachmentFallback({ file, placementAdminId });
    params.onProgress?.(100);
    return fallback;
  }
}

// Fallback helper (non-resumable) if needed
export async function uploadDriveAttachmentFallback(params: {
  file: File;
  placementAdminId: string;
}): Promise<{ url: string; name: string }> {
  const { file, placementAdminId } = params;
  if (file.size > MAX_FILE_BYTES) {
    throw new Error("File too large. Max 5MB allowed.");
  }
  if (file.type !== "application/pdf") {
    throw new Error("Only PDF files are allowed.");
  }
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `drives/${placementAdminId}/${Date.now()}-${safeName}`;
  const storageRef = ref(storage, path);
  const snapshot = await uploadBytes(storageRef, file, { contentType: file.type });
  const url = await getDownloadURL(snapshot.ref);
  return { url, name: file.name };
}
