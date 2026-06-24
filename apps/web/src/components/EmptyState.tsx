interface EmptyStateProps {
  message: string;
  action?: { label: string; onClick: () => void };
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 py-12 text-center">
      <p className="text-gray-500">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-3 text-sm font-medium text-gray-900 underline underline-offset-2 hover:text-gray-700"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
