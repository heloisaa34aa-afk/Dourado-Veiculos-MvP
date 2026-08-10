    return () => clearInterval(interval);
  }, [activeFeaturedCars]);

  // Financial Quote request states
  const [simCarId, setSimCarId] = useState<string>('');
  const [finName, setFinName] = useState('');
  const [finPhone, setFinPhone] = useState('');
  const [finEmail, setFinEmail] = useState('');
  const [finMessage, setFinMessage] = useState('');
  const [finSuccess, setFinSuccess] = useState(false);
  const [finLoading, setFinLoading] = useState(false);

  // Set initial car ID when cars are loaded
  useEffect(() => {
    if (cars.length > 0 && !simCarId) {
      setSimCarId(cars[0].id);
    }
  }, [cars]);

  // Unique list of brands currently available in inventory
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    cars.forEach(car => brands.add(car.brand));
    return ['Todos', ...Array.from(brands)];
  }, [cars]);

  // Public filtered catalog computed query
  const filteredCatalog = useMemo(() => {
    return cars.filter(car => {
      const matchSearch = 
        car.brand.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
        car.version.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchCategory = selectedCategory === 'Todos' || car.category === selectedCategory;
      const matchBrand = selectedBrand === 'Todos' || car.brand === selectedBrand;

      return matchSearch && matchCategory && matchBrand;
    });
  }, [cars, searchQuery, selectedCategory, selectedBrand]);

  // Categories lists with helper icons and description meta
  const categoriesList = useMemo(() => {
    if (dbCategories && dbCategories.length > 0) {
      return dbCategories.map(cat => ({
        name: cat.name as CarCategory,
        icon: cat.icon || '🚗',
        count: cars.filter(c => c.category === cat.name || c.categoryId === cat.id).length
      }));
    }
    return [
      { name: 'Hatch' as CarCategory, icon: '🚗', count: cars.filter(c => c.category === 'Hatch').length },
      { name: 'SUV' as CarCategory, icon: '🚙', count: cars.filter(c => c.category === 'SUV').length },
      { name: 'Sedan' as CarCategory, icon: '🚘', count: cars.filter(c => c.category === 'Sedan').length },
      { name: 'Picape' as CarCategory, icon: '🛻', count: cars.filter(c => c.category === 'Picape').length },
      { name: 'Utilitário' as CarCategory, icon: '🚐', count: cars.filter(c => c.category === 'Utilitário').length },
      { name: 'Popular' as CarCategory, icon: '🏎️', count: cars.filter(c => c.category === 'Popular').length },
    ];
  }, [dbCategories, cars]);

  // Action methods: adding, editing and deleting
  const handleAddCar = async (newCar: Car) => {
    try {
      await addVehicle(newCar);
    } catch (err) {
      console.error('Error adding vehicle:', err);
    }
  };

  const handleEditCar = async (updatedCar: Car) => {
    try {
      const updated = await updateVehicle(updatedCar.id, updatedCar);
    } catch (err) {
      console.error('Error updating vehicle:', err);
    }
  };

  const handleDeleteCar = async (id: string) => {
    try {
      await deleteVehicle(id);
    } catch (err) {
      console.error('Error deleting vehicle:', err);
    }
  };

  const handleUpdateMessageStatus = async (id: string, status: LeadMessage['status']) => {
    try {
      await updateLeadStatus(id, status);
    } catch (err) {
      console.error('Error updating message status:', err);
    }
  };

  const handleDeleteMessage = async (id: string) => {
    try {
      await deleteLead(id);
    } catch (err) {
      console.error('Error deleting message:', err);
    }
  };

  const handleSubmitLead = async (leadData: Omit<LeadMessage, 'id' | 'createdAt' | 'status'>) => {
    try {
      await addLead(leadData);
      if (leadData.carId) {
        await vehicleService.incrementWhatsappClicks(leadData.carId);
      }
    } catch (err) {
      console.error('Error submitting lead:', err);
    }
  };

  const handleFinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finName || !finPhone || !simCarId) {
      alert('Por favor, preencha o nome, telefone e escolha um veículo de interesse.');
      return;
    }
    setFinLoading(true);
    try {
      const selectedCarObj = cars.find(c => c.id === simCarId);
      const carTitle = selectedCarObj ? \`\${selectedCarObj.brand} \${selectedCarObj.model}\` : 'Veículo';
      await handleSubmitLead({
        carId: simCarId,
        carTitle,
        name: finName,
        phone: finPhone,
        email: finEmail,
        message: \`[Solicitação de Financiamento] \${finMessage || 'Olá, gostaria de solicitar uma análise de crédito para este veículo.'}\`
      });
      setFinSuccess(true);
      setFinName('');
      setFinPhone('');
      setFinEmail('');
      setFinMessage('');
      setTimeout(() => {
        setFinSuccess(false);
      }, 5000);
    } catch (err) {
      console.error('Error submitting financing lead:', err);
    } finally {
      setFinLoading(false);
    }
  };

  const navigate = useNavigate();

  const handleSelectCarDetails = (car: Car) => {
    vehicleService.incrementViews(car.id);
    navigate(\`/veiculo/\${car.id}\`);
  };

  const resetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('Todos');
    setSelectedBrand('Todos');
  };
