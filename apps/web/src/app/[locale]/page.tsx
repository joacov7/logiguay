import Link from 'next/link';
import { Truck, Package, MapPin, Shield, BarChart3, Zap } from 'lucide-react';

const features = [
  {
    icon: Package,
    title: 'Gestión de Cargas',
    description: 'Publicá y administrá cargas fácilmente. Sistema de cotizaciones en tiempo real.',
  },
  {
    icon: MapPin,
    title: 'Tracking en Vivo',
    description: 'Seguimiento GPS en tiempo real de tu flota con alertas automáticas.',
  },
  {
    icon: Truck,
    title: 'Gestión de Flota',
    description: 'Control total de vehículos, choferes y documentación con vencimientos.',
  },
  {
    icon: BarChart3,
    title: 'Analytics',
    description: 'Dashboard con KPIs, reportes de viajes y análisis de rentabilidad.',
  },
  {
    icon: Shield,
    title: 'Documentación',
    description: 'Control de vencimientos de seguros, VTV, licencias y más.',
  },
  {
    icon: Zap,
    title: 'Bolsa de Cargas',
    description: 'Marketplace de cargas disponibles. Conectamos dadores con transportistas.',
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 sticky top-0 bg-white z-10">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Truck className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">LOGIGUAY</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900">
              Iniciar sesión
            </Link>
            <Link
              href="/register"
              className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Registrarse gratis
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-blue-900 to-blue-700 text-white py-24">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-5xl font-bold mb-6 leading-tight">
            La plataforma de logística que necesitás
          </h1>
          <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
            Gestión integral de cargas, flota y transporte. Conectamos dadores de carga
            con transportistas de todo el país.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="bg-white text-blue-700 font-semibold px-8 py-4 rounded-xl hover:bg-blue-50 transition-colors text-lg"
            >
              Empezar gratis
            </Link>
            <Link
              href="/login"
              className="border-2 border-white text-white font-semibold px-8 py-4 rounded-xl hover:bg-white hover:text-blue-700 transition-colors text-lg"
            >
              Iniciar sesión
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center text-gray-900 mb-4">
            Todo lo que necesita tu empresa
          </h2>
          <p className="text-center text-gray-500 mb-16 max-w-2xl mx-auto">
            Una plataforma completa para gestionar cada aspecto de tu operación logística.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, title, description }) => (
              <div key={title} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                  <Icon className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24">
        <div className="max-w-5xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-16">Planes para cada necesidad</h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              { plan: 'FREE', price: '0', desc: 'Para empezar', features: ['1 vehículo', '5 cargas/mes', 'Tracking básico'] },
              { plan: 'PRO', price: '4.999', desc: 'Para PYMES', features: ['10 vehículos', 'Cargas ilimitadas', 'Tracking avanzado', 'Reportes'] },
              { plan: 'EMPRESA', price: '14.999', desc: 'Para empresas', features: ['50 vehículos', 'Todo PRO', 'API access', 'Soporte prioritario'] },
              { plan: 'FLOTA', price: '29.999', desc: 'Para grandes flotas', features: ['Ilimitado', 'Todo EMPRESA', 'Gestor dedicado', 'SLA garantizado'] },
            ].map(({ plan, price, desc, features }) => (
              <div key={plan} className={`p-6 rounded-xl border ${plan === 'PRO' ? 'border-blue-600 shadow-lg ring-2 ring-blue-600' : 'border-gray-200'}`}>
                <p className="text-sm font-medium text-gray-500 uppercase mb-1">{plan}</p>
                <p className="text-3xl font-bold text-gray-900 mb-1">${price}</p>
                <p className="text-sm text-gray-500 mb-4">ARS/mes — {desc}</p>
                <ul className="text-sm text-left space-y-2 mb-6">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-gray-600">
                      <span className="text-green-500">✓</span> {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={`block text-center py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                    plan === 'PRO'
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Comenzar
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Truck className="h-5 w-5 text-blue-400" />
            <span className="text-white font-bold">LOGIGUAY</span>
          </div>
          <p className="text-sm">© 2024 Logiguay. Plataforma de logística y transporte.</p>
        </div>
      </footer>
    </main>
  );
}
