type Props = {
  min?: number;
  max: number;
  value: number;
};

export const ProgressBar: React.FC<Props> = ({ min = 0, max, value }) => {
  const percentage = ((value - min) / (max - min)) * 100;

  return (
    <div className="w-full bg-gray-200 rounded-full h-4">
      <div
        className="bg-blue-400 h-4 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
