const Footer = () => (
  <footer className="border-t bg-muted/40">
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
      <span>© {new Date().getFullYear()} Desker. Все права защищены.</span>
      <div className="flex gap-4">
        <a href="#" className="hover:text-foreground transition">О компании</a>
        <a href="#" className="hover:text-foreground transition">Контакты</a>
        <a href="#" className="hover:text-foreground transition">desker.app</a>
      </div>
    </div>
  </footer>
);

export default Footer;
