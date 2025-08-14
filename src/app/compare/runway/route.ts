import { redirect } from 'next/navigation';

export async function GET() {
  redirect('/compare/runway-vs-bazaar');
}