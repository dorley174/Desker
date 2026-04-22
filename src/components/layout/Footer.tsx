import { Link } from "react-router-dom";

const Footer = () => (
  <footer className="border-t bg-muted/40">
    <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:justify-between">
      <span>© {new Date().getFullYear()} Desker - гибридный офис без хаоса в посадке. Все права защищены.</span>
      <div className="flex gap-4">
        <Link to="/contacts" className="transition hover:text-foreground">Контакты</Link>
        <a href="https://desker.app" target="_blank" rel="noreferrer" className="transition hover:text-foreground">desker.app</a>
      </div>
    </div>
  </footer>
);

export default Footer;
