import Navbar from "@/components/Navbar";

// Skeleton em formato de página, exibido instantaneamente ao clicar numa viagem
// enquanto o server component busca os dados (evita a sensação de "nada acontece").
export default function LoadingTripDetail() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="">
        {/* Hero / imagem */}
        <div className="h-64 sm:h-80 skeleton" />

        <div className="container-custom -mt-16 relative z-10 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Coluna principal */}
            <div className="lg:col-span-2 space-y-5">
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div className="h-7 skeleton rounded w-2/3" />
                <div className="h-4 skeleton rounded w-1/3" />
                <div className="space-y-2 pt-2">
                  <div className="h-3 skeleton rounded w-full" />
                  <div className="h-3 skeleton rounded w-11/12" />
                  <div className="h-3 skeleton rounded w-4/5" />
                </div>
              </div>
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-3">
                <div className="h-5 skeleton rounded w-1/4" />
                <div className="h-3 skeleton rounded w-full" />
                <div className="h-3 skeleton rounded w-5/6" />
              </div>
            </div>

            {/* Coluna lateral (preço/CTA) */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm space-y-4">
                <div className="h-8 skeleton rounded w-1/2" />
                <div className="h-4 skeleton rounded w-2/3" />
                <div className="h-11 skeleton rounded-xl w-full mt-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
