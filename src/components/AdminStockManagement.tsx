import React, { useState } from 'react';
import {
  Boxes,
  Plus,
  Edit2,
  Trash2,
  Sparkles,
  Search,
  Coffee,
  Utensils,
  Cookie,
  Layers,
  GlassWater,
  Cherry,
  SlidersHorizontal,
  Info,
} from 'lucide-react';
import { Product, ProductCategory, ModifierGroup } from '../types';
import { getStoredProducts, saveStoredProducts, formatRupiah } from '../utils/storage';

export const AdminStockManagement: React.FC<{ onProductsUpdated?: () => void }> = ({
  onProductsUpdated,
}) => {
  const [products, setProducts] = useState<Product[]>(() => getStoredProducts());
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');

  // Modal create/edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('minuman');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [unit, setUnit] = useState('Cup');
  const [image, setImage] = useState('');
  const [description, setDescription] = useState('');
  const [hasDefaultModifiers, setHasDefaultModifiers] = useState(true);

  // Filter products by category and search
  const filteredProducts = products.filter((p) => {
    let matchCat = false;
    if (categoryFilter === 'all') {
      matchCat = true;
    } else if (categoryFilter === 'cup_topping') {
      matchCat = p.category === 'cup' || p.category === 'topping';
    } else {
      matchCat = p.category === categoryFilter;
    }

    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.description.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // Calculate cup and topping totals for stats
  const cupProducts = products.filter((p) => p.category === 'cup');
  const toppingProducts = products.filter((p) => p.category === 'topping');
  const totalCupStock = cupProducts.reduce((acc, c) => acc + c.stock, 0);
  const totalToppingStock = toppingProducts.reduce((acc, t) => acc + t.stock, 0);

  const categoryTabs = [
    { id: 'all', label: 'Semua Stok', icon: Layers, count: products.length },
    { id: 'minuman', label: 'Minuman', icon: Coffee, count: products.filter((p) => p.category === 'minuman').length },
    { id: 'makanan', label: 'Makanan', icon: Utensils, count: products.filter((p) => p.category === 'makanan').length },
    { id: 'snack', label: 'Snack', icon: Cookie, count: products.filter((p) => p.category === 'snack').length },
    { id: 'cup', label: 'Cup & Kemasan (+Harga)', icon: GlassWater, count: cupProducts.length, highlight: 'cup' },
    { id: 'topping', label: 'Topping Terpisah', icon: Cherry, count: toppingProducts.length, highlight: 'topping' },
    { id: 'cup_topping', label: 'Ringkasan Cup + Topping', icon: SlidersHorizontal, count: cupProducts.length + toppingProducts.length, highlight: 'both' },
  ];

  const handleOpenAdd = (defaultCat: ProductCategory = 'minuman') => {
    setEditingProduct(null);
    setName('');
    setCategory(defaultCat);
    setPrice(defaultCat === 'cup' ? '0' : defaultCat === 'topping' ? '3000' : '24000');
    setStock(defaultCat === 'cup' ? '500' : defaultCat === 'topping' ? '150' : '100');
    setUnit(defaultCat === 'cup' ? 'Pcs' : defaultCat === 'topping' ? 'Porsi' : 'Cup');
    setImage(
      defaultCat === 'cup'
        ? 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80'
        : defaultCat === 'topping'
        ? 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80'
        : 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80'
    );
    setDescription(
      defaultCat === 'cup'
        ? 'Ukuran cup dengan tutup lid sealer untuk penyajian minuman.'
        : defaultCat === 'topping'
        ? 'Topping tambahan segar untuk melengkapi pesanan pelanggan.'
        : ''
    );
    setHasDefaultModifiers(defaultCat === 'minuman' || defaultCat === 'makanan');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategory(p.category);
    setPrice(p.price.toString());
    setStock(p.stock.toString());
    setUnit(p.unit);
    setImage(p.image);
    setDescription(p.description);
    setHasDefaultModifiers(!!(p.modifierGroups && p.modifierGroups.length > 0));
    setIsModalOpen(true);
  };

  const handleCategoryChangeInForm = (newCat: ProductCategory) => {
    setCategory(newCat);
    if (newCat === 'cup') {
      setUnit('Pcs');
      setHasDefaultModifiers(false);
      if (!price || price === '24000') setPrice('0');
      if (!stock || stock === '100') setStock('500');
    } else if (newCat === 'topping') {
      setUnit('Porsi');
      setHasDefaultModifiers(false);
      if (!price || price === '0' || price === '24000') setPrice('3000');
      if (!stock || stock === '100' || stock === '500') setStock('150');
    } else if (newCat === 'minuman') {
      setUnit('Cup');
      setHasDefaultModifiers(true);
    } else {
      setUnit('Porsi');
      setHasDefaultModifiers(true);
    }
  };

  const handleQuickStockChange = (productId: string, delta: number) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, stock: Math.max(0, p.stock + delta) };
      }
      return p;
    });
    setProducts(updated);
    saveStoredProducts(updated);
    if (onProductsUpdated) onProductsUpdated();
  };

  const handleToggleAvailable = (productId: string) => {
    const updated = products.map((p) => {
      if (p.id === productId) {
        return { ...p, isAvailable: !p.isAvailable };
      }
      return p;
    });
    setProducts(updated);
    saveStoredProducts(updated);
    if (onProductsUpdated) onProductsUpdated();
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Yakin ingin menghapus item ini dari inventaris?')) {
      const updated = products.filter((p) => p.id !== productId);
      setProducts(updated);
      saveStoredProducts(updated);
      if (onProductsUpdated) onProductsUpdated();
    }
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();

    let modifierGroups: ModifierGroup[] | undefined = undefined;

    // For drinks & food, create default modifier groups if enabled
    if (hasDefaultModifiers && (category === 'minuman' || category === 'makanan')) {
      if (category === 'minuman') {
        modifierGroups = [
          {
            id: 'mod-drink-cup',
            title: 'Ukuran Cup',
            type: 'single',
            required: true,
            options: [
              { id: 'opt-cup-reg', name: 'Reguler (16 oz)', price: 0 },
              { id: 'opt-cup-large', name: 'Large (22 oz)', price: 4000 },
            ],
          },
          {
            id: 'mod-drink-sugar',
            title: 'Level Kemanisan (Sugar)',
            type: 'single',
            required: true,
            options: [
              { id: 'opt-sug-100', name: 'Normal Sweet (100%)', price: 0 },
              { id: 'opt-sug-70', name: 'Less Sweet (70%)', price: 0 },
              { id: 'opt-sug-50', name: 'Half Sweet (50%)', price: 0 },
              { id: 'opt-sug-0', name: 'No Sugar (0%)', price: 0 },
            ],
          },
          {
            id: 'mod-drink-ice',
            title: 'Level Es (Ice)',
            type: 'single',
            required: true,
            options: [
              { id: 'opt-ice-normal', name: 'Normal Ice', price: 0 },
              { id: 'opt-ice-less', name: 'Less Ice', price: 0 },
              { id: 'opt-ice-none', name: 'No Ice', price: 0 },
            ],
          },
        ];
      } else if (category === 'makanan') {
        modifierGroups = [
          {
            id: 'mod-food-size',
            title: 'Porsi / Kemasan Box',
            type: 'single',
            required: true,
            options: [
              { id: 'opt-size-reg', name: 'Porsi Reguler (150gr)', price: 0 },
              { id: 'opt-size-jumbo', name: 'Porsi Jumbo (250gr)', price: 7000 },
            ],
          },
          {
            id: 'mod-food-spice',
            title: 'Level Kepedasan',
            type: 'single',
            required: true,
            options: [
              { id: 'opt-spc-0', name: 'Level 0: Gurih Manis', price: 0 },
              { id: 'opt-spc-1', name: 'Level 1: Sedang (Mild)', price: 0 },
              { id: 'opt-spc-2', name: 'Level 2: Pedas Mantap', price: 0 },
              { id: 'opt-spc-3', name: 'Level 3: Extra Hot 🔥', price: 0 },
            ],
          },
        ];
      }
    }

    if (editingProduct) {
      const updated = products.map((p) => {
        if (p.id === editingProduct.id) {
          return {
            ...p,
            name,
            category,
            price: Number(price) || 0,
            stock: Number(stock) || 0,
            unit,
            image: image || p.image,
            description,
            modifierGroups: modifierGroups || (category === 'cup' || category === 'topping' ? undefined : p.modifierGroups),
          };
        }
        return p;
      });
      setProducts(updated);
      saveStoredProducts(updated);
    } else {
      const newProd: Product = {
        id: 'prod-' + Date.now(),
        name,
        category,
        price: Number(price) || 0,
        stock: Number(stock) || 100,
        unit,
        image: image || (category === 'cup'
          ? 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80'
          : category === 'topping'
          ? 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80'
          : 'https://images.unsplash.com/photo-1558857563-b37cf2cb82b3?w=600&auto=format&fit=crop&q=80'),
        description,
        modifierGroups,
        isAvailable: true,
      };
      const updated = [newProd, ...products];
      setProducts(updated);
      saveStoredProducts(updated);
    }

    setIsModalOpen(false);
    if (onProductsUpdated) onProductsUpdated();
  };

  const getCategoryBadge = (cat: ProductCategory) => {
    switch (cat) {
      case 'cup':
        return (
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
            <GlassWater className="w-3 h-3 text-emerald-700" />
            Cup & Kemasan
          </span>
        );
      case 'topping':
        return (
          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800 border border-teal-300 flex items-center gap-1">
            <Cherry className="w-3 h-3 text-teal-700" />
            Topping Terpisah
          </span>
        );
      case 'minuman':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
            Minuman
          </span>
        );
      case 'makanan':
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            Makanan
          </span>
        );
      default:
        return (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 border border-stone-200 uppercase">
            {cat}
          </span>
        );
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 w-full space-y-6">
      {/* Top Banner - Light Green Aesthetic */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 bg-white p-5 rounded-3xl border border-emerald-100 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-stone-900">
                Manajemen Stok (Menu, Cup & Topping Terpisah)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Kelola stok cup sealer fisik, penambahan harga cup (reguler/large), dan kategori topping terpisah secara transparan.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Add Buttons */}
        <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
          <button
            onClick={() => handleOpenAdd('cup')}
            className="flex-1 lg:flex-none bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <GlassWater className="w-4 h-4 text-emerald-700" />
            <span>+ Tambah Cup (+Harga)</span>
          </button>
          <button
            onClick={() => handleOpenAdd('topping')}
            className="flex-1 lg:flex-none bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300 font-bold px-3.5 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
          >
            <Cherry className="w-4 h-4 text-teal-700" />
            <span>+ Tambah Topping Baru</span>
          </button>
          <button
            onClick={() => handleOpenAdd('minuman')}
            className="flex-1 lg:flex-none bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm hover:shadow transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Menu Baru</span>
          </button>
        </div>
      </div>

      {/* Special Highlights for Cup & Topping Categories */}
      {(categoryFilter === 'cup' || categoryFilter === 'topping' || categoryFilter === 'cup_topping') && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-200">
          {/* Cup Box Card */}
          <div className="bg-emerald-50/80 border border-emerald-200 p-4 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-1.5">
                <GlassWater className="w-4 h-4 text-emerald-700" />
                Kategori Cup & Kemasan (+Harga Tambahan)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900">
                {cupProducts.length} Varian Cup
              </span>
            </div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Atur jenis cup (misal Reguler 16oz Rp 0, Large 22oz +Rp 4.000). Total stok fisik cup: <strong>{totalCupStock} Pcs</strong>.
            </p>
          </div>

          {/* Topping Box Card */}
          <div className="bg-teal-50/80 border border-teal-200 p-4 rounded-3xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-teal-900 uppercase tracking-wider flex items-center gap-1.5">
                <Cherry className="w-4 h-4 text-teal-700" />
                Kategori Topping Terpisah (Harga Satuan)
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-200 text-teal-900">
                {toppingProducts.length} Varian Topping
              </span>
            </div>
            <p className="text-xs text-teal-800 leading-relaxed">
              Topping terpisah (Boba, Grass Jelly, Egg Pudding, Cheese Foam). Total porsi topping: <strong>{totalToppingStock} Porsi</strong>.
            </p>
          </div>
        </div>
      )}

      {/* Category Tabs & Search Bar */}
      <div className="space-y-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {categoryTabs.map((cat) => {
            const Icon = cat.icon;
            const isActive = categoryFilter === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`flex items-center gap-2 px-3.5 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition cursor-pointer shadow-2xs ${
                  isActive
                    ? 'bg-emerald-700 text-white shadow-sm ring-2 ring-emerald-400/40'
                    : 'bg-white text-stone-700 hover:bg-emerald-50 border border-emerald-100'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-200' : 'text-emerald-700'}`} />
                <span>{cat.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isActive ? 'bg-emerald-800 text-emerald-200' : 'bg-stone-100 text-stone-600'
                  }`}
                >
                  {cat.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Bar */}
        <div className="relative bg-white rounded-2xl border border-stone-200 shadow-xs p-2">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama menu, ukuran cup 16oz/22oz, boba, pudding, topping..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border-none focus:outline-hidden font-medium"
          />
        </div>
      </div>

      {/* Products & Stock Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-emerald-50/70 border-b border-emerald-100 text-emerald-950 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="py-3.5 px-4">Nama Item / Varian</th>
                <th className="py-3.5 px-4">Kategori Master</th>
                <th className="py-3.5 px-4">Harga / Penambahan</th>
                <th className="py-3.5 px-4">Sisa Stok Fisik</th>
                <th className="py-3.5 px-4">Atur Cepat (+/-)</th>
                <th className="py-3.5 px-4">Status POS</th>
                <th className="py-3.5 px-4 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-medium">
              {filteredProducts.map((p) => {
                const isLowStock = p.stock < 20;
                return (
                  <tr key={p.id} className="hover:bg-emerald-50/40 transition">
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <img
                          src={p.image}
                          alt={p.name}
                          className="w-10 h-10 rounded-xl object-cover border border-emerald-100 shadow-2xs"
                        />
                        <div>
                          <div className="font-extrabold text-stone-900">{p.name}</div>
                          <p className="text-[11px] text-stone-500 line-clamp-1 max-w-xs">{p.description}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getCategoryBadge(p.category)}
                    </td>

                    <td className="py-3.5 px-4 font-black whitespace-nowrap">
                      {p.category === 'cup' ? (
                        p.price > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 font-bold">
                            +{formatRupiah(p.price)} / cup
                          </span>
                        ) : (
                          <span className="text-stone-600 bg-stone-100 px-2 py-0.5 rounded-lg">
                            Standar (Rp 0)
                          </span>
                        )
                      ) : p.category === 'topping' ? (
                        <span className="text-teal-800 bg-teal-50 px-2 py-0.5 rounded-lg border border-teal-200 font-bold">
                          {formatRupiah(p.price)} / porsi
                        </span>
                      ) : (
                        <span className="text-stone-900 font-bold">
                          {formatRupiah(p.price)}
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-mono font-bold text-sm ${
                            isLowStock ? 'text-amber-600 font-black' : 'text-stone-900'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                        {isLowStock && (
                          <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-amber-200">
                            Stok Menipis
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleQuickStockChange(p.id, -10)}
                          className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer"
                        >
                          -10
                        </button>
                        <button
                          onClick={() => handleQuickStockChange(p.id, -1)}
                          className="px-2 py-1 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-700 text-[10px] font-bold cursor-pointer"
                        >
                          -1
                        </button>
                        <button
                          onClick={() => handleQuickStockChange(p.id, 1)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer"
                        >
                          +1
                        </button>
                        <button
                          onClick={() => handleQuickStockChange(p.id, 10)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer"
                        >
                          +10
                        </button>
                        <button
                          onClick={() => handleQuickStockChange(p.id, 50)}
                          className="px-2 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[10px] font-bold cursor-pointer"
                        >
                          +50
                        </button>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <button
                        onClick={() => handleToggleAvailable(p.id)}
                        className={`text-[10px] font-bold px-2.5 py-1 rounded-full border transition cursor-pointer ${
                          p.isAvailable
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : 'bg-stone-100 text-stone-500 border-stone-200'
                        }`}
                      >
                        {p.isAvailable ? '✓ Tersedia di Kasir' : '✕ Dinonaktifkan'}
                      </button>
                    </td>

                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(p)}
                          className="p-1.5 rounded-xl border border-stone-200 hover:border-emerald-300 hover:bg-emerald-50 text-stone-600 hover:text-emerald-700 transition cursor-pointer"
                          title="Edit Item"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p.id)}
                          className="p-1.5 rounded-xl border border-stone-200 hover:border-red-300 hover:bg-red-50 text-stone-400 hover:text-red-600 transition cursor-pointer"
                          title="Hapus Item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400 text-xs">
                    Tidak ada item ditemukan dalam kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Add / Edit Product */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-emerald-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            <div className="bg-linear-to-r from-emerald-800 to-teal-800 text-white p-5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-700/60 flex items-center justify-center font-bold">
                  {category === 'cup' ? (
                    <GlassWater className="w-4 h-4 text-emerald-200" />
                  ) : category === 'topping' ? (
                    <Cherry className="w-4 h-4 text-teal-200" />
                  ) : (
                    <Boxes className="w-4 h-4 text-emerald-200" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-base">
                    {editingProduct
                      ? `Edit ${category === 'cup' ? 'Cup & Kemasan' : category === 'topping' ? 'Topping' : 'Menu'}`
                      : category === 'cup'
                      ? 'Tambah Cup & Kemasan Baru (+Harga)'
                      : category === 'topping'
                      ? 'Tambah Topping Baru (Kategori Terpisah)'
                      : 'Tambah Menu / Produk Baru'}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    {category === 'cup'
                      ? 'Atur ukuran cup dan penambahan harga untuk kasir'
                      : category === 'topping'
                      ? 'Atur topping terpisah beserta harga dan stok porsi'
                      : 'Simpan ke inventaris kasir HAYPOP'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-emerald-200 hover:text-white p-2 rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-5 overflow-y-auto space-y-4 flex-1">
              {/* Category selector in modal */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Pilih Kategori</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  <button
                    type="button"
                    onClick={() => handleCategoryChangeInForm('cup')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      category === 'cup'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <GlassWater className="w-4 h-4 text-emerald-600" />
                    <span>Cup & Kemasan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChangeInForm('topping')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      category === 'topping'
                        ? 'border-teal-500 bg-teal-50 text-teal-950 ring-2 ring-teal-300'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Cherry className="w-4 h-4 text-teal-600" />
                    <span>Topping</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChangeInForm('minuman')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      category === 'minuman'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Coffee className="w-4 h-4 text-emerald-600" />
                    <span>Minuman</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChangeInForm('makanan')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      category === 'makanan'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Utensils className="w-4 h-4 text-amber-600" />
                    <span>Makanan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCategoryChangeInForm('snack')}
                    className={`p-2 rounded-xl border text-xs font-bold transition flex flex-col items-center gap-1 cursor-pointer ${
                      category === 'snack'
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-300'
                        : 'border-stone-200 text-stone-600'
                    }`}
                  >
                    <Cookie className="w-4 h-4 text-amber-600" />
                    <span>Snack</span>
                  </button>
                </div>
              </div>

              {/* Item Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">
                  {category === 'cup'
                    ? 'Nama Cup / Ukuran Kemasan'
                    : category === 'topping'
                    ? 'Nama Topping Terpisah'
                    : 'Nama Menu / Produk'}
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={
                    category === 'cup'
                      ? 'Contoh: Cup Sealer Large 22 oz'
                      : category === 'topping'
                      ? 'Contoh: Boba Pearl Brown Sugar'
                      : 'Contoh: Matcha Kyoto Cream Cloud'
                  }
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                />
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase">
                    {category === 'cup'
                      ? 'Penambahan Harga (Rp)'
                      : category === 'topping'
                      ? 'Harga Topping (Rp)'
                      : 'Harga Satuan (Rp)'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    step={500}
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="0"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                  />
                  {category === 'cup' && (
                    <span className="text-[10px] text-stone-500 block">
                      Isi 0 jika ukuran standar (gratis)
                    </span>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase">
                    {category === 'cup'
                      ? 'Stok Fisik Cup'
                      : category === 'topping'
                      ? 'Stok Porsi Topping'
                      : 'Stok Tersedia'}
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    placeholder="100"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-mono font-bold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-700 uppercase">Satuan</label>
                  <input
                    type="text"
                    required
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    placeholder="Pcs/Cup/Porsi"
                    className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 font-semibold focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
                  />
                </div>
              </div>

              {/* Image URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Foto Item (URL Gambar)</label>
                <input
                  type="url"
                  value={image}
                  onChange={(e) => setImage(e.target.value)}
                  placeholder="https://..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden font-mono"
                />
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-700 uppercase">Deskripsi / Keterangan</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan rasa, ketebalan cup, porsi topping, atau rempah..."
                  className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-300 focus:border-emerald-500 outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-stone-300 text-stone-700 font-bold text-xs hover:bg-stone-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                >
                  Simpan ke Inventaris
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
