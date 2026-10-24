import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  onSnapshot,
  doc,
  runTransaction,
  deleteDoc,
  updateDoc,
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
// Estado para el Modal de Edición de Prenda
const [editingProduct, setEditingProduct] = useState(null);
const [isSavingEdit, setIsSavingEdit] = useState(false);

// 1. CÁLCULO EN TIEMPO REAL: TOTAL INVERTIDO (Capital en Inventario)
const totalInvertido = products.reduce((totalAcumulado, prod) => {
  const listaVariantes = Array.isArray(prod.variantes) ? prod.variantes : [];
  const inversionPrenda = listaVariantes.reduce((subTotal, v) => {
    const stockActual = Math.max(0, Number(v.stock ?? 0));
    const precioCosto = Math.max(0, Number(v.costo ?? 0));
    return subTotal + (stockActual * precioCosto);
  }, 0);
  return totalAcumulado + inversionPrenda;
}, 0);

const totalUnidadesFisicas = products.reduce((totalUnidades, prod) => {
  const listaVariantes = Array.isArray(prod.variantes) ? prod.variantes : [];
  return totalUnidades + listaVariantes.reduce((acc, v) => acc + Math.max(0, Number(v.stock ?? 0)), 0);
}, 0);

// 2. Abrir Modal de Edición al tocar una prenda
const openEditModal = (product) => {
  const variantesCopia = (Array.isArray(product.variantes) ? product.variantes : []).map((v) => ({
    id: v.id ? v.id : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
    talla: v.talla ?? '',
    color: v.color ?? '',
    costo: Number(v.costo ?? 0),
    precio: Number(v.precio ?? 0),
    stock: Number(v.stock ?? 0),
    stockMinimo: Number(v.stockMinimo ?? 2),
  }));

  setEditingProduct({
    ...product,
    nombre: product.nombre ?? '',
    categoria: product.categoria ?? 'Ropa',
    subcategoria: product.subcategoria ?? 'General',
    variantes: variantesCopia,
  });
};

// 3. Guardar cambios del Modal de Edición en Firestore
const handleSaveEditedProduct = async () => {
  if (!editingProduct) return;
  if (!editingProduct.nombre.trim()) {
    alert('Por favor ingresa el nombre de la prenda.');
    return;
  }

  setIsSavingEdit(true);
  try {
    const variantesLimpias = editingProduct.variantes.map((v) => ({
      id: v.id ? v.id : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      talla: String(v.talla ?? 'Única').trim(),
      color: String(v.color ?? 'General').trim(),
      costo: Number.isNaN(Number(v.costo)) ? 0 : Math.max(0, Number(v.costo)),
      precio: Number.isNaN(Number(v.precio)) ? 0 : Math.max(0, Number(v.precio)),
      stock: Number.isNaN(parseInt(v.stock, 10)) ? 0 : Math.max(0, parseInt(v.stock, 10)),
      stockMinimo: Number.isNaN(parseInt(v.stockMinimo, 10)) ? 2 : Math.max(0, parseInt(v.stockMinimo, 10)),
    }));

    const prendaActualizada = {
      ...editingProduct,
      nombre: editingProduct.nombre.trim(),
      categoria: editingProduct.categoria.trim(),
      subcategoria: editingProduct.subcategoria.trim(),
      variantes: variantesLimpias,
    };

    if (user && isFirebaseConnected && !String(editingProduct.id).startsWith('local-')) {
      await updateDoc(doc(db, 'products', editingProduct.id), {
        nombre: prendaActualizada.nombre,
        categoria: prendaActualizada.categoria,
        subcategoria: prendaActualizada.subcategoria,
        variantes: prendaActualizada.variantes,
      });
    }

    setProducts((prev) =>
      prev.map((p) => (p.id === prendaActualizada.id ? prendaActualizada : p))
    );
    setEditingProduct(null);
  } catch (err) {
    alert('Error al guardar cambios: ' + err.message);
  } finally {
    setIsSavingEdit(false);
  }
};

// 4. Eliminar una prenda completa
const handleDeleteProduct = async (product) => {
  const seguro = window.confirm(`¿Seguro que deseas eliminar "${product.nombre}" de tu catálogo?`);
  if (!seguro) return;

  try {
    if (user && isFirebaseConnected && !String(product.id).startsWith('local-')) {
      await deleteDoc(doc(db, 'products', product.id));
    }
    setProducts((prev) => prev.filter((p) => p.id !== product.id));
    setEditingProduct(null);
  } catch (err) {
    alert('Error al eliminar: ' + err.message);
  }
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
        <main className="p-4 flex-1 flex flex-col gap-5 max-w-md mx-auto w-full pb-28">
          {/* TARJETA KPI: TOTAL INVERTIDO */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Total Invertido (Capital)
              </span>
              <DollarSign className="w-5 h-5 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight my-1">
              ${totalInvertido.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="flex items-center justify-between text-sm text-slate-300 mt-2 pt-2 border-t border-slate-800/80">
              <span>Unidades disponibles:</span>
              <span className="font-bold text-base text-emerald-400">{totalUnidadesFisicas} un.</span>
            </div>
          </div>

          {/* CABECERA Y BOTÓN NUEVA PRENDA */}
          <div className="flex justify-between items-center gap-3">
            <h2 className="text-xl font-bold text-white">Catálogo</h2>
            <button
              type="button"
              onClick={() => setShowAddProductModal(true)}
              className="h-12 px-5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 rounded-xl font-bold text-base flex items-center gap-2 text-white shadow-lg shadow-indigo-600/30 transition-all"
            >
              <Plus className="w-5 h-5" /> Nueva Prenda
            </button>
          </div>

          <p className="text-sm text-slate-400 -mt-2">
            Toca cualquier prenda para editar su stock, agregar tallas/colores o cambiar precios.
          </p>

          {/* LISTA DE PRENDAS (SOLO LECTURA PARA EVITAR TOQUES ACCIDENTALES) */}
          <div className="flex flex-col gap-4">
            {products.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-300 text-base">
                No hay prendas registradas aún. Toca arriba en <strong className="text-white">+ Nueva Prenda</strong> para cargar tu catálogo.
              </div>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openEditModal(p)}
                  className="bg-slate-900 hover:bg-slate-800/80 active:scale-[0.99] border border-slate-800 rounded-2xl p-5 cursor-pointer transition-all shadow-md"
                >
                  {/* Encabezado de la prenda */}
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-lg text-white leading-snug">{p.nombre}</h3>
                      <span className="text-sm text-slate-400 font-medium">
                        {p.categoria} • {p.subcategoria}
                      </span>
                    </div>
                    <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 rounded-lg text-sm font-semibold">
                      Editar
                    </span>
                  </div>

                  {/* Lista informativa de variantes */}
                  <div className="divide-y divide-slate-800/80">
                    {p.variantes.map((v) => (
                      <div key={v.id} className="py-3 flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white text-base bg-slate-800 px-2.5 py-0.5 rounded-md">
                              {v.talla}
                            </span>
                            <span className="text-slate-200 text-base font-medium">{v.color}</span>
                          </div>
                          <div className="text-sm text-slate-400 mt-1">
                            Costo: ${Number(v.costo ?? 0).toFixed(2)} • Venta: <strong className="text-slate-200">${Number(v.precio ?? 0).toFixed(2)}</strong>
                          </div>
                        </div>

                        <div className="text-right">
                          <span
                            className={`px-3 py-1 rounded-xl font-bold text-base inline-block ${
                              v.stock <= v.stockMinimo
                                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/40'
                                : 'bg-slate-800 text-white'
                            }`}
                          >
                            {v.stock} un.
                          </span>
                          <span className="text-xs text-slate-400 block mt-1">
                            Mín: {v.stockMinimo}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
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

{/* MODAL 1: EDITAR PRENDA EXISTENTE (STOCK, PRECIOS Y NUEVAS VARIANTES) */}
{editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white">Editar Prenda</h3>
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct)}
                className="h-10 px-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">Nombre de la prenda</label>
                <input
                  type="text"
                  value={editingProduct.nombre}
                  onChange={(e) => setEditingProduct({ ...editingProduct, nombre: e.target.value })}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Categoría</label>
                  <input
                    type="text"
                    value={editingProduct.categoria}
                    onChange={(e) => setEditingProduct({ ...editingProduct, categoria: e.target.value })}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Subcategoría</label>
                  <input
                    type="text"
                    value={editingProduct.subcategoria}
                    onChange={(e) => setEditingProduct({ ...editingProduct, subcategoria: e.target.value })}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
              </div>

              {/* VARIANTES DE LA PRENDA */}
              <div className="mt-2 border-t border-slate-800 pt-4 flex flex-col gap-3">
                <div className="flex justify-between items-center">
                  <span className="text-base font-bold text-white">Variantes y Stock</span>
                </div>

                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
                  {editingProduct.variantes.map((v, idx) => (
                    <div key={v.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-400">
                          Variante #{idx + 1}
                        </span>
                        {editingProduct.variantes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const filtradas = editingProduct.variantes.filter((_, i) => i !== idx);
                              setEditingProduct({ ...editingProduct, variantes: filtradas });
                            }}
                            className="text-sm font-semibold text-rose-400 px-2 py-1"
                          >
                            Quitar variante
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Talla</label>
                          <input
                            type="text"
                            placeholder="Ej: S, M, L"
                            value={v.talla}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], talla: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Color</label>
                          <input
                            type="text"
                            placeholder="Ej: Negro, Blanco"
                            value={v.color}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], color: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Costo Compra ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.costo}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], costo: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Precio Venta ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.precio}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], precio: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-semibold"
                          />
                        </div>
                      </div>

                      {/* CONTROL DELIBERADO DE STOCK */}
                      <div className="pt-1">
                        <label className="text-xs font-semibold text-slate-400 block mb-1.5">
                          Stock disponible (Unidades)
                        </label>
                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              const copia = [...editingProduct.variantes];
                              const actual = parseInt(copia[idx].stock, 10);
                              const numeroBase = Number.isNaN(actual) ? 0 : actual;
                              copia[idx] = { ...copia[idx], stock: Math.max(0, numeroBase - 1) };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-14 h-12 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl text-xl font-bold text-white flex items-center justify-center"
                          >
                            -
                          </button>

                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], stock: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="flex-1 h-12 bg-slate-900 border border-indigo-500/50 rounded-xl text-center text-xl font-extrabold text-white"
                          />

                          <button
                            type="button"
                            onClick={() => {
                              const copia = [...editingProduct.variantes];
                              const actual = parseInt(copia[idx].stock, 10);
                              const numeroBase = Number.isNaN(actual) ? 0 : actual;
                              copia[idx] = { ...copia[idx], stock: numeroBase + 1 };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-14 h-12 bg-indigo-600 active:bg-indigo-500 rounded-xl text-xl font-bold text-white flex items-center justify-center"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* BOTÓN PARA AÑADIR NUEVA VARIANTE / COLOR SIN DUPLICAR EL PRODUCTO */}
                <button
                  type="button"
                  onClick={() => {
                    const refVariante = editingProduct.variantes[0] ? editingProduct.variantes[0] : { costo: 0, precio: 0 };
                    setEditingProduct({
                      ...editingProduct,
                      variantes: [
                        ...editingProduct.variantes,
                        {
                          id: 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                          talla: '',
                          color: '',
                          costo: refVariante.costo ?? 0,
                          precio: refVariante.precio ?? 0,
                          stock: 1,
                          stockMinimo: 2,
                        },
                      ],
                    });
                  }}
                  className="w-full h-12 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 rounded-xl font-bold text-base flex items-center justify-center gap-2 mt-1"
                >
                  <Plus className="w-5 h-5" /> Añadir variante / color
                </button>
              </div>
            </div>

            {/* BOTONES DE CONFIRMACIÓN */}
            <div className="flex flex-col gap-2.5 mt-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                disabled={isSavingEdit}
                onClick={handleSaveEditedProduct}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-600/30"
              >
                {isSavingEdit ? 'Guardando...' : 'Guardar cambios'}
              </button>
              <button
                type="button"
                onClick={() => setEditingProduct(null)}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-base font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREAR NUEVA PRENDA */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <h3 className="text-xl font-bold text-white border-b border-slate-800 pb-3">Agregar Nueva Prenda</h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Falda Plisada"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Categoría</label>
                  <input
                    type="text"
                    placeholder="Ej: Ropa"
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">Subcategoría</label>
                  <input
                    type="text"
                    placeholder="Ej: Medias"
                    value={newProdSubCat}
                    onChange={(e) => setNewProdSubCat(e.target.value)}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
              </div>

              <div className="mt-2 border-t border-slate-800 pt-3 flex flex-col gap-3">
                <span className="text-base font-bold text-white">Tallas, Colores y Precios</span>

                <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
                  {newVariants.map((v, idx) => (
                    <div key={v.id} className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-indigo-400">Variante #{idx + 1}</span>
                        {newVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setNewVariants(newVariants.filter((_, i) => i !== idx))}
                            className="text-sm font-semibold text-rose-400"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Talla</label>
                          <input
                            type="text"
                            placeholder="Ej: S, M, Única"
                            value={v.talla}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], talla: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Color</label>
                          <input
                            type="text"
                            placeholder="Ej: Negro, Rojo"
                            value={v.color}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], color: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Costo ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.costo}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], costo: parseFloat(e.target.value) };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-2.5 text-base text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Venta ($)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.precio}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], precio: parseFloat(e.target.value) };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-2.5 text-base text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">Stock</label>
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], stock: parseInt(e.target.value, 10) };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-2.5 text-base text-white font-bold text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setNewVariants([
                      ...newVariants,
                      {
                        id: 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                        talla: '',
                        color: '',
                        costo: 0,
                        precio: 0,
                        stock: 1,
                        stockMinimo: 2,
                      },
                    ])
                  }
                  className="w-full h-12 bg-indigo-600/15 hover:bg-indigo-600/25 border border-indigo-500/40 text-indigo-300 rounded-xl font-bold text-base flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" /> Añadir variante / color
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-2.5 mt-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={handleSaveProduct}
                className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-base font-bold shadow-lg shadow-indigo-600/30"
              >
                Guardar Prenda
              </button>
              <button
                type="button"
                onClick={() => setShowAddProductModal(false)}
                className="w-full h-12 bg-slate-800 text-slate-300 rounded-xl text-base font-semibold"
              >
                Cancelar
              </button>
            </div>
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
