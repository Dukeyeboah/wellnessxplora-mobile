import AppTabs from '@/components/app-tabs';
import { ChromeVisibilityProvider } from '@/lib/chrome';

export const unstable_settings = {
  initialRouteName: 'explore',
};

export default function TabsLayout() {
  return (
    <ChromeVisibilityProvider>
      <AppTabs />
    </ChromeVisibilityProvider>
  );
}
