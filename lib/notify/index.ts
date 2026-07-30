/**
 * Notification recipient resolution + Web Push fan-out (§11).
 */
export {
  assertNotSelfFollow,
  CHANNEL_NOTIFY_EVENTS,
  resolveRecipientUserIds,
  shouldEmitChannelNotify,
  type ChannelNotifyEvent,
  type ResolveRecipientsInput,
} from "@/lib/notify/recipients";
export {
  fanOutChannelNotify,
  loadCallerUserName,
  type FanOutInput,
} from "@/lib/notify/fan-out";
