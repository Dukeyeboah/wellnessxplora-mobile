import { Redirect } from 'expo-router';

/** Placeholder tab — create is handled by the center tab press listener. */
export default function CreateTabScreen() {
  return <Redirect href="/discover" />;
}
