import Link from 'next/link';
import Image from 'next/image';
import {
  Package, MapPin, BarChart3,
  CheckCircle, ArrowRight, Truck,
} from 'lucide-react';

// ─── How it works ───────────────────────────────────────────────────────────
const STEPS = [
  {
    n: '1',
    title: 'Publicá tu carga',
    desc: 'Completá los datos de origen, destino y tipo de mercadería. Tarda menos de 2 minutos.',
  },
  {
    n: '2',
    title: 'Recibís ofertas',
    desc: 'Los transportistas ven tu carga y te mandan su cotización. Comparás y elegís el mejor.',
  },
  {
    n: '3',
    title: 'Elegís la mejor opción',
    desc: 'Aceptás la cotización que más te convenga y el transporte queda confirmado automáticamente.',
  },
  {
    n: '4',
    title: 'Seguís el envío en vivo',
    desc: 'Tracking en tiempo real desde que sale hasta que llega. Siempre sabés dónde está tu carga.',
  },
];

// ─── Solutions ───────────────────────────────────────────────────────────────
const SOLUTIONS = [
  {
    icon: Package,
    title: 'Bolsa de Cargas',
    desc: 'Marketplace donde dadores y transportistas se conectan. Publicás y recibís ofertas al instante.',
  },
  {
    icon: Truck,
    title: 'Gestión de Flota',
    desc: 'Control de vehículos, choferes, vencimientos y documentación en un solo lugar.',
  },
  {
    icon: MapPin,
    title: 'Tracking en Vivo',
    desc: 'GPS en tiempo real, alertas automáticas y registro de cada evento del viaje.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    desc: 'Reportes de viajes, rentabilidad por ruta y KPIs para tomar mejores decisiones.',
  },
];

// ─── Provinces ────────────────────────────────────────────────────────────────
const PROVINCES = ['Córdoba', 'Buenos Aires', 'Santa Fe', 'Chaco', 'Tucumán', 'Todo el país'];

// ─── Plans ───────────────────────────────────────────────────────────────────
const PLANS = [
  {
    name: 'FREE',
    price: '$0',
    period: 'Gratis para siempre',
    features: ['3 vehículos', '3 choferes', '10 publicaciones/mes', 'Acceso a la bolsa'],
    cta: 'Empezar gratis',
    highlight: false,
  },
  {
    name: 'PRO',
    price: '$4.999',
    period: 'ARS / mes',
    features: ['15 vehículos', '15 choferes', '100 publicaciones/mes', 'Publicaciones destacadas', 'Exportar reportes'],
    cta: 'Elegir PRO',
    highlight: true,
  },
  {
    name: 'EMPRESA',
    price: '$14.990',
    period: 'ARS / mes',
    features: ['50 vehículos', '50 choferes', '500 publicaciones/mes', 'Todo lo de PRO', 'Soporte prioritario'],
    cta: 'Elegir EMPRESA',
    highlight: false,
  },
  {
    name: 'FLOTA',
    price: '$29.999',
    period: 'ARS / mes',
    features: ['Ilimitado', 'Choferes ilimitados', 'Publicaciones ilimitadas', 'Todo lo de EMPRESA', 'Gestor dedicado'],
    cta: 'Elegir FLOTA',
    highlight: false,
  },
];

// ─── Stats ────────────────────────────────────────────────────────────────────
const STATS = [
  { value: '+1.250', label: 'Empresas registradas' },
  { value: '+480', label: 'Transportistas activos' },
  { value: '+3.200', label: 'Viajes realizados' },
  { value: '+$900.000', label: 'En transacciones' },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white font-sans">

      {/* ── Navbar ── */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link href="/">
            <Image src="/logo-logiguay.png" alt="Logiguay" width={160} height={48} className="h-10 w-auto" priority />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-gray-600">
            <a href="#como-funciona" className="hover:text-gray-900 transition-colors">Cómo funciona</a>
            <a href="#soluciones" className="hover:text-gray-900 transition-colors">Soluciones</a>
            <a href="#precios" className="hover:text-gray-900 transition-colors">Precios</a>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden sm:block text-sm font-medium text-gray-700 hover:text-gray-900 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Inicia sesión
            </Link>
            <Link
              href="/register"
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-colors"
              style={{ backgroundColor: '#15A66A' }}
            >
              Registrarse gratis
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative bg-gray-900 text-white overflow-hidden min-h-[560px]">
        {/* Truck background image */}
        <Image
          src="/camion-hero.png"
          alt="Camión Logiguay"
          fill
          className="object-cover object-center"
          priority
        />
        {/* Dark + green gradient overlay so text is readable */}
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(10,28,18,0.92) 0%, rgba(10,28,18,0.75) 55%, rgba(10,28,18,0.3) 100%)' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 lg:py-28">
          <div className="max-w-2xl">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
              Más viajes.<br />
              <span style={{ color: '#7dd4aa' }}>Menos kilómetros vacíos.</span>
            </h1>
            <p className="text-lg text-gray-300 mb-8 max-w-xl leading-relaxed">
              Conectamos dadores de carga con transportistas en todo el país. Publicá, cotizá y seguí cada envío en tiempo real.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold text-white transition-colors"
                style={{ backgroundColor: '#15A66A' }}
              >
                Publicar una carga <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl font-semibold border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
              >
                Buscar carga disponible
              </Link>
            </div>

            {/* Stats row */}
            <div className="mt-14 grid grid-cols-2 sm:grid-cols-4 gap-6">
              {STATS.map(({ value, label }) => (
                <div key={label}>
                  <p className="text-2xl font-extrabold" style={{ color: '#7dd4aa' }}>{value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section id="como-funciona" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">¿Cómo funciona?</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Empezar es simple. En minutos ya estás operando.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {STEPS.map(({ n, title, desc }) => (
              <div key={n} className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 relative">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg mb-4"
                  style={{ backgroundColor: '#15A66A' }}
                >
                  {n}
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Soluciones ── */}
      <section id="soluciones" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Soluciones para cada necesidad</h2>
            <p className="mt-3 text-gray-500 max-w-xl mx-auto">Una plataforma completa para gestionar toda tu operación.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {SOLUTIONS.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow group"
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4 transition-colors"
                  style={{ backgroundColor: '#f0faf5' }}
                >
                  <Icon className="h-6 w-6" style={{ color: '#15A66A' }} />
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pensado para el agro ── */}
      <section className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <span
                className="inline-block text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full mb-4"
                style={{ backgroundColor: '#dcf5e8', color: '#108a57' }}
              >
                Agro y logística
              </span>
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Pensado para el agro y la logística
              </h2>
              <p className="text-gray-500 leading-relaxed mb-8">
                Operamos en todo el país. Conectamos productores, acopios y exportadoras con transportistas de carga a granel, refrigerada y general.
              </p>
              <div className="flex flex-wrap gap-2">
                {PROVINCES.map((p) => (
                  <span
                    key={p}
                    className="px-3 py-1.5 text-sm font-medium rounded-full border"
                    style={{ borderColor: '#b8ebd1', color: '#108a57', backgroundColor: '#f0faf5' }}
                  >
                    {p}
                  </span>
                ))}
              </div>
              <div className="mt-8">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
                  style={{ color: '#15A66A' }}
                >
                  Empezar ahora <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            {/* Fake map / visual */}
            <div
              className="rounded-2xl overflow-hidden h-72 lg:h-96 flex items-center justify-center relative"
              style={{ background: 'linear-gradient(135deg, #0d3d22 0%, #15A66A 100%)' }}
            >
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: 'radial-gradient(circle at 30% 40%, white 1px, transparent 1px), radial-gradient(circle at 70% 60%, white 1px, transparent 1px), radial-gradient(circle at 50% 80%, white 1px, transparent 1px)',
                backgroundSize: '80px 80px',
              }} />
              <div className="text-center text-white relative z-10 px-6">
                <MapPin className="h-14 w-14 mx-auto mb-3 opacity-90" />
                <p className="text-2xl font-bold">Todo el país</p>
                <p className="text-sm text-green-200 mt-1">Cobertura nacional</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Precios ── */}
      <section id="precios" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900">Planes para cada etapa de tu negocio</h2>
            <p className="mt-3 text-gray-500">Empezá gratis, escalá cuando lo necesites.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {PLANS.map(({ name, price, period, features, cta, highlight }) => (
              <div
                key={name}
                className={`relative rounded-2xl p-6 flex flex-col border-2 transition-shadow ${
                  highlight
                    ? 'shadow-xl'
                    : 'border-gray-200 shadow-sm hover:shadow-md'
                }`}
                style={highlight ? { borderColor: '#15A66A', boxShadow: '0 8px 30px rgba(21,166,106,0.15)' } : {}}
              >
                {highlight && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold text-white px-3 py-1 rounded-full"
                    style={{ backgroundColor: '#15A66A' }}
                  >
                    Recomendado
                  </span>
                )}
                <div className="mb-5">
                  <p className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-1">{name}</p>
                  <p className="text-3xl font-extrabold text-gray-900">{price}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{period}</p>
                </div>
                <ul className="space-y-2 flex-1 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 shrink-0" style={{ color: '#15A66A' }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 px-4 rounded-xl text-sm font-semibold transition-colors ${
                    highlight
                      ? 'text-white'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                  style={highlight ? { backgroundColor: '#15A66A' } : {}}
                >
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section
        className="py-20 text-white text-center"
        style={{ background: 'linear-gradient(135deg, #0d3d22 0%, #15A66A 100%)' }}
      >
        <div className="max-w-2xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">¿Listo para optimizar tu logística?</h2>
          <p className="text-green-100 mb-8 text-lg">
            Registrate gratis y empezá a conectar cargas con transportistas hoy mismo.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-bold text-gray-900 bg-white hover:bg-gray-50 transition-colors"
            >
              Crear cuenta gratis <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl font-semibold border-2 border-white/40 text-white hover:bg-white/10 transition-colors"
            >
              Ya tengo cuenta
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-gray-900 text-gray-400 py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Image src="/logo-logiguay.png" alt="Logiguay" width={120} height={36} className="h-8 w-auto brightness-0 invert" />
            <nav className="flex items-center gap-6 text-xs">
              <a href="#como-funciona" className="hover:text-white transition-colors">Cómo funciona</a>
              <a href="#soluciones" className="hover:text-white transition-colors">Soluciones</a>
              <a href="#precios" className="hover:text-white transition-colors">Precios</a>
              <Link href="/login" className="hover:text-white transition-colors">Iniciar sesión</Link>
              <Link href="/register" className="hover:text-white transition-colors">Registrarse</Link>
            </nav>
            <p className="text-xs">© {new Date().getFullYear()} Logiguay. Todos los derechos reservados.</p>
          </div>
        </div>
      </footer>

    </main>
  );
}
