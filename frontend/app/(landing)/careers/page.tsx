export default function CareersPage() {
  return (
    <main className="container">
      <div className="flex flex-col py-12 space-y-6">
        <h1 className="text-3xl font-bold mb-4 text-[#4B1D22]">Careers</h1>
        <p className="font-medium text-muted-foreground">
          Explore exciting career opportunities and join our dynamic team
        </p>
        <section className="space-y-6">
          <h2 className="text-2xl font-bold mb-4 text-[#6D1C24] text-left">
            Current Openings
          </h2>
          <h2 className="text-lg font-semibold text-muted-foreground">
            There are currently no open positions. Please check back later.
          </h2>
        </section>
      </div>
    </main>
  );
}
