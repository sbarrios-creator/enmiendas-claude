export function Header() {
  return (
    <header className="bg-[#C41E3A] text-white shadow-md">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* Logo — anclado a la izquierda */}
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-400 rounded flex items-center justify-center shrink-0">
            <svg className="w-8 h-8 text-[#C41E3A]" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2L2 7v10c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-10-5z" />
            </svg>
          </div>
          <h2 className="m-0 text-white text-lg">UNIVERSIDAD PERUANA CAYETANO HEREDIA</h2>
        </div>

        {/* Menú + Usuario — anclados a la derecha */}
        <div className="flex items-center gap-3 shrink-0">
          <button className="flex items-center gap-2 px-3 py-2 hover:bg-white/10 rounded transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            <span className="text-sm font-medium">Menú</span>
          </button>
          <div className="w-px h-6 bg-white/30" />
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-white/20 border border-white/40 flex items-center justify-center shrink-0">
              <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
              </svg>
            </div>
            <span className="text-sm font-medium">USUARIO</span>
          </div>
        </div>
      </div>
    </header>
  );
}
