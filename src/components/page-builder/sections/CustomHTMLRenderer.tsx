const CustomHTMLRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  return (
    <section style={{ background: c.bgColor || "#0a0a0a", paddingTop: `${c.paddingY || 40}px`, paddingBottom: `${c.paddingY || 40}px` }}>
      <div className="max-w-3xl mx-auto px-6 prose prose-invert prose-sm" dangerouslySetInnerHTML={{ __html: c.html || "" }} />
    </section>
  );
};

export default CustomHTMLRenderer;
