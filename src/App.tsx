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
// Función auxiliar para mapear nombres de colores en español a estilos CSS/Hex
const getColorSwatchStyle = (rawColor) => {
  const limpio = String(rawColor ?? '')
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  if (limpio.includes('rojo') ? true : limpio.includes('vino') ? true : limpio.includes('bordo')) {
    return { backgroundColor: '#ef4444', borderColor: '#fca5a5' };
  }
  if (limpio.includes('negro')) {
    return { backgroundColor: '#1f2937', borderColor: '#94a3b8' };
  }
  if (limpio.includes('beige') ? true : limpio.includes('crema') ? true : limpio.includes('nude')) {
    return { backgroundColor: '#e5d3b3', borderColor: '#cbb282' };
  }
  if (limpio.includes('blanco') ? true : limpio.includes('hueso')) {
    return { backgroundColor: '#ffffff', borderColor: '#94a3b8' };
  }
  if (limpio.includes('azul') ? true : limpio.includes('celeste') ? true : limpio.includes('marino')) {
    return { backgroundColor: '#3b82f6', borderColor: '#93c5fd' };
  }
  if (limpio.includes('rosa') ? true : limpio.includes('rosado') ? true : limpio.includes('fucsia')) {
    return { backgroundColor: '#ec4899', borderColor: '#f9a8d4' };
  }
  if (limpio.includes('verde') ? true : limpio.includes('oliva') ? true : limpio.includes('menta')) {
    return { backgroundColor: '#22c55e', borderColor: '#86efac' };
  }
  if (limpio.includes('amarillo') ? true : limpio.includes('mostaza') ? true : limpio.includes('dorado')) {
    return { backgroundColor: '#eab308', borderColor: '#fde047' };
  }
  if (
    limpio.includes('cafe')
      ? true
      : limpio.includes('marron')
      ? true
      : limpio.includes('camel')
      ? true
      : limpio.includes('chocolate')
  ) {
    return { backgroundColor: '#78350f', borderColor: '#d97706' };
  }
  if (limpio.includes('morado') ? true : limpio.includes('lila') ? true : limpio.includes('violeta')) {
    return { backgroundColor: '#a855f7', borderColor: '#d8b4fe' };
  }
  if (limpio.includes('gris') ? true : limpio.includes('plata')) {
    return { backgroundColor: '#6b7280', borderColor: '#cbd5e1' };
  }
  // Color neutro por defecto si no coincide con la lista
  return { backgroundColor: '#64748b', borderColor: '#94a3b8' };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('vender');
  const [user, setUser] = useState(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  // Estado POS (Vender)
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
      id: 'v-init-1',
      talla: 'Única',
      color: 'Negro',
      costo: 10,
      precio: 20,
      stock: 5,
      stockMinimo: 2,
    },
  ]);

  // Modal de Edición Controlada de Prenda
  const [editingProduct, setEditingProduct] = useState(null);
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // Autenticación anónima en Firebase
  useEffect(() => {
    if (!auth) return;
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        signInAnonymously(auth).catch((err) => {
          console.warn('Auth Anónima pendiente:', err?.message);
        });
      }
    });
    return () => unsubscribeAuth();
  }, []);

  // Sincronización en tiempo real con Firestore
  useEffect(() => {
    if (!user ? true : !db) return;

    const unsubProducts = onSnapshot(
      collection(db, 'products'),
      (snapshot) => {
        const prodList = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setProducts(prodList);
        setIsFirebaseConnected(true);
      },
      (error) => console.warn('Firestore products:', error?.message)
    );

    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(60));
    const unsubSales = onSnapshot(
      qSales,
      (snapshot) => {
        const salesList = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSales(salesList);
      },
      (error) => console.warn('Firestore sales:', error?.message)
    );

    return () => {
      unsubProducts();
      unsubSales();
    };
  }, [user]);

  // Categorías dinámicas para el filtro
  const categories = useMemo(() => {
    const cats = new Set(['Todas']);
    products.forEach((p) => {
      if (p?.categoria) cats.add(p.categoria);
    });
    return Array.from(cats);
  }, [products]);

  // Filtrado de productos por buscador (nombre, color o talla) y categoría
  const filteredProducts = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return products.filter((p) => {
      const matchCat = selectedCatFilter === 'Todas' ? true : p?.categoria === selectedCatFilter;
      if (!matchCat) return false;
      if (!term) return true;

      const matchNombre = String(p?.nombre ?? '').toLowerCase().includes(term);
      const matchSub = String(p?.subcategoria ?? '').toLowerCase().includes(term);
      const listaVar = Array.isArray(p?.variantes) ? p.variantes : [];
      const matchVariante = listaVar.some((v) => {
        const c = String(v?.color ?? '').toLowerCase();
        const t = String(v?.talla ?? '').toLowerCase();
        return c.includes(term) ? true : t.includes(term);
      });

      return matchNombre ? true : matchSub ? true : matchVariante;
    });
  }, [products, searchTerm, selectedCatFilter]);

  // KPI EN TIEMPO REAL: TOTAL INVERTIDO (Capital en Inventario)
  const totalInvertido = useMemo(() => {
    return products.reduce((totalAcumulado, prod) => {
      const listaVariantes = Array.isArray(prod?.variantes) ? prod.variantes : [];
      const inversionPrenda = listaVariantes.reduce((subTotal, v) => {
        const stockActual = Math.max(0, Number(v?.stock ?? 0));
        const precioCosto = Math.max(0, Number(v?.costo ?? 0));
        return subTotal + stockActual * precioCosto;
      }, 0);
      return totalAcumulado + inversionPrenda;
    }, 0);
  }, [products]);

  const totalUnidadesFisicas = useMemo(() => {
    return products.reduce((totalUnidades, prod) => {
      const listaVariantes = Array.isArray(prod?.variantes) ? prod.variantes : [];
      return (
        totalUnidades +
        listaVariantes.reduce((acc, v) => acc + Math.max(0, Number(v?.stock ?? 0)), 0)
      );
    }, 0);
  }, [products]);

  // CÁLCULO EXACTO DE MÉTRICAS Y GANANCIA NETA (Solo ventas activas)
  const activeSales = useMemo(() => {
    return sales.filter((s) => Boolean(s) && !s?.anulada);
  }, [sales]);

  const metrics = useMemo(() => {
    let totalIngresos = 0;
    let gananciaNeta = 0;
    let porEfectivo = 0;
    let porQR = 0;
    let porTarjeta = 0;

    activeSales.forEach((s) => {
      const cantidad = Math.max(1, Number(s?.cantidad ?? 1));
      const totalCobrado = Math.max(0, Number(s?.total ?? 0));
      const costoUnitario = Math.max(0, Number(s?.costoUnitario ?? 0));
      const costoTotal = costoUnitario * cantidad;

      totalIngresos += totalCobrado;
      gananciaNeta += totalCobrado - costoTotal;

      if (s?.metodoPago === 'Efectivo') porEfectivo += totalCobrado;
      else if (s?.metodoPago === 'QR') porQR += totalCobrado;
      else porTarjeta += totalCobrado;
    });

    if (activeSales.length === 0) {
      return {
        totalIngresos: 0,
        gananciaNeta: 0,
        porEfectivo: 0,
        porQR: 0,
        porTarjeta: 0,
      };
    }

    return { totalIngresos, gananciaNeta, porEfectivo, porQR, porTarjeta };
  }, [activeSales]);

  // Validación estricta del monto a cobrar (mayor a 0 y numérico)
  const parsedSaleTotal = useMemo(() => {
    const textoLimpio = String(manualTotalInput ?? '').trim();
    if (!textoLimpio) return NaN;
    return parseFloat(textoLimpio);
  }, [manualTotalInput]);

  const isSaleTotalValid = useMemo(() => {
    return !Number.isNaN(parsedSaleTotal) && parsedSaleTotal > 0;
  }, [parsedSaleTotal]);

  // 1. Seleccionar una variante para vender (Inicialización obligatoria de precioVenta * cantidad)
  const handleSelectVariantForSale = (product, variant) => {
    if (Number(variant?.stock ?? 0) <= 0) {
      alert('Esta variante no tiene stock disponible.');
      return;
    }
    const cantidadInicial = 1;
    const precioVenta = Math.max(0, Number(variant?.precio ?? 0));
    const totalInicial = precioVenta * cantidadInicial;

    setCartItem({ product, variant });
    setCartQty(cantidadInicial);
    setPaymentMethod('Efectivo');
    setManualTotalInput(totalInicial > 0 ? totalInicial.toFixed(2) : '');
  };

  // Cambiar cantidad en el carrito actualizando automáticamente (precioVenta * cantidad)
  const handleQtyChange = (delta) => {
    if (!cartItem) return;
    const maxStock = Math.max(1, Number(cartItem?.variant?.stock ?? 1));
    const nextQty = Math.max(1, Math.min(maxStock, cartQty + delta));
    const precioVenta = Math.max(0, Number(cartItem?.variant?.precio ?? 0));
    const nuevoSubtotal = precioVenta * nextQty;

    setCartQty(nextQty);
    setManualTotalInput(nuevoSubtotal > 0 ? nuevoSubtotal.toFixed(2) : '');
  };

  // 2. Confirmar y registrar venta (Bloqueando ventas en $0.00 o NaN)
  const handleConfirmSale = async () => {
    if (!cartItem ? true : isProcessingSale) return;

    if (!isSaleTotalValid) {
      alert('El total a cobrar debe ser mayor a $0.00 para registrar la venta.');
      return;
    }

    const { product, variant } = cartItem;
    const qty = Math.max(1, Number(cartQty ?? 1));
    const totalCobrado = Number(parsedSaleTotal.toFixed(2));
    const precioUnit = Math.max(0, Number(variant?.precio ?? 0));
    const costoUnit = Math.max(0, Number(variant?.costo ?? 0));

    setIsProcessingSale(true);
    try {
      const prodId = product?.id ? String(product.id) : '';

      if (user && isFirebaseConnected && prodId && !prodId.startsWith('local-')) {
        await runTransaction(db, async (transaction) => {
          const prodRef = doc(db, 'products', prodId);
          const prodSnap = await transaction.get(prodRef);
          if (!prodSnap.exists()) throw new Error('El producto ya no existe en el inventario.');

          const data = prodSnap.data();
          const listaVariantes = Array.isArray(data?.variantes) ? data.variantes : [];

          const variantesActualizadas = listaVariantes.map((v) => {
            const mismoId = Boolean(v?.id && variant?.id && v.id === variant.id);
            const mismoColorTalla =
              !mismoId &&
              String(v?.color ?? '') === String(variant?.color ?? '') &&
              String(v?.talla ?? '') === String(variant?.talla ?? '');

            if (mismoId ? true : mismoColorTalla) {
              const stockDisp = Number(v?.stock ?? 0);
              if (stockDisp < qty) {
                throw new Error(`Stock insuficiente. Solo quedan ${stockDisp} unidades.`);
              }
              return { ...v, stock: stockDisp - qty };
            }
            return v;
          });

          transaction.update(prodRef, { variantes: variantesActualizadas });

          const nuevaVentaRef = doc(collection(db, 'sales'));
          transaction.set(nuevaVentaRef, {
            productId: prodId,
            variantId: variant?.id ?? '',
            productoNombre: product?.nombre ?? 'Prenda',
            talla: variant?.talla ?? 'Única',
            color: variant?.color ?? 'General',
            cantidad: qty,
            precioUnitario: precioUnit,
            costoUnitario: costoUnit,
            total: totalCobrado,
            metodoPago: paymentMethod,
            timestamp: serverTimestamp(),
            fechaLocal: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          });
        });
      } else {
        setProducts((prev) =>
          prev.map((p) => {
            if (p?.id !== product?.id) return p;
            const vars = Array.isArray(p?.variantes) ? p.variantes : [];
            return {
              ...p,
              variantes: vars.map((v) =>
                v?.id === variant?.id ? { ...v, stock: Math.max(0, Number(v?.stock ?? 0) - qty) } : v
              ),
            };
          })
        );
      }

      setSaleSuccessMessage(
        `Venta registrada: ${qty}x ${product?.nombre ?? ''} (${variant?.color ?? ''}) por $${totalCobrado.toFixed(2)}`
      );
      setTimeout(() => setSaleSuccessMessage(null), 4000);
      setCartItem(null);
    } catch (err) {
      alert('No se pudo completar la venta: ' + (err?.message ?? 'Error desconocido'));
    } finally {
      setIsProcessingSale(false);
    }
  };

  // 3. ANULAR VENTA CON VALIDACIÓN SEGURA Y MODO "ELIMINACIÓN FORZADA / LIMPIEZA"
  const handleAnnulSale = async (sale) => {
    if (!sale) return;

    const saleId = sale?.id ? String(sale.id).trim() : '';
    const nombrePrenda = sale?.productoNombre ?? sale?.nombre ?? 'Prenda';
    const colorPrenda = sale?.color ?? '';
    const cantidadDevuelta = Math.max(1, Number(sale?.cantidad ?? 1));

    setAnnulLoadingId(saleId ? saleId : 'temp-id');

    try {
      // Buscar el producto de forma defensiva en el estado actual
      const rawProdId = sale?.productId ?? sale?.prodId ?? '';
      const validProdId = typeof rawProdId === 'string' ? rawProdId.trim() : '';

      const productoEnInventario = products.find((p) => {
        if (!p) return false;
        if (validProdId && p?.id && String(p.id) === validProdId) return true;
        const nombreProd = String(p?.nombre ?? '').trim().toLowerCase();
        const nombreVenta = String(nombrePrenda).trim().toLowerCase();
        return Boolean(nombreProd && nombreVenta && nombreProd === nombreVenta);
      });

      const variantes = Array.isArray(productoEnInventario?.variantes)
        ? productoEnInventario.variantes
        : [];

      // Buscar la variante de forma defensiva (.findIndex con validación segura)
      const variantIndex = variantes.findIndex((v) => {
        if (!v) return false;
        const tieneId = Boolean(v?.id && sale?.variantId);
        if (tieneId && String(v.id) === String(sale.variantId)) {
          return true;
        }
        const colorV = String(v?.color ?? '').trim().toLowerCase();
        const colorS = String(sale?.color ?? '').trim().toLowerCase();
        const tallaV = String(v?.talla ?? '').trim().toLowerCase();
        const tallaS = String(sale?.talla ?? '').trim().toLowerCase();

        if (colorV && colorS && colorV === colorS) {
          return tallaS ? tallaV === tallaS : true;
        }
        return false;
      });

      const existeProductoYVariante = Boolean(productoEnInventario && variantIndex !== -1);

      // CASO A: El producto y la variante existen -> Restaurar stock y borrar la venta
      if (existeProductoYVariante) {
        const confirmar = window.confirm(
          `¿Anular venta de "${nombrePrenda} (${colorPrenda})" y devolver ${cantidadDevuelta} un. al inventario?`
        );
        if (!confirmar) {
          setAnnulLoadingId(null);
          return;
        }

        const nuevasVariantes = variantes.map((v, idx) => {
          if (idx === variantIndex) {
            return {
              ...v,
              stock: Math.max(0, Number(v?.stock ?? 0)) + cantidadDevuelta,
            };
          }
          return v;
        });

        const targetProdId = String(productoEnInventario.id ?? '').trim();

        if (user && isFirebaseConnected && targetProdId && !targetProdId.startsWith('local-')) {
          const prodRef = doc(db, 'products', targetProdId);
          await updateDoc(prodRef, { variantes: nuevasVariantes });
        }

        if (user && isFirebaseConnected && saleId && !saleId.startsWith('local-')) {
          const saleRef = doc(db, 'sales', saleId);
          await deleteDoc(saleRef);
        }

        // Actualizar estado en pantalla inmediatamente
        setProducts((prev) =>
          prev.map((p) => (p?.id === productoEnInventario.id ? { ...p, variantes: nuevasVariantes } : p))
        );
        setSales((prev) => prev.filter((item) => item?.id !== sale?.id));
      } else {
        // CASO B: Modo "Eliminación forzada / Limpieza" si el producto o variante ya no existe
        const confirmarLimpieza = window.confirm(
          'No se encontró el producto en inventario. ¿Deseas eliminar el registro de venta de todas formas?'
        );
        if (!confirmarLimpieza) {
          setAnnulLoadingId(null);
          return;
        }

        if (user && isFirebaseConnected && saleId && !saleId.startsWith('local-')) {
          const saleRef = doc(db, 'sales', saleId);
          await deleteDoc(saleRef);
        }

        // Limpiar inmediatamente del estado local para que el arqueo y ganancia neta se corrijan al instante
        setSales((prev) => prev.filter((item) => item?.id !== sale?.id));
      }
    } catch (err) {
      console.error('Error controlado al anular venta:', err);
      alert(
        'No se pudo completar la operación automáticamente. Detalle: ' +
          (err?.message ?? 'Error de conexión')
      );
    } finally {
      setAnnulLoadingId(null);
    }
  };

  // Guardar nueva prenda en Firestore
  const handleSaveProduct = async () => {
    if (!newProdName.trim()) {
      alert('Ingresa el nombre de la prenda.');
      return;
    }

    const variantesLimpias = newVariants.map((v) => ({
      id: v?.id ? v.id : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
      talla: String(v?.talla ?? '').trim() ? String(v.talla).trim() : 'Única',
      color: String(v?.color ?? '').trim() ? String(v.color).trim() : 'Negro',
      costo: Number.isNaN(Number(v?.costo)) ? 0 : Math.max(0, Number(v.costo)),
      precio: Number.isNaN(Number(v?.precio)) ? 0 : Math.max(0, Number(v.precio)),
      stock: Number.isNaN(parseInt(v?.stock, 10)) ? 0 : Math.max(0, parseInt(v.stock, 10)),
      stockMinimo: Number.isNaN(parseInt(v?.stockMinimo, 10))
        ? 2
        : Math.max(0, parseInt(v.stockMinimo, 10)),
    }));

    const nuevoProd = {
      nombre: newProdName.trim(),
      categoria: newProdCat.trim() ? newProdCat.trim() : 'Ropa',
      subcategoria: newProdSubCat.trim() ? newProdSubCat.trim() : 'General',
      variantes: variantesLimpias,
    };

    try {
      if (user && isFirebaseConnected) {
        await runTransaction(db, async (transaction) => {
          const nuevoRef = doc(collection(db, 'products'));
          transaction.set(nuevoRef, nuevoProd);
        });
      } else {
        setProducts((prev) => [{ id: 'local-' + Date.now(), ...nuevoProd }, ...prev]);
      }

      setNewProdName('');
      setNewVariants([
        {
          id: 'v-' + Date.now(),
          talla: 'Única',
          color: 'Negro',
          costo: 10,
          precio: 20,
          stock: 5,
          stockMinimo: 2,
        },
      ]);
      setShowAddProductModal(false);
    } catch (err) {
      alert('Error al guardar prenda: ' + (err?.message ?? 'Error desconocido'));
    }
  };

  // Abrir Modal de Edición al pulsar una prenda en Inventario
  const openEditModal = (product) => {
    const variantesCopia = (Array.isArray(product?.variantes) ? product.variantes : []).map(
      (v) => ({
        id: v?.id ? v.id : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        talla: v?.talla ?? 'Única',
        color: v?.color ?? '',
        costo: Number(v?.costo ?? 0),
        precio: Number(v?.precio ?? 0),
        stock: Number(v?.stock ?? 0),
        stockMinimo: Number(v?.stockMinimo ?? 2),
      })
    );

    setEditingProduct({
      ...product,
      nombre: product?.nombre ?? '',
      categoria: product?.categoria ?? 'Ropa',
      subcategoria: product?.subcategoria ?? 'General',
      variantes: variantesCopia,
    });
  };

  // Guardar cambios del Modal de Edición en Firestore
  const handleSaveEditedProduct = async () => {
    if (!editingProduct) return;
    if (!editingProduct.nombre.trim()) {
      alert('Por favor ingresa el nombre de la prenda.');
      return;
    }

    setIsSavingEdit(true);
    try {
      const variantesLimpias = editingProduct.variantes.map((v) => ({
        id: v?.id ? v.id : 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
        talla: String(v?.talla ?? '').trim() ? String(v.talla).trim() : 'Única',
        color: String(v?.color ?? '').trim() ? String(v.color).trim() : 'General',
        costo: Number.isNaN(Number(v?.costo)) ? 0 : Math.max(0, Number(v.costo)),
        precio: Number.isNaN(Number(v?.precio)) ? 0 : Math.max(0, Number(v.precio)),
        stock: Number.isNaN(parseInt(v?.stock, 10)) ? 0 : Math.max(0, parseInt(v.stock, 10)),
        stockMinimo: Number.isNaN(parseInt(v?.stockMinimo, 10))
          ? 2
          : Math.max(0, parseInt(v.stockMinimo, 10)),
      }));

      const prendaActualizada = {
        ...editingProduct,
        nombre: editingProduct.nombre.trim(),
        categoria: editingProduct.categoria.trim(),
        subcategoria: editingProduct.subcategoria.trim(),
        variantes: variantesLimpias,
      };

      const editId = editingProduct?.id ? String(editingProduct.id).trim() : '';

      if (user && isFirebaseConnected && editId && !editId.startsWith('local-')) {
        await updateDoc(doc(db, 'products', editId), {
          nombre: prendaActualizada.nombre,
          categoria: prendaActualizada.categoria,
          subcategoria: prendaActualizada.subcategoria,
          variantes: prendaActualizada.variantes,
        });
      }

      setProducts((prev) =>
        prev.map((p) => (p?.id === prendaActualizada.id ? prendaActualizada : p))
      );
      setEditingProduct(null);
    } catch (err) {
      alert('Error al guardar cambios: ' + (err?.message ?? 'Error desconocido'));
    } finally {
      setIsSavingEdit(false);
    }
  };

  // Eliminar prenda completa
  const handleDeleteProduct = async (product) => {
    const seguro = window.confirm(
      `¿Seguro que deseas eliminar "${product?.nombre ?? 'esta prenda'}" de tu catálogo?`
    );
    if (!seguro) return;

    try {
      const prodId = product?.id ? String(product.id).trim() : '';
      if (user && isFirebaseConnected && prodId && !prodId.startsWith('local-')) {
        await deleteDoc(doc(db, 'products', prodId));
      }
      setProducts((prev) => prev.filter((p) => p?.id !== product?.id));
      setEditingProduct(null);
    } catch (err) {
      alert('Error al eliminar: ' + (err?.message ?? 'Error desconocido'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans select-none">
      {/* BARRA SUPERIOR */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between max-w-md mx-auto w-full">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-extrabold text-lg text-white shadow-md shadow-indigo-600/30">
            B
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-wide text-white leading-tight">
              Boutique POS
            </h1>
            <span className="text-xs text-slate-400 font-medium block">
              Boutik • Sincronizado
            </span>
          </div>
        </div>

        <div
          className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 border ${
            isFirebaseConnected
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
          }`}
        >
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              isFirebaseConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          {isFirebaseConnected ? 'Nube En Vivo' : 'Modo Local'}
        </div>
      </header>

      {/* NOTIFICACIÓN DE VENTA EXITOSA */}
      {saleSuccessMessage && (
        <div className="max-w-md mx-auto w-full px-4 pt-3">
          <div className="bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 px-4 py-3 rounded-2xl flex items-center gap-3 text-base font-semibold shadow-lg">
            <CheckCircle className="w-6 h-6 text-emerald-400 shrink-0" />
            <span>{saleSuccessMessage}</span>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 1: VENDER (PUNTO DE VENTA)                          */}
      {/* ========================================================= */}
      {activeTab === 'vender' && (
        <main className="p-4 flex-1 flex flex-col gap-4 max-w-md mx-auto w-full pb-28">
          {/* BUSCADOR AMPLIO Y CÓMODO */}
          <div className="relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Buscar prenda, color o talla..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-14 bg-slate-900 border border-slate-800 focus:border-indigo-500 rounded-2xl pl-12 pr-4 text-base text-white placeholder-slate-400 font-medium outline-none shadow-inner"
            />
          </div>

          {/* FILTROS DE CATEGORÍA */}
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCatFilter(cat)}
                className={`h-11 px-4 rounded-xl font-bold text-base whitespace-nowrap transition-all ${
                  selectedCatFilter === cat
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* LISTA DE PRODUCTOS PARA VENTA */}
          <div className="flex flex-col gap-4">
            {filteredProducts.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-300 text-base">
                No se encontraron prendas. Agrega mercadería en la pestaña{' '}
                <strong className="text-white">Inventario</strong>.
              </div>
            ) : (
              filteredProducts.map((p) => (
                <div
                  key={p.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3.5 shadow-md"
                >
                  <div>
                    <h3 className="text-xl font-bold text-white leading-snug">{p.nombre}</h3>
                    <span className="text-sm font-medium text-slate-400">
                      {p.categoria} • {p.subcategoria}
                    </span>
                  </div>

                  {/* TARJETAS DE VARIANTES: COLOR PRINCIPAL + SWATCH + TALLA SECUNDARIA */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {(p?.variantes ?? []).map((v) => {
                      const agotado = Number(v?.stock ?? 0) <= 0;
                      const pocoStock =
                        !agotado && Number(v?.stock ?? 0) <= Number(v?.stockMinimo ?? 2);

                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={agotado}
                          onClick={() => handleSelectVariantForSale(p, v)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                            agotado
                              ? 'bg-slate-950/50 border-slate-800/60 opacity-50 cursor-not-allowed'
                              : 'bg-slate-950 hover:bg-slate-800/90 active:scale-[0.99] border-slate-800 hover:border-indigo-500/50 shadow-sm'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2 w-full">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className="w-5 h-5 rounded-full border shrink-0 shadow-sm"
                                style={getColorSwatchStyle(v?.color)}
                              />
                              <span className="text-lg font-bold text-white leading-tight">
                                {v?.color ? v.color : 'Sin color'}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md font-medium">
                                Talla: {v?.talla ? v.talla : 'Única'}
                              </span>
                            </div>

                            <span className="text-lg font-semibold text-emerald-400 shrink-0">
                              ${Number(v?.precio ?? 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-slate-900 text-xs">
                            {agotado ? (
                              <span className="text-rose-400 font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> Agotado (0 un.)
                              </span>
                            ) : pocoStock ? (
                              <span className="text-amber-400 font-bold flex items-center gap-1.5">
                                <AlertTriangle className="w-4 h-4" /> ¡Stock bajo! Quedan {v?.stock} un.
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                Disponible: <strong className="text-slate-200">{v?.stock} un.</strong>
                              </span>
                            )}

                            <span className="text-indigo-400 font-semibold">
                              {agotado ? 'Sin stock' : 'Tocar para vender →'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: INVENTARIO                                       */}
      {/* ========================================================= */}
      {activeTab === 'inventario' && (
        <main className="p-4 flex-1 flex flex-col gap-5 max-w-md mx-auto w-full pb-28">
          {/* TARJETA KPI: TOTAL INVERTIDO */}
          <div className="bg-gradient-to-br from-indigo-950 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-2xl p-5 shadow-xl">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-bold uppercase tracking-wider text-indigo-300">
                Total Invertido (Capital)
              </span>
              <DollarSign className="w-6 h-6 text-indigo-400" />
            </div>
            <div className="text-3xl font-extrabold text-white tracking-tight my-1">
              $
              {totalInvertido.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </div>
            <div className="flex items-center justify-between text-base text-slate-300 mt-2 pt-2 border-t border-slate-800/80">
              <span>Unidades físicas disponibles:</span>
              <span className="font-bold text-lg text-emerald-400">{totalUnidadesFisicas} un.</span>
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
            Toca cualquier prenda para editar su stock, añadir colores/tallas o modificar precios.
          </p>

          {/* LISTA DE PRENDAS (SOLO LECTURA) */}
          <div className="flex flex-col gap-4">
            {products.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center text-slate-300 text-base">
                No hay prendas registradas aún. Toca arriba en{' '}
                <strong className="text-white">+ Nueva Prenda</strong> para cargar tu catálogo.
              </div>
            ) : (
              products.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openEditModal(p)}
                  className="bg-slate-900 hover:bg-slate-800/80 active:scale-[0.99] border border-slate-800 rounded-2xl p-5 cursor-pointer transition-all shadow-md flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-bold text-white leading-snug">{p.nombre}</h3>
                      <span className="text-sm text-slate-400 font-medium">
                        {p.categoria} • {p.subcategoria}
                      </span>
                    </div>
                    <span className="px-3.5 py-1.5 bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 rounded-xl text-sm font-bold">
                      Editar
                    </span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {(p?.variantes ?? []).map((v) => {
                      const agotado = Number(v?.stock ?? 0) <= 0;
                      const pocoStock =
                        !agotado && Number(v?.stock ?? 0) <= Number(v?.stockMinimo ?? 2);

                      return (
                        <div
                          key={v.id}
                          className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/90 flex flex-col gap-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              <span
                                className="w-5 h-5 rounded-full border shrink-0 shadow-sm"
                                style={getColorSwatchStyle(v?.color)}
                              />
                              <span className="text-lg font-bold text-white leading-tight">
                                {v?.color ? v.color : 'Sin color'}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-900 border border-slate-800 px-2.5 py-0.5 rounded-md font-medium">
                                Talla: {v?.talla ? v.talla : 'Única'}
                              </span>
                            </div>

                            <span className="text-lg font-semibold text-emerald-400 shrink-0">
                              ${Number(v?.precio ?? 0).toFixed(2)}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1.5 border-t border-slate-900 text-xs">
                            <span className="text-slate-400">
                              Costo: <strong className="text-slate-300">${Number(v?.costo ?? 0).toFixed(2)}</strong>
                            </span>

                            {agotado ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold">
                                Agotado: 0 un.
                              </span>
                            ) : pocoStock ? (
                              <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                                Stock bajo: {v?.stock} un. (Mín {v?.stockMinimo})
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-lg bg-slate-800 text-white font-bold text-sm">
                                Stock: {v?.stock} un.
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* VISTA 3: MÉTRICAS Y CIERRE DE CAJA                        */}
      {/* ========================================================= */}
      {activeTab === 'metricas' && (
        <main className="p-4 flex-1 flex flex-col gap-5 max-w-md mx-auto w-full pb-28">
          <h2 className="text-xl font-bold text-white">Resumen de Caja y Ventas</h2>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-sm text-slate-400 font-semibold block">Ventas Totales</span>
              <span className="text-2xl font-extrabold text-emerald-400 mt-1 block">
                ${metrics.totalIngresos.toFixed(2)}
              </span>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
              <span className="text-sm text-slate-400 font-semibold block">Ganancia Neta</span>
              <span
                className={`text-2xl font-extrabold mt-1 block ${
                  metrics.gananciaNeta < 0 ? 'text-rose-400' : 'text-indigo-400'
                }`}
              >
                ${metrics.gananciaNeta.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-white">Desglose por Método de Pago</h3>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">Efectivo</span>
                <span className="text-base font-bold text-white mt-1 block">
                  ${metrics.porEfectivo.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">QR / Transf.</span>
                <span className="text-base font-bold text-white mt-1 block">
                  ${metrics.porQR.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-xs text-slate-400 block">Tarjeta</span>
                <span className="text-base font-bold text-white mt-1 block">
                  ${metrics.porTarjeta.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* HISTORIAL DE VENTAS ACTIVAS */}
          <div className="flex flex-col gap-3">
            <h3 className="text-lg font-bold text-white">Historial de Ventas</h3>
            {activeSales.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-base">
                Aún no hay ventas activas registradas.
              </div>
            ) : (
              activeSales.map((s) => (
                <div
                  key={s.id}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <h4 className="text-lg font-bold text-white">{s?.productoNombre ?? 'Prenda'}</h4>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span
                          className="w-4 h-4 rounded-full border shrink-0"
                          style={getColorSwatchStyle(s?.color)}
                        />
                        <span className="text-base font-bold text-slate-200">
                          {s?.color ?? 'General'}
                        </span>
                        <span className="text-xs text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                          Talla: {s?.talla ?? 'Única'}
                        </span>
                      </div>
                      <span className="text-sm text-slate-400 block mt-1">
                        Cant: <strong className="text-white">{s?.cantidad ?? 1}</strong> • Pago:{' '}
                        <strong className="text-white">{s?.metodoPago ?? 'Efectivo'}</strong>
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-lg font-bold text-emerald-400 block">
                        ${Number(s?.total ?? 0).toFixed(2)}
                      </span>
                      <span className="text-xs text-slate-500">{s?.fechaLocal ?? ''}</span>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={annulLoadingId === s?.id}
                    onClick={() => handleAnnulSale(s)}
                    className="w-full h-12 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] border border-rose-500/30 text-rose-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                    {annulLoadingId === s?.id
                      ? 'Procesando anulación...'
                      : 'Anular venta y restaurar stock'}
                  </button>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* MODAL DE COBRO (AL TOCAR UNA VARIANTE EN VENDER)          */}
      {/* ========================================================= */}
      {cartItem && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 my-auto">
            <div className="border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                Confirmar Venta
              </span>
              <h3 className="text-xl font-bold text-white mt-0.5">
                {cartItem?.product?.nombre}
              </h3>
              <div className="flex items-center gap-2.5 mt-2">
                <span
                  className="w-5 h-5 rounded-full border shrink-0"
                  style={getColorSwatchStyle(cartItem?.variant?.color)}
                />
                <span className="text-lg font-bold text-white">
                  {cartItem?.variant?.color}
                </span>
                <span className="text-xs text-slate-400 bg-slate-950 px-2.5 py-1 rounded-md border border-slate-800">
                  Talla: {cartItem?.variant?.talla}
                </span>
              </div>
            </div>

            {/* Selector de Cantidad */}
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">
                Cantidad a vender (Disponible: {cartItem?.variant?.stock} un.)
              </label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleQtyChange(-1)}
                  className="w-14 h-12 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl text-xl font-bold text-white"
                >
                  -
                </button>
                <div className="flex-1 h-12 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-center text-xl font-extrabold text-white">
                  {cartQty}
                </div>
                <button
                  type="button"
                  onClick={() => handleQtyChange(1)}
                  className="w-14 h-12 bg-indigo-600 active:bg-indigo-500 rounded-xl text-xl font-bold text-white"
                >
                  +
                </button>
              </div>
            </div>

            {/* Método de Pago */}
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['Efectivo', 'QR', 'Tarjeta'].map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setPaymentMethod(metodo)}
                    className={`h-12 rounded-xl font-bold text-base border transition-all ${
                      paymentMethod === metodo
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>
            </div>

            {/* Total a cobrar obligatorio > 0 */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-semibold text-slate-300">
                  Total a Cobrar ($)
                </label>
                <span className="text-xs text-slate-400">
                  Sugerido: $
                  {(Number(cartItem?.variant?.precio ?? 0) * cartQty).toFixed(2)}
                </span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                placeholder="0.00"
                value={manualTotalInput}
                onChange={(e) => setManualTotalInput(e.target.value)}
                className={`w-full h-14 bg-slate-950 border rounded-xl px-4 text-2xl font-extrabold text-center outline-none ${
                  isSaleTotalValid
                    ? 'border-emerald-500/50 text-emerald-400'
                    : 'border-rose-500 text-rose-400'
                }`}
              />
              {!isSaleTotalValid && (
                <span className="text-xs text-rose-400 font-semibold block mt-1.5 text-center">
                  Ingresa un monto válido mayor a $0.00 para habilitar el cobro.
                </span>
              )}
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                disabled={isProcessingSale ? true : !isSaleTotalValid}
                onClick={handleConfirmSale}
                className={`w-full h-14 rounded-xl text-lg font-extrabold transition-all ${
                  isSaleTotalValid && !isProcessingSale
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isProcessingSale ? 'Procesando...' : 'Cobrar y Descontar Stock'}
              </button>
              <button
                type="button"
                onClick={() => setCartItem(null)}
                className="w-full h-12 bg-slate-800 text-slate-300 rounded-xl text-base font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL DE EDICIÓN CONTROLADA DE PRENDA                     */}
      {/* ========================================================= */}
      {editingProduct && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="text-xl font-bold text-white">Editar Prenda</h3>
              <button
                type="button"
                onClick={() => handleDeleteProduct(editingProduct)}
                className="h-11 px-3.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 rounded-xl text-sm font-bold flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" /> Eliminar
              </button>
            </div>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">
                  Nombre de la prenda
                </label>
                <input
                  type="text"
                  value={editingProduct.nombre}
                  onChange={(e) =>
                    setEditingProduct({ ...editingProduct, nombre: e.target.value })
                  }
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={editingProduct.categoria}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, categoria: e.target.value })
                    }
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">
                    Subcategoría
                  </label>
                  <input
                    type="text"
                    value={editingProduct.subcategoria}
                    onChange={(e) =>
                      setEditingProduct({ ...editingProduct, subcategoria: e.target.value })
                    }
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
              </div>

              <div className="mt-2 border-t border-slate-800 pt-4 flex flex-col gap-3">
                <span className="text-base font-bold text-white">Variantes, Colores y Stock</span>

                <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1">
                  {editingProduct.variantes.map((v, idx) => (
                    <div
                      key={v.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full border shrink-0"
                            style={getColorSwatchStyle(v.color)}
                          />
                          <span className="text-base font-bold text-indigo-400">
                            {v.color ? v.color : `Variante #${idx + 1}`}
                          </span>
                        </div>
                        {editingProduct.variantes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const filtradas = editingProduct.variantes.filter(
                                (_, i) => i !== idx
                              );
                              setEditingProduct({ ...editingProduct, variantes: filtradas });
                            }}
                            className="text-sm font-semibold text-rose-400 px-2 py-1"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Color (Principal)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Rojo, Negro, Beige"
                            value={v.color}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], color: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Talla
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Única, S, M, L"
                            value={v.talla}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], talla: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Costo Compra ($)
                          </label>
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
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Precio Venta ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.precio}
                            onChange={(e) => {
                              const copia = [...editingProduct.variantes];
                              copia[idx] = { ...copia[idx], precio: e.target.value };
                              setEditingProduct({ ...editingProduct, variantes: copia });
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-emerald-400 font-bold"
                          />
                        </div>
                      </div>

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
                              copia[idx] = {
                                ...copia[idx],
                                stock: Math.max(0, numeroBase - 1),
                              };
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

                <button
                  type="button"
                  onClick={() => {
                    const refVariante = editingProduct.variantes[0]
                      ? editingProduct.variantes[0]
                      : { costo: 0, precio: 0, talla: 'Única' };
                    setEditingProduct({
                      ...editingProduct,
                      variantes: [
                        ...editingProduct.variantes,
                        {
                          id: 'v-' + Date.now() + '-' + Math.random().toString(36).slice(2, 6),
                          talla: refVariante.talla ?? 'Única',
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

      {/* ========================================================= */}
      {/* MODAL DE NUEVA PRENDA                                     */}
      {/* ========================================================= */}
      {showAddProductModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl my-auto max-h-[92vh] overflow-y-auto flex flex-col gap-4">
            <h3 className="text-xl font-bold text-white border-b border-slate-800 pb-3">
              Agregar Nueva Prenda
            </h3>

            <div className="flex flex-col gap-3">
              <div>
                <label className="text-sm font-semibold text-slate-300 block mb-1">Nombre</label>
                <input
                  type="text"
                  placeholder="Ej: Medias de Red"
                  value={newProdName}
                  onChange={(e) => setNewProdName(e.target.value)}
                  className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">
                    Categoría
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Ropa"
                    value={newProdCat}
                    onChange={(e) => setNewProdCat(e.target.value)}
                    className="w-full h-12 bg-slate-950 border border-slate-700 rounded-xl px-3.5 text-base text-white"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-slate-300 block mb-1">
                    Subcategoría
                  </label>
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
                <span className="text-base font-bold text-white">Colores, Tallas y Precios</span>

                <div className="flex flex-col gap-4 max-h-72 overflow-y-auto pr-1">
                  {newVariants.map((v, idx) => (
                    <div
                      key={v.id}
                      className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                    >
                      <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-5 h-5 rounded-full border shrink-0"
                            style={getColorSwatchStyle(v.color)}
                          />
                          <span className="text-sm font-bold text-indigo-400">
                            {v.color ? v.color : `Variante #${idx + 1}`}
                          </span>
                        </div>
                        {newVariants.length > 1 && (
                          <button
                            type="button"
                            onClick={() =>
                              setNewVariants(newVariants.filter((_, i) => i !== idx))
                            }
                            className="text-sm font-semibold text-rose-400"
                          >
                            Quitar
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Color (Principal)
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Negro, Rojo, Beige"
                            value={v.color}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], color: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Talla
                          </label>
                          <input
                            type="text"
                            placeholder="Ej: Única, S, M"
                            value={v.talla}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], talla: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base text-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2.5">
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Costo ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.costo}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], costo: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-2.5 text-base text-white font-semibold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Venta ($)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={v.precio}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], precio: e.target.value };
                              setNewVariants(copia);
                            }}
                            className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-2.5 text-base text-emerald-400 font-bold"
                          />
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-slate-400 block mb-1">
                            Stock
                          </label>
                          <input
                            type="number"
                            value={v.stock}
                            onChange={(e) => {
                              const copia = [...newVariants];
                              copia[idx] = { ...copia[idx], stock: e.target.value };
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
                        talla: 'Única',
                        color: '',
                        costo: newVariants[0] ? newVariants[0].costo : 0,
                        precio: newVariants[0] ? newVariants[0].precio : 0,
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

      {/* ========================================================= */}
      {/* BARRA DE NAVEGACIÓN INFERIOR                              */}
      {/* ========================================================= */}
      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/95 backdrop-blur-md border-t border-slate-800">
        <div className="max-w-md mx-auto grid grid-cols-3 gap-1 p-2">
          <button
            type="button"
            onClick={() => setActiveTab('vender')}
            className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${
              activeTab === 'vender'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart className="w-5 h-5" />
            <span>Vender</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('inventario')}
            className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${
              activeTab === 'inventario'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Package className="w-5 h-5" />
            <span>Inventario</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('metricas')}
            className={`h-14 rounded-xl flex flex-col items-center justify-center gap-1 font-bold text-sm transition-all ${
              activeTab === 'metricas'
                ? 'bg-indigo-600/20 text-indigo-400 border border-indigo-500/30'
                : 'text-slate-400 hover:text-slate-200'
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