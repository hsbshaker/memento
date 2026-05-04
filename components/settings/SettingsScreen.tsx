import { AppShell } from "@/components/ui/AppShell";
import { MobilePageContainer } from "@/components/ui/MobilePageContainer";
import { AccountSection } from "@/components/settings/AccountSection";

type SettingsScreenProps = {
  email: string | null;
};

export function SettingsScreen({ email }: SettingsScreenProps) {
  return (
    <AppShell containerClassName="max-w-4xl px-0 md:px-6">
      <MobilePageContainer className="pb-20">
        <div className="space-y-6 pt-6">
          <p className="text-xs font-medium tracking-[0.24em] text-[#F7C948] uppercase">Settings</p>

          <AccountSection email={email} />
        </div>
      </MobilePageContainer>
    </AppShell>
  );
}
