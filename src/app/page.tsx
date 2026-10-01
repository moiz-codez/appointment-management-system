import { redirect } from 'next/navigation';

// The proxy sends signed-in users to their home; everyone else lands on login.
export default function Home() {
  redirect('/login');
}
