import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function LeaveRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard');
  }, [router]);
  return null;
}
