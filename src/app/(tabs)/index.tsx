import { Redirect } from 'expo-router';

/** Default landing is Discover — this route stays hidden from the tab bar. */
export default function Index() {
  return <Redirect href={'/discover' as never} />;
}
