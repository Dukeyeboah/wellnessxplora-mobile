import { Redirect } from 'expo-router';

/** Default landing is Explore — this route stays hidden from the tab bar. */
export default function Index() {
  return <Redirect href="/explore" />;
}
