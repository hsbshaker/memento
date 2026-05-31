import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { AccountSection } from "@/components/settings/AccountSection";
import { NotificationsSection } from "@/components/settings/NotificationsSection";

type SettingsScreenProps = {
  email: string | null;
  emailRemindersEnabled: boolean;
};

export function SettingsScreen({ email, emailRemindersEnabled }: SettingsScreenProps) {
  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-6">
          <p className="text-xs font-medium tracking-[0.24em] text-accent uppercase">Settings</p>

          <NotificationsSection emailRemindersEnabled={emailRemindersEnabled} />

          <AccountSection email={email} />
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
