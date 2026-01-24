export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <h1 className="text-center text-6xl font-bold tracking-tight text-foreground font-headline md:text-8xl">
        <span className="relative">
          <span className="relative z-10">Hola Inmatmex</span>
          <span className="absolute inset-x-0 bottom-2 h-4 bg-accent/50 sm:h-5 md:h-6 -z-10" />
        </span>
      </h1>
    </main>
  );
}
