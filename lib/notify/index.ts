/**
 * Notification recipient resolution (§11).
 */
export {
  assertNotSelfFollow,
  CHANNEL_NOTIFY_EVENTS,
  resolveRecipientUserIds,
  shouldEmitChannelNotify,
  type ChannelNotifyEvent,
  type ResolveRecipientsInput,
} from "@/lib/notify/recipients";
