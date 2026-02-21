'use client';

import React from "react";
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
} from "@nextui-org/react";
import { ArrowLeft, Package2 } from "lucide-react";

// Helper functions and icons from the same style as /src/components/users-table.tsx
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

const VerticalDotsIcon = ({size = 24, width, height, ...props}) => (
    <svg
      aria-hidden="true"
      fill="none"
      focusable="false"
      height={size || height}
      role="presentation"
      viewBox="0 0 24 24"
      width={size || width}
      {...props}
    >
      <path
        d="M12 10c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0-6c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 12c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z"
        fill="currentColor"
      />
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
  {name: "MOTIVO DEVOLUCIÓN", uid: "motivo_devolucion"},
  {name: "ESTADO DE LLEGADA", uid: "estado_llegada", sortable: true},
  {name: "REPORTE", uid: "reporte", sortable: true},
  {name: "EMPAQUETADOR", uid: "empaquetador"},
  {name: "SUPERVISADO POR", uid: "supervisado_por"},
  {name: "ERROR DE NOSOTROS", uid: "error_nosotros", sortable: true},
  {name: "OBSERVACIONES", uid: "observaciones"},
  {name: "FACTURA", uid: "factura"},
  {name: "REVISIÓN", uid: "revision"},
  {name: "ACTIONS", uid: "actions"},
];

const mockReturns = [
  {
    id: 1,
    tienda: "DO MESKA",
    num_venta: "2000008064970425",
    fecha_venta: "2024-05-10",
    fecha_llegada: "2024-05-15",
    fecha_revision: "2024-05-16",
    producto: "Anaquel Metalico 5 Niveles",
    sku: "INM-ANQ-5N",
    motivo_devolucion: "Producto dañado",
    estado_llegada: "Dañado",
    reporte: "Sí",
    empaquetador: "Juan Pérez",
    supervisado_por: "Ana Gómez",
    error_nosotros: "No",
    observaciones: "El cliente reporta que llegó con un golpe en una esquina.",
    factura: "F-12345",
    revision: "Completa",
  },
  {
    id: 2,
    tienda: "INMATMEX",
    num_venta: "2000008064970426",
    fecha_venta: "2024-05-11",
    fecha_llegada: "2024-05-16",
    fecha_revision: "2024-05-17",
    producto: "Exhibidor de alambre",
    sku: "INM-EXH-ALM",
    motivo_devolucion: "No era lo que esperaba",
    estado_llegada: "Buen estado",
    reporte: "No",
    empaquetador: "Maria Rodriguez",
    supervisado_por: "Ana Gómez",
    error_nosotros: "No",
    observaciones: "El producto está en perfectas condiciones, se puede re-almacenar.",
    factura: "F-12346",
    revision: "Completa",
  },
];

const statusColorMap: Record<string, "danger" | "success" | "warning"> = {
  "dañado": "danger",
  "buen estado": "success",
  "incompleto": "warning",
};

const booleanColorMap: Record<string, "success" | "danger"> = {
    "sí": "success",
    "no": "danger",
}

const INITIAL_VISIBLE_COLUMNS = [
    "tienda", 
    "num_venta", 
    "fecha_venta", 
    "producto",
    "sku",
    "motivo_devolucion",
    "estado_llegada",
    "error_nosotros",
    "actions"
];


export default function DevolucionesPage() {
    const [filterValue, setFilterValue] = React.useState("");
    const [selectedKeys, setSelectedKeys] = React.useState<any>(new Set([]));
    const [visibleColumns, setVisibleColumns] = React.useState<any>(new Set(INITIAL_VISIBLE_COLUMNS));
    const [statusFilter, setStatusFilter] = React.useState<any>("all");
    const [rowsPerPage, setRowsPerPage] = React.useState(5);
    const [sortDescriptor, setSortDescriptor] = React.useState<any>({
        column: "fecha_llegada",
        direction: "descending",
    });
    const [page, setPage] = React.useState(1);

    const returnsTodayCount = React.useMemo(() => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        return mockReturns.filter(r => {
            const [year, month, day] = r.fecha_llegada.split('-').map(Number);
            const arrivalDate = new Date(year, month - 1, day);
            return arrivalDate.getTime() === today.getTime();
        }).length;
    }, []);

    const hasSearchFilter = Boolean(filterValue);

    const headerColumns = React.useMemo(() => {
        if (visibleColumns === "all") return columns;

        return columns.filter((column) => Array.from(visibleColumns).includes(column.uid));
    }, [visibleColumns]);

    const filteredItems = React.useMemo(() => {
        let filteredReturns = [...mockReturns];

        if (hasSearchFilter) {
        filteredReturns = filteredReturns.filter((ret) =>
            Object.values(ret).some(val => 
                String(val).toLowerCase().includes(filterValue.toLowerCase())
            )
        );
        }
        return filteredReturns;
    }, [filterValue]);

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
                <Chip className="capitalize" color={statusColorMap[item.estado_llegada.toLowerCase()]} size="sm" variant="flat">
                    {cellValue}
                </Chip>
                );
            case "error_nosotros":
                 return (
                <Chip className="capitalize" color={booleanColorMap[item.error_nosotros.toLowerCase()]} size="sm" variant="flat">
                    {cellValue}
                </Chip>
                );
            case "reporte":
                 return (
                <Chip className="capitalize" color={booleanColorMap[item.reporte.toLowerCase()]} size="sm" variant="flat">
                    {cellValue}
                </Chip>
                );
            case "actions":
                return (
                <div className="relative flex items-center gap-2">
                    <Dropdown>
                    <DropdownTrigger>
                        <Button isIconOnly size="sm" variant="light">
                        <VerticalDotsIcon className="text-default-300" />
                        </Button>
                    </DropdownTrigger>
                    <DropdownMenu>
                        <DropdownItem key="view">Ver Detalle</DropdownItem>
                        <DropdownItem key="edit">Editar</DropdownItem>
                    </DropdownMenu>
                    </Dropdown>
                </div>
                );
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
                {columns.filter(c => c.uid !== 'actions').map((column) => (
                  <DropdownItem key={column.uid} className="capitalize">
                    {capitalize(column.name)}
                  </DropdownItem>
                ))}
              </DropdownMenu>
            </Dropdown>
            <Link href="/devoluciones/import-excel">
                <Button color="primary" endContent={<PlusIcon />}>
                    Importar Excel
                </Button>
            </Link>
          </div>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-default-400 text-small">Total {mockReturns.length} devoluciones</span>
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
                        <div className="text-3xl font-bold">{returnsTodayCount}</div>
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
                    <TableBody emptyContent={"No se encontraron devoluciones"} items={sortedItems}>
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
