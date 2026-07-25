'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { buildApiUrl } from '@/utils/api';

type AdminLogoutButtonProps = {
  className?: string;
};

export default function AdminLogoutButton({ className = '' }: AdminLogoutButtonProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await fetch(buildApiUrl('/api/admin/logout'), {
        method: 'POST',
        credentials: 'include',
      });
      router.push('/admin/login');
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleLogout}
      disabled={isLoading}
      className={`${className || 'btn-secondary'} disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      {isLoading ? 'Déconnexion...' : 'Se déconnecter'}
    </button>
  );
}
