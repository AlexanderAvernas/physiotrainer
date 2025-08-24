import Link from 'next/link'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pt-20 pb-16">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Fysio<span className="text-indigo-600">SaaS</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 mb-8">
              Träningsprogram för fysioterapeuter
            </p>
            <p className="text-lg text-gray-500 mb-12 max-w-2xl mx-auto">
              Skapa personliga träningsprogram, hantera patienter och följ upp framsteg -
              allt i en plattform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/register"
                className="bg-indigo-600 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-700 transition-colors"
              >
                Kom igång gratis
              </Link>
              <Link
                href="/login"
                className="bg-white text-indigo-600 border-2 border-indigo-600 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-indigo-50 transition-colors"
              >
                Logga in
              </Link>
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 pt-16">
          <div className="text-center p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">👥</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Patienthantering</h3>
            <p className="text-gray-600">Håll koll på dina patienter och deras framsteg</p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">💪</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Övningsbibliotek</h3>
            <p className="text-gray-600">Stort bibliotek med övningar och variationer</p>
          </div>

          <div className="text-center p-6">
            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Personliga program</h3>
            <p className="text-gray-600">Skapa skräddarsydda träningsprogram</p>
          </div>
        </div>
      </div>
    </div>
  )
}
