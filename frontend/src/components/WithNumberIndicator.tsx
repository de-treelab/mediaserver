type Props = {
  children?: React.ReactNode;
  count: number;
  color?: string;
};

export const WithNumberIndicator: React.FC<Props> = ({
  children,
  count,
  color = "bg-red-500",
}) => {
  return (
    <div className="relative">
      {children}
      {count > 0 && (
        <span
          className={`absolute -bottom-2 -right-2 ${color} text-white rounded-full px-2 py-1 text-xs`}
        >
          {count}
        </span>
      )}
    </div>
  );
};
