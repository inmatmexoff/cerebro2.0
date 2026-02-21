'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Upload } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useDropzone } from 'react-dropzone';

export default function ImportDevolucionesPage() {
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop: (acceptedFiles) => {
            console.log(acceptedFiles);
            // Handle file processing here
        },
        accept: {
            'application/vnd.ms-excel': ['.xls'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'text/csv': ['.csv'],
        },
        maxFiles: 1,
    });

  return (
    <div className="min-h-screen bg-muted/40 p-4 sm:p-6 lg:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header>
          <Link
            href="/devoluciones"
            className="flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver a Devoluciones
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Importar Excel de Devoluciones</h1>
            <p className="text-muted-foreground">
              Sube un archivo para registrar múltiples devoluciones a la vez.
            </p>
          </div>
        </header>
        <main>
            <Card>
                <CardHeader>
                    <CardTitle>Carga Masiva desde Archivo</CardTitle>
                    <CardDescription>
                        Sube un archivo CSV o Excel para registrar devoluciones.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed border-gray-300 rounded-lg transition-colors hover:border-primary cursor-pointer`}
                    >
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <input {...getInputProps()} />
                            <Upload className="w-12 h-12 text-muted-foreground" />
                            {isDragActive ? (
                                <p className="mt-4 text-lg font-semibold text-primary">Suelta el archivo aquí...</p>
                            ) : (
                                <>
                                    <p className="mt-4 text-lg font-semibold">Arrastra y suelta un archivo aquí</p>
                                    <p className="mt-1 text-sm text-muted-foreground">o haz clic para seleccionar (CSV, XLS, XLSX)</p>
                                </>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </main>
      </div>
    </div>
  );
}
