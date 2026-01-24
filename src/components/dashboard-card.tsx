import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  isFilled?: boolean;
}

export function DashboardCard({ title, value, isFilled = false }: DashboardCardProps) {
  return (
    <div
      className={cn(
        "rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center",
        isFilled ? "text-white" : ""
      )}
      style={{
        borderColor: "#137547",
        height: 215,
        backgroundColor: isFilled ? "#137547" : "transparent",
      }}
    >
      <h3 className={cn(
        "font-semibold",
        isFilled ? "text-2xl font-bold" : "text-xl text-gray-700"
      )}>
        {title}
      </h3>
      {value && (
        <p className="text-5xl font-bold text-primary mt-2 break-all">{value}</p>
      )}
    </div>
  );
}
