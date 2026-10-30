import { NativeTabs } from "expo-router/native-tabs";
import { useInbox, useMe } from "@/lib/queries";
import { useColors } from "@/theme/colors";

export default function AppTabs() {
  const c = useColors();
  const { data } = useMe();
  const recs = data?.recommendations.length ?? 0;
  const unread = useInbox().data?.unread ?? 0;

  return (
    <NativeTabs
      tintColor={c.ink}
      iconColor={{ default: c.muted, selected: c.ink }}
      labelStyle={{ default: { color: c.muted }, selected: { color: c.ink } }}
      backgroundColor={c.bg}
      indicatorColor={c.bg2}
      rippleColor={c.bg2}
      badgeBackgroundColor={c.coral}
    >
      <NativeTabs.Trigger name="(home)">
        <NativeTabs.Trigger.Label>Intros</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "sun.horizon", selected: "sun.horizon.fill" }} md="wb_twilight" />
        {recs > 0 && <NativeTabs.Trigger.Badge>{String(recs)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="matches">
        <NativeTabs.Trigger.Label>Matches</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.2", selected: "person.2.fill" }} md="group" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="messages">
        <NativeTabs.Trigger.Label>Messages</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "bubble.left.and.bubble.right", selected: "bubble.left.and.bubble.right.fill" }} md="chat" />
        {unread > 0 && <NativeTabs.Trigger.Badge>{String(unread)}</NativeTabs.Trigger.Badge>}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="board">
        <NativeTabs.Trigger.Label>Board</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "quote.bubble", selected: "quote.bubble.fill" }} md="format_quote" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="me">
        <NativeTabs.Trigger.Label>Me</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} md="account_circle" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
