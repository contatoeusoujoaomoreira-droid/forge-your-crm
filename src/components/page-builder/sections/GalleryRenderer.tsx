import { motion } from "framer-motion";
import { getAnimation } from "./animations";

const GalleryRenderer = ({ config: c }: { config: any; isEditor?: boolean }) => {
  const images = c.images || [];
  return (
    <motion.section {...getAnimation(c.animation)} style={{ background: c.bgGradient || c.bgColor || "#0A0A0A", color: c.textColor || "#fff", paddingTop: `${c.paddingY || 60}px`, paddingBottom: `${c.paddingY || 60}px`, fontFamily: c.fontFamily || "Inter" }}>
      <div className="max-w-5xl mx-auto px-6">
        {c.title && <h2 className="text-3xl font-bold text-center mb-10">{c.title}</h2>}
        {images.length === 0 ? (
          <p className="text-center text-sm opacity-50">Adicione imagens no editor</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {images.map((img: any, i: number) => (
              <img key={i} src={img.url} alt={img.alt || ""} className="w-full h-48 object-cover rounded-lg" />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
};

export default GalleryRenderer;
