import { PublicChannelView } from "@/components/channel/public-channel-view";

type PageProps = { params: Promise<{ username: string }> };

/**
 * Public caller channel `/{username}` (US-008, US-009, US-011).
 */
export default async function UsernameChannelPage({ params }: PageProps) {
  const { username } = await params;
  return <PublicChannelView userName={username} />;
}
