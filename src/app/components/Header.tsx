export function Header() {
  return (
    <header className="bg-[#C41E3A] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded flex items-center justify-center">
            <svg className="w-8 h-8 text-[#C41E3A]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <div>
            <h2 className="m-0 text-white text-lg">UNIVERSIDAD PERUANA CAYETANO HEREDIA</h2>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
            <span className="text-sm">Menú</span>
          </button>
          <div className="text-right">
            <p className="m-0 text-sm text-white">USUARIO</p>
          </div>
        </div>
      </div>
    </header>
  );
}
