import { redirect } from 'next/navigation';

// Settings page has been removed - GitHub connection is now in the Integrations panel
// within the generate workspace. Users should connect GitHub directly where they use it.
export default function SettingsPage() {
  // Redirect to home page
  redirect('/');
}