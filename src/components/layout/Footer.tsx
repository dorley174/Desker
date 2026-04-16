const Footer = () => (
  <footer className="border-t bg-muted/30">
    <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
      <span>© {new Date().getFullYear()} Desker · гибридный офис без хаоса в посадке</span>
      <span>Offline demo mode · данные и сценарии сохраняются локально в браузере</span>
    </div>
  </footer>
);

export default Footer;
