import { httpsCallable } from "firebase/functions";

import { app } from "@/lib/firebase";
import { getFunctions } from "firebase/functions";

export type SendEmailTemplate = "invite";

export type SendEmailPayload = {
  to: string;
  template: SendEmailTemplate;
  vars: Record<string, string | undefined>;
};

const functions = getFunctions(app);
const sendTemplatedEmail = httpsCallable<SendEmailPayload, { ok: boolean }>(functions, "sendTemplatedEmail");

export const sendEmailViaFunction = async (payload: SendEmailPayload): Promise<void> => {
  await sendTemplatedEmail(payload);
};
