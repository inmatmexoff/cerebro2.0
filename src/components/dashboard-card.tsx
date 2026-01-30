import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  isFilled?: boolean;
  className?: string;
}

export function DashboardCard({
  title,
  value,
  isFilled = false,
  className,
}: DashboardCardProps) {
  const isPaloDeRosa = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "PALO DE ROSA";

  const isDomeska = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "DOMESKA";

  const isHogarden = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "HOGARDEN";

  const valueClassName = cn(
    "font-bold mt-2 break-all",
    isFilled ? "text-primary-foreground" : "text-primary",
    isPaloDeRosa(value)
      ? "text-xl"
      : isDomeska(value)
      ? "text-3xl"
      : isHogarden(value)
      ? "text-3xl"
      : "text-5xl"
  );

  return (
    <Card
      className={cn(
        "flex flex-col justify-center items-center text-center",
        isFilled && "bg-primary text-primary-foreground",
        className
      )}
      style={{ height: 215 }}
    >
      <CardContent className="p-4">
        <h3 className={cn(
          "font-semibold",
          isFilled ? "text-2xl font-bold" : "text-xl text-gray-700"
        )}>
          {title}
        </h3>
        {value !== undefined && (
          <p className={valueClassName}>
              {value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
