import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  isFilled?: boolean;
  secondaryTitle?: string;
  secondaryValue?: string | number;
  className?: string;
}

export function DashboardCard({
  title,
  value,
  isFilled = false,
  secondaryTitle,
  secondaryValue,
  className,
}: DashboardCardProps) {
  const isPaloDeRosa = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "PALO DE ROSA";

  const singleValueClassName = cn(
    "font-bold text-primary mt-2 break-all",
    isPaloDeRosa(value) ? "text-3xl" : "text-5xl"
  );
  
  const dualValueClassName = (val: any) => cn(
    "font-bold text-primary mt-2 break-all",
    isPaloDeRosa(val) ? "text-2xl" : "text-4xl"
  );

  return (
    <div
      className={cn(
        "rounded-2xl shadow-lg border p-4 flex flex-col justify-center items-center text-center",
        isFilled ? "text-white" : "",
        className
      )}
      style={{
        borderColor: "#137547",
        height: 215,
        backgroundColor: isFilled ? "#137547" : "transparent",
      }}
    >
      {secondaryTitle && secondaryValue !== undefined ? (
        <div className="flex justify-around items-center w-full h-full">
          <div className="flex flex-col items-center justify-start h-full w-1/2 p-2">
            <h3 className="font-semibold text-lg text-gray-700 mb-2 min-h-[40px] flex items-center">{title}</h3>
            <p className={dualValueClassName(value)}>{value}</p>
          </div>
          <div className="h-4/5 self-center border-l border-gray-200" />
          <div className="flex flex-col items-center justify-start h-full w-1/2 p-2">
            <h3 className="font-semibold text-lg text-gray-700 mb-2 min-h-[40px] flex items-center">{secondaryTitle}</h3>
            <p className={dualValueClassName(secondaryValue)}>{secondaryValue}</p>
          </div>
        </div>
      ) : (
        <>
          <h3 className={cn(
            "font-semibold",
            isFilled ? "text-2xl font-bold" : "text-xl text-gray-700"
          )}>
            {title}
          </h3>
          {value !== undefined && (
            <p className={singleValueClassName}>
                {value}
            </p>
          )}
        </>
      )}
    </div>
  );
}
