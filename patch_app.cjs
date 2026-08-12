const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

code = code.replace(
  "import { useVehicles } from './hooks/useVehicles';",
  "import { useVehicles } from './hooks/useVehicles';\nimport { useVehicle } from './hooks/useVehicle';"
);

code = code.replace(
  "function CarDetailsWrapper({ cars, onSubmitLead }: { cars: Car[], onSubmitLead: any }) {",
  "function CarDetailsWrapper({ onSubmitLead }: { onSubmitLead: any }) {"
);

// We need to replace the entire CarDetailsWrapper function.
const oldWrapper = `function CarDetailsWrapper({ onSubmitLead }: { onSubmitLead: any }) {
  const { vehicleId } = useParams();
  const navigate = useNavigate();
  const car = cars.find(c => c.id === vehicleId);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [vehicleId]);

  if (!car) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center">
        <h2 className="text-2xl font-bold text-slate-800 mb-4">Veículo não encontrado</h2>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-red-600 text-white rounded-xl font-bold">Voltar ao Catálogo</button>
      </div>
    );
  }

  return (
    <CarDetails
      car={car}
      onBack={() => navigate('/')}
      onSubmitLead={onSubmitLead}
    />
  );
}`;

const newWrapper = `function CarDetailsWrapper({ onSubmitLead }: { onSubmitLead: any }) {
  const { vehicleId } = useParams<{ vehicleId: string }>();
  const decodedVehicleId = vehicleId ? decodeURIComponent(vehicleId).trim() : null;
  const navigate = useNavigate();

  const { vehicle, loading, error, refetch, incrementViews } = useVehicle(decodedVehicleId);
  const hasIncremented = React.useRef(false);

  useEffect(() => {
    if (vehicle?.id) {
      window.scrollTo({
        top: 0,
        left: 0,
        behavior: 'instant'
      });
      if (!hasIncremented.current) {
        incrementViews();
        hasIncremented.current = true;
      }
    }
  }, [vehicle?.id, incrementViews]);

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-32 text-center bg-slate-50">
         <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mb-4"></div>
         <p className="text-slate-500 font-medium">Carregando detalhes do veículo...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4 bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Erro ao carregar</h2>
        <p className="text-slate-500 mb-6">{error}</p>
        <div className="flex gap-4">
          <button onClick={refetch} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">Tentar novamente</button>
          <button onClick={() => navigate('/')} className="px-6 py-3 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors">Voltar ao Estoque</button>
        </div>
      </div>
    );
  }

  if (!vehicle) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center py-20 text-center px-4 bg-slate-50">
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Veículo não encontrado</h2>
        <p className="text-slate-500 mb-6">O veículo que você está procurando pode ter sido vendido ou não existe mais.</p>
        <button onClick={() => navigate('/')} className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold transition-colors">Voltar ao Catálogo</button>
      </div>
    );
  }

  return (
    <CarDetails 
      car={vehicle} 
      onBack={() => navigate('/')} 
      onSubmitLead={onSubmitLead} 
    />
  );
}`;

code = code.replace(oldWrapper, newWrapper);

code = code.replace(
  "<CarDetailsWrapper cars={cars} onSubmitLead={handleSubmitLead} />",
  "<CarDetailsWrapper onSubmitLead={handleSubmitLead} />"
);

// We should also remove `vehicleService.incrementViews(car.id);` from `handleSelectCarDetails`
// as it's now handled by the Wrapper (and only once).
code = code.replace(
  "const handleSelectCarDetails = (car: Car) => {\n    vehicleService.incrementViews(car.id);\n    navigate(`/veiculo/${encodeURIComponent(car.id)}`);\n  };",
  "const handleSelectCarDetails = (car: Car) => {\n    navigate(`/veiculo/${encodeURIComponent(car.id)}`);\n  };"
);

// Fallback if encodeURIComponent is not yet added in handleSelectCarDetails
code = code.replace(
  "const handleSelectCarDetails = (car: Car) => {\n    vehicleService.incrementViews(car.id);\n    navigate(`/veiculo/${car.id}`);\n  };",
  "const handleSelectCarDetails = (car: Car) => {\n    navigate(`/veiculo/${encodeURIComponent(car.id)}`);\n  };"
);

code = code.replace(
  "const handleSelectCarDetails = (car: Car) => {\n    navigate(`/veiculo/\\${car.id}`);\n  };",
  "const handleSelectCarDetails = (car: Car) => {\n    navigate(`/veiculo/\\${encodeURIComponent(car.id)}`);\n  };"
);

fs.writeFileSync('src/App.tsx', code);
