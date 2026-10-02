import React, { useState, useMemo } from 'react';
import { X, Plus, Minus, Check, Sparkles, GlassWater, Cherry } from 'lucide-react';
import { Product, CartItem, SelectedModifier, ModifierGroup } from '../types';
import { formatRupiah } from '../utils/storage';

interface ModifierModalProps {
  product: Product;
  allProducts?: Product[];
  onAddToCart: (item: CartItem) => void;
  onClose: () => void;
}

export const ModifierModal: React.FC<ModifierModalProps> = ({
  product,
  allProducts = [],
  onAddToCart,
  onClose,
}) => {
  const [quantity, setQuantity] = useState(1);
  const [specialNote, setSpecialNote] = useState('');

  // Dynamically resolve modifier groups, enriching with stock-managed Cups and Toppings if available
  const effectiveModifierGroups = useMemo<ModifierGroup[]>(() => {
    const originalGroups = product.modifierGroups || [];
    if (!allProducts || allProducts.length === 0) return originalGroups;

    const cupItems = allProducts.filter((p) => p.category === 'cup' && p.isAvailable);
    const toppingItems = allProducts.filter((p) => p.category === 'topping' && p.isAvailable);

    return originalGroups.map((group) => {
      // If group is for Cup Size and we have cup items in stock inventory
      if ((group.id.includes('cup') || group.title.toLowerCase().includes('cup')) && cupItems.length > 0) {
        return {
          ...group,
          options: cupItems.map((c) => ({
            id: c.id,
            name: c.name.replace('Cup Sealer ', ''),
            price: c.price,
          })),
        };
      }
      // If group is for Toppings and we have topping items in stock inventory
      if ((group.id.includes('topping') || group.title.toLowerCase().includes('topping')) && toppingItems.length > 0) {
        return {
          ...group,
          options: toppingItems.map((t) => ({
            id: t.id,
            name: t.name,
            price: t.price,
          })),
        };
      }
      return group;
    });
  }, [product, allProducts]);

  // Pre-select default first options for required groups
  const [selectedModifiers, setSelectedModifiers] = useState<SelectedModifier[]>(() => {
    const initial: SelectedModifier[] = [];
    if (effectiveModifierGroups) {
      effectiveModifierGroups.forEach((group) => {
        if (group.type === 'single' && group.options.length > 0) {
          initial.push({
            groupId: group.id,
            groupTitle: group.title,
            optionId: group.options[0].id,
            name: group.options[0].name,
            price: group.options[0].price,
          });
        }
      });
    }
    return initial;
  });

  const handleToggleOption = (group: ModifierGroup, optId: string, optName: string, optPrice: number) => {
    if (group.type === 'single') {
      setSelectedModifiers((prev) => [
        ...prev.filter((m) => m.groupId !== group.id),
        {
          groupId: group.id,
          groupTitle: group.title,
          optionId: optId,
          name: optName,
          price: optPrice,
        },
      ]);
    } else {
      // multiple
      const exists = selectedModifiers.some((m) => m.groupId === group.id && m.optionId === optId);
      if (exists) {
        setSelectedModifiers((prev) =>
          prev.filter((m) => !(m.groupId === group.id && m.optionId === optId))
        );
      } else {
        const currentInGroup = selectedModifiers.filter((m) => m.groupId === group.id).length;
        if (group.max && currentInGroup >= group.max) {
          return; // reached limit
        }
        setSelectedModifiers((prev) => [
          ...prev,
          {
            groupId: group.id,
            groupTitle: group.title,
            optionId: optId,
            name: optName,
            price: optPrice,
          },
        ]);
      }
    }
  };

  const isSelected = (groupId: string, optId: string) => {
    return selectedModifiers.some((m) => m.groupId === groupId && m.optionId === optId);
  };

  // Calculate unit price: base price + modifier prices
  const modifiersTotal = selectedModifiers.reduce((acc, curr) => acc + curr.price, 0);
  const unitPrice = product.price + modifiersTotal;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    const modKey = selectedModifiers
      .map((m) => m.optionId)
      .sort()
      .join('-');
    const cartItemId = `${product.id}_${modKey}_${specialNote.trim()}`;

    const cartItem: CartItem = {
      cartItemId,
      product,
      quantity,
      selectedModifiers,
      unitPrice,
      totalPrice,
      specialNote: specialNote.trim() || undefined,
    };

    onAddToCart(cartItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-emerald-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative h-48 bg-emerald-950 shrink-0">
          <img
            src={product.image}
            alt={product.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-linear-to-t from-emerald-950 via-emerald-950/40 to-transparent" />
          <button
            onClick={onClose}
            className="absolute top-4 right-4 bg-black/50 hover:bg-black/80 text-white p-2 rounded-full backdrop-blur-xs transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-600/90 text-white inline-block mb-1.5">
              {product.category}
            </span>
            <h3 className="font-extrabold text-xl leading-snug drop-shadow-xs">{product.name}</h3>
            <p className="text-emerald-300 font-bold text-base mt-0.5">{formatRupiah(product.price)}</p>
          </div>
        </div>

        {/* Scrollable Modifier Options */}
        <div className="p-5 overflow-y-auto space-y-6 flex-1">
          {product.description && (
            <p className="text-xs text-stone-500 leading-relaxed bg-emerald-50/50 p-3 rounded-2xl border border-emerald-100">
              {product.description}
            </p>
          )}

          {effectiveModifierGroups && effectiveModifierGroups.length > 0 ? (
            effectiveModifierGroups.map((group) => {
              const isCup = group.id.includes('cup') || group.title.toLowerCase().includes('cup');
              const isTopping = group.id.includes('top') || group.title.toLowerCase().includes('top');

              return (
                <div key={group.id} className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-stone-900 uppercase tracking-wide flex items-center gap-1.5">
                      {isCup ? (
                        <GlassWater className="w-3.5 h-3.5 text-emerald-600" />
                      ) : isTopping ? (
                        <Cherry className="w-3.5 h-3.5 text-teal-600" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      {group.title}
                    </label>
                    <span className="text-[11px] font-semibold text-stone-400">
                      {group.type === 'single'
                        ? 'Pilih 1'
                        : group.max
                        ? `Maks. ${group.max} pilihan`
                        : 'Bisa pilih lebih dari 1'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {group.options.map((opt) => {
                      const active = isSelected(group.id, opt.id);
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => handleToggleOption(group, opt.id, opt.name, opt.price)}
                          className={`p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                            active
                              ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold ring-2 ring-emerald-300'
                              : 'border-stone-200 hover:border-emerald-200 hover:bg-emerald-50/30 text-stone-700 font-medium'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <div
                              className={`w-4 h-4 rounded-${
                                group.type === 'single' ? 'full' : 'md'
                              } border flex items-center justify-center shrink-0 ${
                                active
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : 'border-stone-300 bg-white'
                              }`}
                            >
                              {active && <Check className="w-3 h-3 stroke-[3]" />}
                            </div>
                            <span className="text-xs">{opt.name}</span>
                          </div>
                          {opt.price > 0 ? (
                            <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                              +{formatRupiah(opt.price)}
                            </span>
                          ) : (
                            <span className="text-[10px] text-stone-400 font-semibold shrink-0">
                              Standar
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          ) : (
            <p className="text-xs text-stone-400 italic">Produk standar tanpa opsi kustomisasi.</p>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-800 uppercase tracking-wide">
              Catatan Khusus (Opsional)
            </label>
            <input
              type="text"
              value={specialNote}
              onChange={(e) => setSpecialNote(e.target.value)}
              placeholder="Contoh: Pisahkan es / jangan terlalu manis / saus dipisah..."
              className="w-full text-xs px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-200 outline-hidden"
            />
          </div>
        </div>

        {/* Footer Actions: Quantity & Add Button */}
        <div className="p-4 bg-emerald-50/60 border-t border-emerald-100 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center border border-stone-300 rounded-xl bg-white p-1">
            <button
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-8 text-center font-bold text-sm text-stone-800">{quantity}</span>
            <button
              onClick={() => setQuantity((q) => q + 1)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-stone-600 hover:bg-stone-100 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleConfirm}
            className="flex-1 bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold py-3.5 px-4 rounded-2xl text-sm transition shadow-md hover:shadow-lg flex items-center justify-between cursor-pointer"
          >
            <span>Tambah ke Pesanan</span>
            <span className="text-emerald-200 font-extrabold">{formatRupiah(totalPrice)}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
