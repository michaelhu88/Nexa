import { json, type MetaFunction } from '@remix-run/cloudflare';
import { ClientOnly } from 'remix-utils/client-only';
import { Header } from '~/components/header/Header';
import { InventoryPage } from '~/components/inventory/InventoryPage';
import { AuthWrapper } from '~/components/auth/AuthWrapper';
import BackgroundRays from '~/components/ui/BackgroundRays';

export const meta: MetaFunction = () => {
  return [{ title: 'Inventory - Nexa' }, { name: 'description', content: 'Manage your inventory items with Nexa' }];
};

export const loader = () => json({});

export default function Inventory() {
  return (
    <AuthWrapper>
      <div className="flex flex-col h-full w-full bg-nexa-elements-background-depth-1">
        <BackgroundRays />
        <Header />
        <ClientOnly>{() => <InventoryPage />}</ClientOnly>
      </div>
    </AuthWrapper>
  );
}
