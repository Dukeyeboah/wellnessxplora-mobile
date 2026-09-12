import AppTabs from '@/components/app-tabs';
import { ChromeVisibilityProvider } from '@/lib/chrome';
import { CreatePostProvider } from '@/lib/create-post-modal';

export const unstable_settings = {
  initialRouteName: 'discover',
};

export default function TabsLayout() {
  return (
    <ChromeVisibilityProvider>
      <CreatePostProvider>
        <AppTabs />
      </CreatePostProvider>
    </ChromeVisibilityProvider>
  );
}
