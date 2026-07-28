import { z } from "zod";

/**
 * Browser PushSubscription JSON for POST /me/push-subscription.
 */
export const pushSubscriptionBodySchema = z.object({
  endpoint: z.string().url(),
  keys: z.object({
    p256dh: z.string().min(1),
    auth: z.string().min(1),
  }),
  expirationTime: z.number().nullable().optional(),
});

export type PushSubscriptionBody = z.infer<typeof pushSubscriptionBodySchema>;

/**
 * DELETE /me/push-subscription body.
 */
export const deletePushSubscriptionBodySchema = z.object({
  endpoint: z.string().url(),
});

export type DeletePushSubscriptionBody = z.infer<
  typeof deletePushSubscriptionBodySchema
>;
