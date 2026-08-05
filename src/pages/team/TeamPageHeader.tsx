import { Button } from '@components/ui/Button';

export function TeamPageHeader({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex items-center justify-between mb-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900 dark:text-white">Team Workspace</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Collaborate on research with your team</p>
      </div>
      <Button variant="secondary" size="sm" onClick={onBack} leftIcon={<i className="fas fa-arrow-left" />}>
        Back to Search
      </Button>
    </div>
  );
}
