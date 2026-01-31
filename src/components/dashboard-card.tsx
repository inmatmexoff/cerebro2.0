import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import Link from "next/link";
import React from "react";

interface DashboardCardProps {
  title: string;
  value?: string | number;
  isFilled?: boolean;
  className?: string;
  href?: string;
  icon?: React.ReactNode;
}

export function DashboardCard({
  title,
  value,
  isFilled = false,
  className,
  href,
  icon,
}: DashboardCardProps) {
  const isPaloDeRosa = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "PALO DE ROSA";

  const isDomeska = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "DOMESKA";

  const isHogarden = (val: any) =>
    typeof val === "string" && val.toUpperCase() === "HOGARDEN";

  const valueClassName = cn(
    "font-bold mt-1 sm:mt-2 break-words", // break-words instead of break-all
    isFilled ? "text-primary-foreground" : "text-primary",
    isPaloDeRosa(value)
      ? "text-lg sm:text-xl"
      : isDomeska(value)
      ? "text-2xl sm:text-3xl"
      : isHogarden(value)
      ? "text-2xl sm:text-3xl"
      : "text-4xl sm:text-5xl"
  );

  const cardComponent = (
    <Card
      className={cn(
        "flex flex-col justify-center items-center text-center h-44 sm:h-[215px]",
        isFilled ? "bg-primary text-primary-foreground" : "bg-card text-card-foreground",
        href && (isFilled ? "hover:bg-primary/90" : "hover:bg-accent/20"),
        href && "transition-colors",
        className
      )}
    >
      <CardContent className="p-3 sm:p-4">
        <h3 className={cn(
          "font-semibold",
          isFilled ? "text-lg sm:text-2xl font-bold" : "text-base sm:text-xl text-gray-700"
        )}>
          {title}
        </h3>
        {value !== undefined && (
          <p className={valueClassName}>
              {value}
          </p>
        )}
        {icon && <div className={cn("mt-2 flex justify-center", "[&_svg]:h-6 [&_svg]:w-6 sm:[&_svg]:h-8 sm:[&_svg]:w-8")}>{icon}</div>}
      </CardContent>
    </Card>
  );

  if (href) {
    return <Link href={href}>{cardComponent}</Link>;
  }

  return cardComponent;
}
