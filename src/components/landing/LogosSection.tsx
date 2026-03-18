const logos = [
  "Lumiar Digital", "Growth Lab", "Vetta Marketing", "AutoTech", "ScaleUp",
  "Digital Storm", "Nexus Corp", "LeadPro", "Studio CR", "TechFlow",
  "Agência Impulso", "GH Store", "BioVita", "CloudBase", "DataPulse",
  "EcoSmart", "FutureX", "GlobalEdge", "HyperMedia", "InnovaHub",
  "JetStream", "KronosTech", "LunaFin", "MetaPeak", "NovaBrand",
];

const LogosSection = () => {
  return (
    <section className="py-12 border-y border-border overflow-hidden">
      <p className="text-center text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-8 font-semibold">
        Empresas que confiam no Forge AI
      </p>
      <div className="relative">
        <div className="flex animate-scroll-left-slow" style={{ width: "fit-content" }}>
          {[...logos, ...logos].map((name, i) => (
            <div
              key={i}
              className="flex-shrink-0 mx-8 flex items-center gap-2 text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
            >
              <div className="h-6 w-6 rounded bg-muted/50 flex items-center justify-center text-[10px] font-bold">
                {name[0]}
              </div>
              <span className="text-sm font-semibold tracking-tight whitespace-nowrap">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default LogosSection;
