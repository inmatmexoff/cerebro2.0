'use client';

import React, { useState, useEffect, useCallback } from "react";
import Link from 'next/link';
import {
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Input,
  Button,
  DropdownTrigger,
  Dropdown,
  DropdownMenu,
  DropdownItem,
  Chip,
  Pagination,
  Card,
  CardBody,
  CardHeader,
  Spinner,
} from "@nextui-org/react";
import { ArrowLeft, Package2 } from "lucide-react";
import { supabasePROD } from "@/lib/supabase";

// Helper functions and icons
const capitalize = (str: string) => {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const PlusIcon = (props: any) => (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <g
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
      >
        <path d="M6 12h12" />
        <path d="M12 18V6" />
      </g>
    </svg>
);

const SearchIcon = (props: any) => (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...props}
    >
      <path
        d="M11.5 21C16.7467 21 21 16.7467 21 11.5C21 6.25329 16.7467 2 11.5 2C6.25329 2 2 6.25329 2 11.5C2 16.7467 6.25329 21 11.5 21Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
      <path
        d="M22 22L20 20"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
      />
    </svg>
);

const ChevronDownIcon = ({strokeWidth = 1.5, ...otherProps}) => (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height="1em"
      role="presentation"
      viewBox="0 0 24 24"
      width="1em"
      {...otherProps}
    >
      <path
        d="m19.92 8.95-6.52 6.52c-.77.77-2.03.77-2.8 0L4.08 8.95"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeMiterlimit={10}
        strokeWidth={strokeWidth}
      />
    </svg>
);


const columns = [
  {name: "TIENDA", uid: "tienda", sortable: true},
  {name: "# VENTA", uid: "num_venta", sortable: true},
  {name: "FECHA DE VENTA", uid: "fecha_venta", sortable: true},
  {name: "FECHA DE LLEGADA", uid: "fecha_llegada", sortable: true},
  {name: "FECHA REVISIÓN", uid: "fecha_revision", sortable: true},
  {name: "PRODUCTO", uid: "producto"},
  {name: "SKU", uid: "sku"},
  {name: "MOTIVO DEVOLUCIÓN", uid: "motivo_devo"},
  {name: "ESTADO DE LLEGADA", uid: "estado_llegada", sortable: true},
  {name: "REPORTE", uid: "reporte", sortable: true},
  {name: "EMPAQUETADOR", uid: "nombre_despacho"},
  {name: "SUPERVISADO POR", uid: "nombre_revision"},
  {name: "ERROR DE NOSOTROS", uid: "error_prop", sortable: true},
  {name: "OBSERVACIONES", uid: "observacion"},
  {name: "FACTURA", uid: "factura"},
  {name: "REVISIÓN", uid: "s_revision"},
];

const statusColorMap: Record<string, "success" | "warning" | "danger" | "default"> = {
  BUENO: "success",
  REGULAR: "warning",
  DANIADO: "danger",
  MUY_DANIADO: "danger",
};


const INITIAL_VISIBLE_COLUMNS = [
    "tienda", 
    "num_venta", 
    "fecha_venta", 
    "producto",
    "sku",
    "motivo_devolucion",
    "estado_llegada",
    "error_prop",
];


export default function DevolucionesPage() {
    const [returns, setReturns] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filterValue, setFilterValue] = useState("");
    const [selectedKeys, setSelectedKeys] = useState<any>(new Set([]));
    const [visibleColumns, setVisibleColumns] = useState<any>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [rowsPerPage, setRowsPerPage] = useState(5);
    const [sortDescriptor, setSortDescriptor] = useState<any>({
        column: "fecha_llegada",
        direction: "descending",
    });
    const [page, setPage] = useState(1);

    useEffect(() => {
        const fetchReturns = async () => {
          setIsLoading(true);
          setError(null);
          try {
            const { data, error: dbError } = await supabasePROD
              .from('devoluciones')
              .select('*')
              .order('fecha_llegada', { ascending: false });
    
            if (dbError) {
              throw dbError;
            }
            setReturns(data || []);
          } catch (err: any) {
            setError("No se pudieron cargar las devoluciones.");
            console.error("Error fetching returns:", err.message);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchReturns();
    }, []);

    const returnsTodayCount = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return returns.filter(r => {
            if (!r.fecha_llegada) return false;
            const arrivalDate = new Date(r.fecha_llegada);
            return arrivalDate.toDateString() === today.toDateString();
        }).length;
    }, [returns]);

    const hasSearchFilter = Boolean(filterValue);

    const headerColumns = React.useMemo(() => {
        if (visibleColumns === "all") return columns;

        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    const filteredItems = React.useMemo(() => {
        let filteredReturns = [...returns];

        if (hasSearchFilter) {
        filteredReturns = filteredReturns.filter((ret) =>
            Object.values(ret).some(val => 
                String(val).toLowerCase().includes(filterValue.toLowerCase())
            )
        );
        }
        return filteredReturns;
    }, [returns, filterValue]);

    const pages = Math.ceil(filteredItems.length / rowsPerPage) || 1;

    const items = React.useMemo(() => {
        const start = (page - 1) * rowsPerPage;
        const end = start + rowsPerPage;

        return filteredItems.slice(start, end);
    }, [page, filteredItems, rowsPerPage]);

    const sortedItems = React.useMemo(() => {
        return [...items].sort((a: any, b: any) => {
            const first = a[sortDescriptor.column];
            const second = b[sortDescriptor.column];
            const cmp = first < second ? -1 : first > second ? 1 : 0;

            return sortDescriptor.direction === "descending" ? -cmp : cmp;
        });
    }, [sortDescriptor, items]);

    const renderCell = React.useCallback((item: any, columnKey: string) => {
        const cellValue = item[columnKey];

        switch (columnKey) {
            case "estado_llegada":
                return (
                <Chip className="capitalize" color={statusColorMap[cellValue] || 'default'} size="sm" variant="flat">
                    {cellValue ? String(cellValue).replace(/_/g, ' ').toLowerCase() : '-'}
                </Chip>
                );
            case "error_prop":
                return (
                    <Chip className="capitalize" color={cellValue ? "danger" : "default"} size="sm" variant="flat">
                        {cellValue ? 'Sí' : 'No'}
                    </Chip>
                );
            case "reporte":
            case "factura":
                return (
                    <Chip className="capitalize" color={cellValue ? "success" : "default"} size="sm" variant="flat">
                        {cellValue ? 'Sí' : 'No'}
                    </Chip>
                );
            case "fecha_venta":
            case "fecha_llegada":
            case "fecha_revision":
                return cellValue ? new Date(cellValue).toLocaleDateString('es-MX') : '-';
            default:
                return cellValue;
        }
    }, []);
    
    const onNextPage = React.useCallback(() => {
        if (page < pages) {
        setPage(page + 1);
        }
    }, [page, pages]);

    const onPreviousPage = React.useCallback(() => {
        if (page > 1) {
        setPage(page - 1);
        }
    }, [page]);

    const onRowsPerPageChange = React.useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
        setRowsPerPage(Number(e.target.value));
        setPage(1);
    }, []);

    const onSearchChange = React.useCallback((value?: string) => {
        if (value) {
            setFilterValue(value);
            setPage(1);
        } else {
            setFilterValue("");
        }
    }, []);

    const onClear = React.useCallback(() => {
        setFilterValue("");
        setPage(1);
    }, []);


    const topContent = React.useMemo(() => {
    return (
      <div className="flex flex-col gap-4">
        <div className="flex flex-col md:flex-row justify-between gap-3 items-end">
          <Input
            isClearable
            className="w-full md:max-w-xs"
            placeholder="Buscar en devoluciones..."
            startContent={<SearchIcon />}
            value={filterValue}
            onClear={() => onClear()}
            onValueChange={onSearchChange}
          />
          <div className="flex gap-3">
            <Dropdown>
              <DropdownTrigger className="hidden md:flex">
                <Button endContent={<ChevronDownIcon className="text-small" />} variant="flat">
                  Columnas
                </Button>
              </DropdownTrigger>
              <DropdownMenu
                disallowEmptySelection
                aria-label="Table Columns"
                closeOnSelect={false}
                selectedKeys={visibleColumns}
                selectionMode="multiple"
                onSelectionChange={setVisibleColumns}
              >
                {columns.map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Link href="/devoluciones/import-excel">
              <Button variant="flat">
                Importar Excel
              </Button>
            </Link>
            <Link href="/devoluciones/nueva">
              <Button color="primary" endContent={<PlusIcon />}>
                Nueva Devolución
              </Button>
            </Link>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {returns.length} devoluciones</span>
          <label className="flex items-center text-default-400 text-small">
            Filas por página:
            <select
              className="bg-transparent outline-none text-default-400 text-small"
              onChange={onRowsPerPageChange}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="15">15</option>
            </select>
          </label>
        </div>
      </div>
    );
  }, [
    filterValue,
    visibleColumns,
    onRowsPerPageChange,
    onSearchChange,
    onClear,
    returns.length,
  ]);

  const bottomContent = React.useMemo(() => {
    return (
      <div className="py-2 px-2 flex justify-between items-center">
        <span className="w-[30%] text-small text-default-400">
          {selectedKeys === "all"
            ? "Todos seleccionados"
            : `${selectedKeys.size} de ${filteredItems.length} seleccionados`}
        </span>
        <Pagination
          isCompact
          showControls
          showShadow
          color="primary"
          page={page}
          total={pages}
          onChange={setPage}
        />
        <div className="hidden md:flex w-[30%] justify-end gap-2">
          <Button isDisabled={pages === 1} size="sm" variant="flat" onPress={onPreviousPage}>
            Anterior
          </Button>
          <Button isDisabled={pages === 1} size="sm" variant="flat" onPress={onNextPage}>
            Siguiente
          </Button>
        </div>
      </div>
    );
  }, [selectedKeys, page, pages, filteredItems.length, onPreviousPage, onNextPage]);


  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
        <div className="max-w-7xl mx-auto space-y-6">
            <header>
                <Link
                    href="/"
                    className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
                >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Volver al Dashboard
                </Link>
                <div>
                    <h1 className="text-3xl font-bold">Devoluciones</h1>
                    <p className="text-muted-foreground">
                    Gestiona y consulta el historial de devoluciones.
                    </p>
                </div>
            </header>
            <main>
                <Card className="mb-6" shadow="sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-0">
                        <h4 className="font-bold text-large">Devoluciones de Hoy</h4>
                        <Package2 className="h-5 w-5 text-default-400" />
                    </CardHeader>
                    <CardBody>
                        <div className="text-3xl font-bold">{isLoading ? <Spinner size="sm"/> : returnsTodayCount}</div>
                        <p className="text-small text-default-500">
                            Devoluciones programadas para llegar hoy.
                        </p>
                    </CardBody>
                </Card>
                <Table
                    aria-label="Tabla de devoluciones"
                    isHeaderSticky
                    bottomContent={bottomContent}
                    bottomContentPlacement="outside"
                    classNames={{
                        wrapper: "max-h-[500px]",
                    }}
                    selectedKeys={selectedKeys}
                    selectionMode="multiple"
                    sortDescriptor={sortDescriptor}
                    topContent={topContent}
                    topContentPlacement="outside"
                    onSelectionChange={setSelectedKeys}
                    onSortChange={setSortDescriptor}
                    >
                    <TableHeader columns={headerColumns}>
                        {(column) => (
                        <TableColumn
                            key={column.uid}
                            align={column.uid === "actions" ? "center" : "start"}
                            allowsSorting={column.sortable}
                        >
                            {column.name}
                        </TableColumn>
                        )}
                    </TableHeader>
                    <TableBody 
                        isLoading={isLoading}
                        loadingContent={<Spinner label="Cargando..." />}
                        emptyContent={!isLoading && "No se encontraron devoluciones"} 
                        items={sortedItems}
                    >
                        {(item) => (
                        <TableRow key={item.id}>
                            {(columnKey) => <TableCell>{renderCell(item, columnKey as string)}</TableCell>}
                        </TableRow>
                        )}
                    </TableBody>
                </Table>
            </main>
        </div>
    </div>
  );
}
