import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  runTransaction,
  deleteDoc,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import {
  ShoppingCart,
  Package,
  BarChart3,
  Plus,
  Search,
  AlertTriangle,
  Printer,
  Trash2,
  CheckCircle,
  DollarSign,
  Layers,
  Tag,
  QrCode,
  Banknote,
  Percent,
  Check,
} from 'lucide-react';

// Credenciales oficiales de tu proyecto Boutik
const firebaseConfig = {
  apiKey: 'AIzaSyCYsn5sI-JKPDNoL3QCdI4hbQYsnZk_NuQ',
  authDomain: 'boutik-9e232.firebaseapp.com',
  projectId: 'boutik-9e232',
  storageBucket: 'boutik-9e232.firebasestorage.app',
  messagingSenderId: '1099467104375',
  appId: '1:1099467104375:web:091abfc45188031f6de672',
};

// Inicialización de Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

// Catálogo base de respaldo
const INITIAL_DEMO_PRODUCTS = [
  {
    id: 'vestido-floral-verano',
    nombre: 'Vestido Floral de Verano',
    categoria: 'Ropa de Mujer',
    subcategoria: 'Vestidos',
    variantes: [
      {
        id: 'v1',
        talla: 'S',
        color: 'Azul Marino',
        stock: 12,
        stockMinimo: 3,
        costo: 15.0,
        precio: 32.0,
      },
      {
        id: 'v2',
        talla: 'M',
        color: 'Azul Marino',
        stock: 8,
        stockMinimo: 3,
        costo: 15.0,
        precio: 32.0,
      },
      {
        id: 'v3',
        talla: 'L',
        color: 'Blanco Perla',
        stock: 2,
        stockMinimo: 4,
        costo: 16.0,
        precio: 34.0,
      },
    ],
  },
  {
    id: 'pantalon-jean-slim',
    nombre: 'Pantalón Jean Slim Fit',
    categoria: 'Pantalones',
    subcategoria: 'Jeans',
    variantes: [
      {
        id: 'p1',
        talla: '30',
        color: 'Azul Clásico',
        stock: 15,
        stockMinimo: 5,
        costo: 18.0,
        precio: 40.0,
      },
      {
        id: 'p2',
        talla: '32',
        color: 'Negro Ónix',
        stock: 1,
        stockMinimo: 3,
        costo: 18.0,
        precio: 40.0,
      },
    ],
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('vender');
  const [user, setUser] = useState(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  const [products, setProducts] = useState([])
  const [sales, setSales] = useState([]);

  // Estado POS
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('Todas');
  const [cartItem, setCartItem] = useState(null);
  const [cartQty, setCartQty] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [manualTotalInput, setManualTotalInput] = useState('');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState(null);
  const [annulLoadingId, setAnnulLoadingId] = useState(null);

  // Modal Nuevo Producto
  const [showAddProductModal, setShowAddProductModal] = useState(false);
  const [newProdName, setNewProdName] = useState('');
  const [newProdCat, setNewProdCat] = useState('Ropa');
  const [newProdSubCat, setNewProdSubCat] = useState('General');
  const [newVariants, setNewVariants] = useState([
    {
      id: '1',
      talla: 'M',
      color: 'Negro',
      stock: 10,
      stockMinimo: 3,
      costo: 10,
      precio: 20,
    },
  ]);

  // Autenticación en segundo plano
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setIsFirebaseConnected(true);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.warn('Auth Anónima pendiente o en proceso:', err.message);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Sincronización en tiempo real (Firestore)
  useEffect(() => {
    if (!user) return;

    const unsubProducts = onSnapshot(collection(db, "products"), (snapshot) => {
      const prodList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProducts(prodList);
      setIsFirebaseConnected(true);
    }, (error) => console.warn("Firestore products:", error.message));

    const qSales = query(
      collection(db, 'sales'),
      orderBy('timestamp', 'desc'),
      limit(60)
    );
    const unsubSales = onSnapshot(
      qSales,
      (snapshot) => {
        const salesList = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setSales(salesList);
        setIsFirebaseConnected(true);
      },
      (error) => console.warn('Firestore sales:', error.message)
    );

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, [user]);

  // Cálculos de venta activa
  const standardSubtotal = useMemo(() => {
    if (!cartItem) return 0;
    return (cartItem.variante.precio || 0) * cartQty;
  }, [cartItem, cartQty]);

  const effectiveTotal = useMemo(() => {
    if (manualTotalInput === '') return standardSubtotal;
    const parsed = parseFloat(manualTotalInput);
    return isNaN(parsed) ? standardSubtotal : Math.max(0, parsed);
  }, [manualTotalInput, standardSubtotal]);

  const discountAmount = useMemo(() => {
    return Math.max(0, standardSubtotal - effectiveTotal);
  }, [standardSubtotal, effectiveTotal]);

  const projectedProfit = useMemo(() => {
    if (!cartItem) return 0;
    const totalCost = (cartItem.variante.costo || 0) * cartQty;
    return effectiveTotal - totalCost;
  }, [cartItem, cartQty, effectiveTotal]);

  // Ejecución de Venta con Transacción Atómica
  const handleCompleteSale = async () => {
    if (!cartItem || isProcessingSale) return;
    const { producto, variante } = cartItem;

    if (cartQty > variante.stock) {
      alert(
        `Stock insuficiente. Solo quedan ${variante.stock} unidades disponibles.`
      );
      return;
    }

    setIsProcessingSale(true);

    try {
      if (user && isFirebaseConnected) {
        await runTransaction(db, async (transaction) => {
          const productRef = doc(db, 'products', producto.id);
          const prodDoc = await transaction.get(productRef);

          if (!prodDoc.exists()) {
            throw new Error(
              'El producto seleccionado ya no existe en la base de datos.'
            );
          }

          const prodData = prodDoc.data();
          const targetVariantIndex = prodData.variantes.findIndex(
            (v) => v.id === variante.id
          );

          if (targetVariantIndex === -1) {
            throw new Error('La variante seleccionada ya no existe.');
          }

          const currentStock = prodData.variantes[targetVariantIndex].stock;
          if (currentStock < cartQty) {
            throw new Error(
              `Stock insuficiente en el servidor. Solo quedan ${currentStock} unidades.`
            );
          }

          // Descuento exacto de stock
          const updatedVariants = [...prodData.variantes];
          updatedVariants[targetVariantIndex] = {
            ...updatedVariants[targetVariantIndex],
            stock: currentStock - cartQty,
          };

          transaction.update(productRef, { variantes: updatedVariants });

          // Creación de venta
          const saleDocRef = doc(collection(db, 'sales'));
          transaction.set(saleDocRef, {
            id: saleDocRef.id,
            productoId: producto.id,
            productoNombre: producto.nombre,
            categoria: producto.categoria,
            subcategoria: producto.subcategoria,
            varianteId: variante.id,
            talla: variante.talla,
            color: variante.color,
            cantidad: cartQty,
            precioUnitarioLista: variante.precio,
            costoUnitario: variante.costo,
            subtotalLista: standardSubtotal,
            descuento: discountAmount,
            totalCobrado: effectiveTotal,
            gananciaNeta: projectedProfit,
            metodoPago: paymentMethod,
            timestamp: serverTimestamp(),
            anulada: false,
          });
        });
      } else {
        // Fallback local inmediato
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id !== producto.id) return p;
            return {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === variante.id ? { ...v, stock: v.stock - cartQty } : v
              ),
            };
          })
        );

        setSales((prev) => [
          {
            id: `local-${Date.now()}`,
            productoId: producto.id,
            productoNombre: producto.nombre,
            talla: variante.talla,
            color: variante.color,
            cantidad: cartQty,
            subtotalLista: standardSubtotal,
            descuento: discountAmount,
            totalCobrado: effectiveTotal,
            gananciaNeta: projectedProfit,
            metodoPago: paymentMethod,
            timestamp: { seconds: Math.floor(Date.now() / 1000) },
            anulada: false,
          },
          ...prev,
        ]);
      }

      setSaleSuccessMessage(
        `¡Venta cobrada! $${effectiveTotal.toFixed(2)} por ${paymentMethod}`
      );
      setCartItem(null);
      setCartQty(1);
      setManualTotalInput('');
      setTimeout(() => setSaleSuccessMessage(null), 3500);
    } catch (err) {
      alert('Error al procesar la venta: ' + err.message);
    } finally {
      setIsProcessingSale(false);
    }
  };

  // Anulación Atómica de Venta
  const handleAnnulSale = async (sale) => {
    if (sale.anulada || annulLoadingId) return;

    const confirmAnnul = window.confirm(
      `¿Anular venta de "${sale.productoNombre} (${sale.talla}/${sale.color})"? Se restaurarán +${sale.cantidad} unidades al stock.`
    );
    if (!confirmAnnul) return;

    setAnnulLoadingId(sale.id);

    try {
      if (user && isFirebaseConnected) {
        await runTransaction(db, async (transaction) => {
          const saleRef = doc(db, 'sales', sale.id);
          const productRef = doc(db, 'products', sale.productoId);

          const saleDoc = await transaction.get(saleRef);
          if (!saleDoc.exists() || saleDoc.data().anulada) {
            throw new Error('Esta venta ya fue anulada previamente.');
          }

          const prodDoc = await transaction.get(productRef);
          if (prodDoc.exists()) {
            const prodData = prodDoc.data();
            const vIndex = prodData.variantes.findIndex(
              (v) => v.id === sale.varianteId
            );
            if (vIndex !== -1) {
              const currentStock = prodData.variantes[vIndex].stock;
              const updatedVariants = [...prodData.variantes];
              updatedVariants[vIndex] = {
                ...updatedVariants[vIndex],
                stock: currentStock + sale.cantidad,
              };
              transaction.update(productRef, { variantes: updatedVariants });
            }
          }

          transaction.update(saleRef, {
            anulada: true,
            fechaAnulacion: serverTimestamp(),
          });
        });
      } else {
        setSales((prev) =>
          prev.map((s) => (s.id === sale.id ? { ...s, anulada: true } : s))
        );
        setProducts((prev) =>
          prev.map((p) => {
            if (p.id !== sale.productoId) return p;
            return {
              ...p,
              variantes: p.variantes.map((v) =>
                v.id === sale.varianteId
                  ? { ...v, stock: v.stock + sale.cantidad }
                  : v
              ),
            };
          })
        );
      }
    } catch (err) {
      alert('Error al anular: ' + err.message);
    } finally {
      setAnnulLoadingId(null);
    }
  };

  // Métricas del Día
  const todayMetrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const validSalesToday = sales.filter((s) => {
      if (s.anulada) return false;
      const saleDate = s.timestamp?.toDate
        ? s.timestamp.toDate()
        : new Date((s.timestamp?.seconds || 0) * 1000);
      return saleDate >= today;
    });

    return validSalesToday.reduce(
      (acc, sale) => {
        acc.totalCobrado += sale.totalCobrado || 0;
        acc.gananciaNeta += sale.gananciaNeta || 0;
        if (sale.metodoPago === 'Efectivo')
          acc.totalEfectivo += sale.totalCobrado || 0;
        if (sale.metodoPago === 'QR') acc.totalQR += sale.totalCobrado || 0;
        acc.unidades += sale.cantidad || 0;
        return acc;
      },
      {
        totalCobrado: 0,
        gananciaNeta: 0,
        totalEfectivo: 0,
        totalQR: 0,
        unidades: 0,
        count: validSalesToday.length,
      }
    );
  }, [sales]);

  // Filtros POS
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchCat =
        selectedCatFilter === 'Todas' || p.categoria === selectedCatFilter;
      const matchSearch =
        p.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.categoria.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.variantes.some(
          (v) =>
            v.color.toLowerCase().includes(searchTerm.toLowerCase()) ||
            v.talla.toLowerCase().includes(searchTerm.toLowerCase())
        );
      return matchCat && matchSearch;
    });
  }, [products, selectedCatFilter, searchTerm]);

  const categories = useMemo(() => {
    const setCats = new Set(products.map((p) => p.categoria));
    return ['Todas', ...Array.from(setCats)];
  }, [products]);

  // Guardar Producto Nuevo
  const handleSaveProduct = async (e) => {
    e.preventDefault();
    if (!newProdName.trim()) return;

    const newProd = {
      nombre: newProdName,
      categoria: newProdCat,
      subcategoria: newProdSubCat,
      variantes: newVariants,
    };

    if (user && isFirebaseConnected) {
      const docRef = doc(collection(db, 'products'));
      await runTransaction(db, async (t) => {
        t.set(docRef, { ...newProd, id: docRef.id });
      });
    } else {
      setProducts((prev) => [
        { ...newProd, id: `local-${Date.now()}` },
        ...prev,
      ]);
    }

    setNewProdName('');
    setShowAddProductModal(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none pb-20">
      {/* Barra Superior */}
      <header className="sticky top-0 z-30 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/20">
            B
          </div>
          <div>
            <h1 className="font-bold text-sm tracking-wide text-white leading-none">
              Boutique POS
            </h1>
            <span className="text-[10px] text-slate-400 font-medium">
              Boutik • Sincronizado
            </span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          Nube En Vivo
        </div>
      </header>

      {/* Alerta de Venta Exitosa */}
      {saleSuccessMessage && (
        <div className="fixed top-14 left-4 right-4 z-50 bg-emerald-600 text-white p-3 rounded-xl shadow-xl flex items-center gap-2 text-sm font-medium animate-bounce">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span>{saleSuccessMessage}</span>
        </div>
      )}

      {/* VISTA 1: PUNTO DE VENTA (VENDER) */}
      {activeTab === 'vender' && (
        <main className="p-4 flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
          {/* Buscador y Categorías */}
          <div className="flex flex-col gap-2">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Buscar prenda, color o talla..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCatFilter(cat)}
                  className={`px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors font-medium ${
                    selectedCatFilter === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Lista de Prendas y Variantes */}
          <div className="flex flex-col gap-3">
            {filteredProducts.map((prod) => (
              <div
                key={prod.id}
                className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-3.5"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-semibold text-sm text-slate-100">
                      {prod.nombre}
                    </h3>
                    <span className="text-[11px] text-slate-400">
                      {prod.categoria} • {prod.subcategoria}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-2">
                  {prod.variantes.map((v) => {
                    const isSelected = cartItem?.variante?.id === v.id;
                    const isLow = v.stock <= v.stockMinimo;
                    const isOutOfStock = v.stock <= 0;

                    return (
                      <button
                        key={v.id}
                        disabled={isOutOfStock}
                        onClick={() => {
                          setCartItem({ producto: prod, variante: v });
                          setCartQty(1);
                          setManualTotalInput('');
                        }}
                        className={`text-left p-2.5 rounded-xl border transition-all ${
                          isSelected
                            ? 'bg-indigo-600/20 border-indigo-500 ring-1 ring-indigo-500'
                            : isOutOfStock
                            ? 'bg-slate-950/40 border-slate-900 opacity-40 cursor-not-allowed'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex justify-between items-baseline text-xs mb-1">
                          <span className="font-bold text-white">
                            {v.talla}
                          </span>
                          <span className="font-semibold text-emerald-400">
                            ${v.precio.toFixed(2)}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 truncate">
                          {v.color}
                        </div>
                        <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-800/60 text-[10px]">
                          <span
                            className={
                              isLow
                                ? 'text-amber-400 font-medium flex items-center gap-1'
                                : 'text-slate-400'
                            }
                          >
                            {isLow && <AlertTriangle className="w-2.5 h-2.5" />}{' '}
                            Stock: {v.stock}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Panel de Cobro Rápido con Descuento */}
          {cartItem && (
            <div className="fixed bottom-16 left-0 right-0 p-4 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-20 max-w-md mx-auto">
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h4 className="font-bold text-sm text-white">
                    {cartItem.producto.nombre}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {cartItem.variante.talla} / {cartItem.variante.color}
                  </p>
                </div>
                <div className="flex items-center gap-2 bg-slate-800 px-2 py-1 rounded-lg">
                  <button
                    onClick={() => setCartQty((q) => Math.max(1, q - 1))}
                    className="w-6 h-6 flex items-center justify-center font-bold text-slate-300 hover:text-white"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-white w-4 text-center">
                    {cartQty}
                  </span>
                  <button
                    onClick={() =>
                      setCartQty((q) =>
                        Math.min(cartItem.variante.stock, q + 1)
                      )
                    }
                    className="w-6 h-6 flex items-center justify-center font-bold text-slate-300 hover:text-white"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Ajuste de Descuento en Vivo */}
              <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800 mb-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Precio de Lista:
                  </span>
                  <span className="font-semibold text-slate-300 line-through">
                    ${standardSubtotal.toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">
                    Cobro Final:
                  </span>
                  <input
                    type="number"
                    placeholder={`$${standardSubtotal.toFixed(2)}`}
                    value={manualTotalInput}
                    onChange={(e) => setManualTotalInput(e.target.value)}
                    className="w-full bg-slate-900 border border-indigo-500/50 rounded-lg px-2 py-1 text-sm font-bold text-emerald-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                {discountAmount > 0 && (
                  <div className="col-span-2 flex justify-between text-[11px] pt-1 border-t border-slate-800 text-indigo-400 font-medium">
                    <span>Descuento aplicado:</span>
                    <span>-${discountAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Botones de Método de Pago */}
              <div className="grid grid-cols-2 gap-2 mb-3">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('Efectivo')}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'Efectivo'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <Banknote className="w-4 h-4" /> Efectivo
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod('QR')}
                  className={`py-2 px-3 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors ${
                    paymentMethod === 'QR'
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-slate-800 text-slate-300'
                  }`}
                >
                  <QrCode className="w-4 h-4" /> Pago QR
                </button>
              </div>

              <button
                type="button"
                disabled={isProcessingSale}
                onClick={handleCompleteSale}
                className="w-full bg-indigo-600 hover:bg-indigo-500 active:scale-[0.98] py-3 rounded-xl font-bold text-sm text-white shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2"
              >
                {isProcessingSale
                  ? 'Registrando...'
                  : `Confirmar Cobro ($${effectiveTotal.toFixed(2)})`}
              </button>
            </div>
          )}
        </main>
      )}

      {/* VISTA 2: INVENTARIO */}
      {activeTab === 'inventario' && (
        <main className="p-4 flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Stock Total</h2>
            <button
              onClick={() => setShowAddProductModal(true)}
              className="bg-indigo-600 hover:bg-indigo-500 px-3 py-1.5 rounded-xl font-semibold text-xs text-white flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" /> Nueva Prenda
            </button>
          </div>

          <div className="flex flex-col gap-3">
            {products.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-4"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-bold text-sm text-white">{p.nombre}</h3>
                    <span className="text-xs text-slate-400">
                      {p.categoria} • {p.subcategoria}
                    </span>
                  </div>
                </div>

                <div className="divide-y divide-slate-800/80">
                  {p.variantes.map((v) => (
                    <div
                      key={v.id}
                      className="py-2.5 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="font-bold text-white">{v.talla}</span>
                        <span className="text-slate-400 ml-2 font-medium">
                          {v.color}
                        </span>
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Costo: ${v.costo.toFixed(2)} \vert{} Venta:$
                          {v.precio.toFixed(2)}
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            v.stock <= v.stockMinimo
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                              : 'bg-slate-800 text-slate-200'
                          }`}
                        >
                          {v.stock} un.
                        </span>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Mín: {v.stockMinimo}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* VISTA 3: MÉTRICAS Y CIERRE DE CAJA */}
      {activeTab === 'metricas' && (
        <main className="p-4 flex-1 flex flex-col gap-4 max-w-md mx-auto w-full">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-bold text-white">Caja del Día</h2>
            <button
              onClick={() => window.print()}
              className="bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl font-semibold text-xs text-slate-200 flex items-center gap-1.5 border border-slate-700"
            >
              <Printer className="w-4 h-4" /> Imprimir Cierre
            </button>
          </div>

          {/* Tarjetas de Resumen */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900 border border-indigo-800/40 p-3.5 rounded-2xl">
              <span className="text-xs text-indigo-300 block font-medium">
                Facturado Hoy
              </span>
              <span className="text-2xl font-black text-white mt-1 block">
                ${todayMetrics.totalCobrado.toFixed(2)}
              </span>
              <span className="text-[10px] text-indigo-400 mt-1 block">
                {todayMetrics.count} operaciones
              </span>
            </div>

            <div className="bg-gradient-to-br from-emerald-900/40 to-slate-900 border border-emerald-800/40 p-3.5 rounded-2xl">
              <span className="text-xs text-emerald-300 block font-medium">
                Ganancia Neta
              </span>
              <span className="text-2xl font-black text-emerald-400 mt-1 block">
                ${todayMetrics.gananciaNeta.toFixed(2)}
              </span>
              <span className="text-[10px] text-emerald-400/80 mt-1 block">
                {todayMetrics.unidades} prendas vendidas
              </span>
            </div>
          </div>

          {/* Desglose por Método de Pago */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Arqueo por Método
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <Banknote className="w-4 h-4 text-emerald-400" /> Total en
                  Efectivo:
                </span>
                <span className="font-bold text-white">
                  ${todayMetrics.totalEfectivo.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-800">
                <span className="flex items-center gap-2 text-slate-300 font-medium">
                  <QrCode className="w-4 h-4 text-blue-400" /> Total en QR:
                </span>
                <span className="font-bold text-white">
                  ${todayMetrics.totalQR.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Historial y Anulación de Ventas */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
              Últimas Ventas
            </h3>
            <div className="divide-y divide-slate-800">
              {sales.slice(0, 10).map((s) => (
                <div
                  key={s.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        className={`font-semibold ${
                          s.anulada
                            ? 'line-through text-slate-500'
                            : 'text-slate-200'
                        }`}
                      >
                        {s.productoNombre} ({s.talla}/{s.color})
                      </span>
                      {s.anulada && (
                        <span className="text-[9px] bg-rose-500/20 text-rose-400 px-1.5 py-0.5 rounded font-bold">
                          ANULADA
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Cant: {s.cantidad} • {s.metodoPago} • $
                      {s.totalCobrado.toFixed(2)}
                    </span>
                  </div>

                  {!s.anulada && (
                    <button
                      disabled={annulLoadingId === s.id}
                      onClick={() => handleAnnulSale(s)}
                      className="px-2 py-1 bg-rose-600/10 hover:bg-rose-600/20 text-rose-400 rounded-lg text-[10px] font-semibold border border-rose-500/20 flex items-center gap-1 transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                      {annulLoadingId === s.id ? 'Anulando...' : 'Anular'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        </main>
      )}

      {/* Modal Nueva Prenda */}
      {showAddProductModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 max-w-sm w-full">
            <h3 className="font-bold text-base text-white mb-3">
              Agregar Prenda
            </h3>
            <form
              onSubmit={handleSaveProduct}
              className="flex flex-col gap-3 text-xs"
            >
              <div>
                <label className="text-slate-400 block mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  placeholder="Ej: Falda Plisada"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-slate-400 block mb-1">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    value={newProdSubCat}
                    onChange={(e) => setNewProdSubCat(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => setShowAddProductModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-500 px-4 py-1.5 rounded-lg font-bold text-white"
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Barra de Navegación Inferior */}
      <nav className="fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-md border-t border-slate-800 z-40 max-w-md mx-auto">
        <div className="grid grid-cols-3 py-2">
          <button
            onClick={() => setActiveTab('vender')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold py-1 ${
              activeTab === 'vender'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Vender</span>
          </button>

          <button
            onClick={() => setActiveTab('inventario')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold py-1 ${
              activeTab === 'inventario'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Inventario</span>
          </button>

          <button
            onClick={() => setActiveTab('metricas')}
            className={`flex flex-col items-center gap-1 text-xs font-semibold py-1 ${
              activeTab === 'metricas'
                ? 'text-indigo-400'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            <BarChart3 className="w-5 h-5" />
            <span>Métricas</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
