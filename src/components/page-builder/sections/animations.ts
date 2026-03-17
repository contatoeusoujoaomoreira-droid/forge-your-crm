export const getAnimation = (type?: string) => {
  switch (type) {
    case "fade-in":
      return { initial: { opacity: 0 }, whileInView: { opacity: 1 }, viewport: { once: true }, transition: { duration: 0.6 } };
    case "slide-up":
      return { initial: { opacity: 0, y: 40 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };
    case "slide-left":
      return { initial: { opacity: 0, x: -40 }, whileInView: { opacity: 1, x: 0 }, viewport: { once: true }, transition: { duration: 0.6 } };
    case "scale-in":
      return { initial: { opacity: 0, scale: 0.9 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { duration: 0.5 } };
    case "bounce-in":
      return { initial: { opacity: 0, scale: 0.3 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: true }, transition: { type: "spring", stiffness: 260, damping: 20 } };
    case "rotate-in":
      return { initial: { opacity: 0, rotate: -10 }, whileInView: { opacity: 1, rotate: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
    default:
      return {};
  }
};
