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
  // Mapa visual de colores en español a estilos Hex/CSS
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
    return { backgroundColor: '#64748b', borderColor: '#94a3b8' };
  };

  const [activeTab, setActiveTab] = useState('vender');
  const [user, setUser] = useState(null);
  const [isFirebaseConnected, setIsFirebaseConnected] = useState(false);

  const [products, setProducts] = useState([]);
  const [sales, setSales] = useState([]);

  // =========================================================
  // ESTADOS DEL PUNTO DE VENTA Y CARRITO MULTI-PRODUCTO
  // =========================================================
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState('Todas');
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [discountInput, setDiscountInput] = useState('');
  const [manualTotalInput, setManualTotalInput] = useState('');
  const [isTotalOverridden, setIsTotalOverridden] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('Efectivo');
  const [isProcessingSale, setIsProcessingSale] = useState(false);
  const [saleSuccessMessage, setSaleSuccessMessage] = useState(null);
  const [annulLoadingId, setAnnulLoadingId] = useState(null);

  // =========================================================
  // ESTADOS DE FILTROS DE FECHAS EN MÉTRICAS
  // =========================================================
  const [dateRangeFilter, setDateRangeFilter] = useState('hoy'); // 'hoy', 'semana', 'mes', 'todo', 'personalizado'
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');

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

    const qSales = query(collection(db, 'sales'), orderBy('timestamp', 'desc'), limit(400));
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

  // Filtrado de productos en Vender
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

  // =========================================================
  // LÓGICA DEL CARRITO MULTI-PRODUCTO
  // =========================================================
  const getLiveStock = (productId, variantId, fallbackStock) => {
    const prod = products.find((p) => p?.id === productId);
    if (!prod) return Number(fallbackStock ?? 0);
    const vars = Array.isArray(prod?.variantes) ? prod.variantes : [];
    const foundVar = vars.find((v) => v?.id === variantId);
    return foundVar ? Math.max(0, Number(foundVar?.stock ?? 0)) : Number(fallbackStock ?? 0);
  };

  const cartTotalItems = useMemo(() => {
    return cart.reduce((acc, item) => acc + Number(item?.cantidad ?? 0), 0);
  }, [cart]);

  const cartSubtotal = useMemo(() => {
    return cart.reduce(
      (acc, item) => acc + Number(item?.precioUnitario ?? 0) * Number(item?.cantidad ?? 0),
      0
    );
  }, [cart]);

  const parsedDiscount = useMemo(() => {
    const val = parseFloat(String(discountInput ?? '').trim());
    return Number.isNaN(val) ? 0 : Math.max(0, val);
  }, [discountInput]);

  // Sincronizar el Total a Cobrar cuando cambia el subtotal o el descuento
  useEffect(() => {
    if (!isTotalOverridden) {
      const calculado = Math.max(0, cartSubtotal - parsedDiscount);
      setManualTotalInput(calculado > 0 ? calculado.toFixed(2) : cart.length > 0 ? '0.00' : '');
    }
  }, [cartSubtotal, parsedDiscount, isTotalOverridden, cart.length]);

  const finalTotalToCharge = useMemo(() => {
    const texto = String(manualTotalInput ?? '').trim();
    if (!texto) return NaN;
    return parseFloat(texto);
  }, [manualTotalInput]);

  const isCartTotalValid = useMemo(() => {
    return cart.length > 0 && !Number.isNaN(finalTotalToCharge) && finalTotalToCharge > 0;
  }, [cart.length, finalTotalToCharge]);

  // Añadir variante al carrito desde el catálogo
  const handleAddToCart = (product, variant) => {
    const stockDisp = Math.max(0, Number(variant?.stock ?? 0));
    if (stockDisp <= 0) {
      alert('Esta variante no tiene stock disponible.');
      return;
    }

    const existingIdx = cart.findIndex(
      (item) => item.productId === product.id && item.variantId === variant.id
    );
    const cantidadActualEnCarrito = existingIdx > -1 ? Number(cart[existingIdx].cantidad ?? 0) : 0;

    if (cantidadActualEnCarrito + 1 > stockDisp) {
      alert(
        `Stock máximo alcanzado. Solo hay ${stockDisp} un. disponibles de ${product.nombre} (${variant.color}) y ya tienes ${cantidadActualEnCarrito} en el carrito.`
      );
      return;
    }

    setIsTotalOverridden(false);

    if (existingIdx > -1) {
      setCart((prev) =>
        prev.map((item, i) =>
          i === existingIdx
            ? { ...item, cantidad: item.cantidad + 1, stockMax: stockDisp }
            : item
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: product.id,
          productoNombre: product.nombre ?? 'Prenda',
          variantId: variant.id,
          color: variant.color ?? 'General',
          talla: variant.talla ?? 'Única',
          precioUnitario: Math.max(0, Number(variant.precio ?? 0)),
          costoUnitario: Math.max(0, Number(variant.costo ?? 0)),
          cantidad: 1,
          stockMax: stockDisp,
        },
      ]);
    }
  };

  // Modificar cantidad de un ítem dentro del carrito (+ / -)
  const handleUpdateCartQty = (productId, variantId, delta) => {
    setIsTotalOverridden(false);
    setCart((prev) => {
      const updated = [];
      for (const item of prev) {
        if (item.productId === productId && item.variantId === variantId) {
          const maxStock = getLiveStock(productId, variantId, item.stockMax);
          const nuevaCant = item.cantidad + delta;

          if (delta > 0 && nuevaCant > maxStock) {
            alert(`No puedes agregar más. Solo existen ${maxStock} unidades en stock.`);
            updated.push({ ...item, stockMax: maxStock });
          } else if (nuevaCant > 0) {
            updated.push({ ...item, cantidad: nuevaCant, stockMax: maxStock });
          }
          // Si nuevaCant <= 0, no se agrega a updated (se elimina del carrito)
        } else {
          updated.push(item);
        }
      }
      if (updated.length === 0) {
        setIsCartOpen(false);
      }
      return updated;
    });
  };

  // Eliminar un ítem del carrito directamente
  const handleRemoveCartItem = (productId, variantId) => {
    setIsTotalOverridden(false);
    setCart((prev) => {
      const next = prev.filter(
        (item) => !(item.productId === productId && item.variantId === variantId)
      );
      if (next.length === 0) {
        setIsCartOpen(false);
      }
      return next;
    });
  };

  // Confirmar y cobrar todo el carrito en una sola transacción
  const handleConfirmCartSale = async () => {
    if (cart.length === 0 ? true : isProcessingSale) return;
    if (!isCartTotalValid) {
      alert('El total a cobrar debe ser mayor a $0.00 para registrar la venta.');
      return;
    }

    const totalCobrado = Number(finalTotalToCharge.toFixed(2));
    const subtotalVenta = Number(cartSubtotal.toFixed(2));
    const descuentoAplicado = Math.max(0, Number((subtotalVenta - totalCobrado).toFixed(2)));
    const costoTotalAcumulado = Number(
      cart
        .reduce((acc, item) => acc + Number(item.costoUnitario ?? 0) * Number(item.cantidad ?? 1), 0)
        .toFixed(2)
    );
    const gananciaNetaVenta = Number((totalCobrado - costoTotalAcumulado).toFixed(2));

    const itemsVendidos = cart.map((item) => ({
      productId: item.productId,
      variantId: item.variantId,
      productoNombre: item.productoNombre,
      color: item.color,
      talla: item.talla,
      cantidad: Number(item.cantidad),
      precioUnitario: Number(item.precioUnitario),
      costoUnitario: Number(item.costoUnitario),
      subtotalItem: Number((item.precioUnitario * item.cantidad).toFixed(2)),
    }));

    const ahora = new Date();
    const fechaFormateada =
      ahora.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
      ' ' +
      ahora.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setIsProcessingSale(true);
    try {
      if (user && isFirebaseConnected) {
        await runTransaction(db, async (transaction) => {
          // Agrupar por productId para leer y actualizar cada producto una sola vez en la transacción
          const mapaPorProducto = new Map();
          for (const item of itemsVendidos) {
            const pid = String(item.productId ?? '').trim();
            if (!pid ? true : pid.startsWith('local-')) continue;
            if (!mapaPorProducto.has(pid)) {
              mapaPorProducto.set(pid, []);
            }
            mapaPorProducto.get(pid).push(item);
          }

          // 1. Fase de Lectura y Validación estricta de stock
          const actualizacionesPendientes = [];
          for (const [pid, itemsDelProd] of mapaPorProducto.entries()) {
            const prodRef = doc(db, 'products', pid);
            const prodSnap = await transaction.get(prodRef);
            if (!prodSnap.exists()) {
              throw new Error(`El producto "${itemsDelProd[0]?.productoNombre}" ya no existe.`);
            }

            const data = prodSnap.data();
            const listaVariantes = Array.isArray(data?.variantes) ? [...data.variantes] : [];

            for (const itemPedido of itemsDelProd) {
              const idxVar = listaVariantes.findIndex((v) => {
                if (!v) return false;
                if (v?.id && itemPedido?.variantId && String(v.id) === String(itemPedido.variantId)) {
                  return true;
                }
                return (
                  String(v?.color ?? '').toLowerCase() === String(itemPedido.color ?? '').toLowerCase() &&
                  String(v?.talla ?? '').toLowerCase() === String(itemPedido.talla ?? '').toLowerCase()
                );
              });

              if (idxVar === -1) {
                throw new Error(
                  `No se encontró la variante ${itemPedido.color} (${itemPedido.talla}) de ${itemPedido.productoNombre}.`
                );
              }

              const stockActual = Number(listaVariantes[idxVar]?.stock ?? 0);
              if (stockActual < itemPedido.cantidad) {
                throw new Error(
                  `Stock insuficiente para ${itemPedido.productoNombre} (${itemPedido.color}). Disponible: ${stockActual} un.`
                );
              }

              listaVariantes[idxVar] = {
                ...listaVariantes[idxVar],
                stock: stockActual - itemPedido.cantidad,
              };
            }

            actualizacionesPendientes.push({ prodRef, listaVariantes });
          }

          // 2. Fase de Escritura: descontar stock de todos los productos
          for (const act of actualizacionesPendientes) {
            transaction.update(act.prodRef, { variantes: act.listaVariantes });
          }

          // 3. Registrar la venta única agrupada
          const nuevaVentaRef = doc(collection(db, 'sales'));
          transaction.set(nuevaVentaRef, {
            esVentaAgrupada: true,
            items: itemsVendidos,
            productId: itemsVendidos[0]?.productId ?? '',
            variantId: itemsVendidos[0]?.variantId ?? '',
            productoNombre:
              itemsVendidos.length === 1
                ? itemsVendidos[0].productoNombre
                : `Ticket (${itemsVendidos.length} prendas)`,
            color: itemsVendidos.length === 1 ? itemsVendidos[0].color : 'Varios',
            talla: itemsVendidos.length === 1 ? itemsVendidos[0].talla : 'Varias',
            cantidad: cartTotalItems,
            precioUnitario: itemsVendidos[0]?.precioUnitario ?? 0,
            costoUnitario: itemsVendidos[0]?.costoUnitario ?? 0,
            subtotal: subtotalVenta,
            descuento: descuentoAplicado,
            total: totalCobrado,
            costoTotal: costoTotalAcumulado,
            gananciaNeta: gananciaNetaVenta,
            metodoPago: paymentMethod,
            timestamp: serverTimestamp(),
            fechaIso: ahora.toISOString(),
            fechaLocal: fechaFormateada,
          });
        });
      } else {
        // Modo local de respaldo
        setProducts((prev) =>
          prev.map((p) => {
            const itemsDeEsteProd = itemsVendidos.filter((i) => i.productId === p.id);
            if (itemsDeEsteProd.length === 0) return p;
            const vars = Array.isArray(p.variantes) ? p.variantes : [];
            return {
              ...p,
              variantes: vars.map((v) => {
                const matchItem = itemsDeEsteProd.find((i) => i.variantId === v.id);
                if (!matchItem) return v;
                return { ...v, stock: Math.max(0, Number(v.stock ?? 0) - matchItem.cantidad) };
              }),
            };
          })
        );
      }

      setSaleSuccessMessage(
        `Venta cobrada (${paymentMethod}): ${cartTotalItems} art. por $${totalCobrado.toFixed(2)}`
      );
      setTimeout(() => setSaleSuccessMessage(null), 4000);

      // Limpiar carrito
      setCart([]);
      setDiscountInput('');
      setManualTotalInput('');
      setIsTotalOverridden(false);
      setIsCartOpen(false);
    } catch (err) {
      alert('No se pudo completar la venta: ' + (err?.message ?? 'Error desconocido'));
    } finally {
      setIsProcessingSale(false);
    }
  };

  // =========================================================
  // ANULACIÓN SEGURA DE VENTA (SOPORTA MULTI-PRODUCTO Y ANTIGUAS)
  // =========================================================
  const handleAnnulSale = async (sale) => {
    if (!sale) return;

    const saleId = sale?.id ? String(sale.id).trim() : '';
    const listaItemsVenta =
      Array.isArray(sale?.items) && sale.items.length > 0
        ? sale.items
        : [
            {
              productId: sale?.productId ?? sale?.prodId ?? '',
              variantId: sale?.variantId ?? '',
              productoNombre: sale?.productoNombre ?? sale?.nombre ?? 'Prenda',
              color: sale?.color ?? '',
              talla: sale?.talla ?? '',
              cantidad: Math.max(1, Number(sale?.cantidad ?? 1)),
            },
          ];

    setAnnulLoadingId(saleId ? saleId : 'temp-id');

    try {
      // Agrupar qué variantes se pueden restaurar en el inventario actual
      const restauracionesPorProdId = new Map();
      let algunItemEncontrado = false;

      for (const item of listaItemsVenta) {
        const rawPid = item?.productId ? String(item.productId).trim() : '';
        const nombreBuscado = String(item?.productoNombre ?? '').trim().toLowerCase();

        const prodEncontrado = products.find((p) => {
          if (!p) return false;
          if (rawPid && p?.id && String(p.id) === rawPid) return true;
          const nomP = String(p?.nombre ?? '').trim().toLowerCase();
          return Boolean(nomP && nombreBuscado && nomP === nombreBuscado);
        });

        if (!prodEncontrado) continue;

        const pidReal = String(prodEncontrado.id);
        const variantesActuales = restauracionesPorProdId.has(pidReal)
          ? restauracionesPorProdId.get(pidReal)
          : Array.isArray(prodEncontrado?.variantes)
          ? [...prodEncontrado.variantes]
          : [];

        const idxVar = variantesActuales.findIndex((v) => {
          if (!v) return false;
          if (v?.id && item?.variantId && String(v.id) === String(item.variantId)) return true;
          const cV = String(v?.color ?? '').trim().toLowerCase();
          const cI = String(item?.color ?? '').trim().toLowerCase();
          const tV = String(v?.talla ?? '').trim().toLowerCase();
          const tI = String(item?.talla ?? '').trim().toLowerCase();
          if (cV && cI && cV === cI) {
            return tI ? tV === tI : true;
          }
          return false;
        });

        if (idxVar !== -1) {
          algunItemEncontrado = true;
          const cantDevolver = Math.max(1, Number(item?.cantidad ?? 1));
          variantesActuales[idxVar] = {
            ...variantesActuales[idxVar],
            stock: Math.max(0, Number(variantesActuales[idxVar]?.stock ?? 0)) + cantDevolver,
          };
          restauracionesPorProdId.set(pidReal, variantesActuales);
        }
      }

      if (algunItemEncontrado) {
        const confirmar = window.confirm(
          `¿Anular este ticket por $${Number(sale?.total ?? 0).toFixed(2)} y devolver las prendas al inventario?`
        );
        if (!confirmar) {
          setAnnulLoadingId(null);
          return;
        }

        if (user && isFirebaseConnected) {
          for (const [pidReal, nuevasVars] of restauracionesPorProdId.entries()) {
            if (!pidReal.startsWith('local-')) {
              await updateDoc(doc(db, 'products', pidReal), { variantes: nuevasVars });
            }
          }
          if (saleId && !saleId.startsWith('local-')) {
            await deleteDoc(doc(db, 'sales', saleId));
          }
        }

        setProducts((prev) =>
          prev.map((p) =>
            restauracionesPorProdId.has(String(p?.id))
              ? { ...p, variantes: restauracionesPorProdId.get(String(p.id)) }
              : p
          )
        );
        setSales((prev) => prev.filter((s) => s?.id !== sale?.id));
      } else {
        const confirmarLimpieza = window.confirm(
          'No se encontró el producto en inventario. ¿Deseas eliminar el registro de venta de todas formas?'
        );
        if (!confirmarLimpieza) {
          setAnnulLoadingId(null);
          return;
        }

        if (user && isFirebaseConnected && saleId && !saleId.startsWith('local-')) {
          await deleteDoc(doc(db, 'sales', saleId));
        }
        setSales((prev) => prev.filter((s) => s?.id !== sale?.id));
      }
    } catch (err) {
      console.error('Error al anular venta:', err);
      alert('No se pudo completar la anulación: ' + (err?.message ?? 'Error de conexión'));
    } finally {
      setAnnulLoadingId(null);
    }
  };

  // =========================================================
  // FILTRO DE FECHAS Y RANKING TOP 5 EN MÉTRICAS
  // =========================================================
  const extractSaleDate = (sale) => {
    if (sale?.timestamp && typeof sale.timestamp.toDate === 'function') {
      return sale.timestamp.toDate();
    }
    if (sale?.timestamp?.seconds) {
      return new Date(sale.timestamp.seconds * 1000);
    }
    if (sale?.fechaIso) {
      const parsed = new Date(sale.fechaIso);
      if (!Number.isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  };

  const activeSales = useMemo(() => {
    return sales.filter((s) => Boolean(s) && !s?.anulada);
  }, [sales]);

  const filteredSales = useMemo(() => {
    if (dateRangeFilter === 'todo') return activeSales;

    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 0, 0, 0, 0);
    const finHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate(), 23, 59, 59, 999);

    return activeSales.filter((s) => {
      const fechaVenta = extractSaleDate(s);
      const ms = fechaVenta.getTime();

      if (dateRangeFilter === 'hoy') {
        return ms >= inicioHoy.getTime() && ms <= finHoy.getTime();
      }

      if (dateRangeFilter === 'semana') {
        const diaSemana = ahora.getDay(); // 0 domingo, 1 lunes...
        const diasDesdeLunes = diaSemana === 0 ? 6 : diaSemana - 1;
        const inicioSemana = new Date(
          ahora.getFullYear(),
          ahora.getMonth(),
          ahora.getDate() - diasDesdeLunes,
          0,
          0,
          0,
          0
        );
        return ms >= inicioSemana.getTime() && ms <= finHoy.getTime();
      }

      if (dateRangeFilter === 'mes') {
        const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1, 0, 0, 0, 0);
        return ms >= inicioMes.getTime() && ms <= finHoy.getTime();
      }

      if (dateRangeFilter === 'personalizado') {
        let cumpleDesde = true;
        let cumpleHasta = true;

        if (customDateFrom) {
          const [y, m, d] = customDateFrom.split('-').map(Number);
          const desdeDate = new Date(y, m - 1, d, 0, 0, 0, 0);
          cumpleDesde = ms >= desdeDate.getTime();
        }
        if (customDateTo) {
          const [y, m, d] = customDateTo.split('-').map(Number);
          const hastaDate = new Date(y, m - 1, d, 23, 59, 59, 999);
          cumpleHasta = ms <= hastaDate.getTime();
        }
        return cumpleDesde && cumpleHasta;
      }

      return true;
    });
  }, [activeSales, dateRangeFilter, customDateFrom, customDateTo]);

  // Totales dinámicos según el filtro de fecha seleccionado
  const metrics = useMemo(() => {
    let totalIngresos = 0;
    let gananciaNeta = 0;
    let porEfectivo = 0;
    let porQR = 0;

    filteredSales.forEach((s) => {
      const totalCobrado = Math.max(0, Number(s?.total ?? 0));
      let costoVenta = 0;

      if (s?.costoTotal !== undefined) {
        costoVenta = Math.max(0, Number(s.costoTotal));
      } else if (Array.isArray(s?.items) && s.items.length > 0) {
        costoVenta = s.items.reduce(
          (acc, i) => acc + Math.max(0, Number(i?.costoUnitario ?? 0)) * Math.max(1, Number(i?.cantidad ?? 1)),
          0
        );
      } else {
        const cant = Math.max(1, Number(s?.cantidad ?? 1));
        const costoUnit = Math.max(0, Number(s?.costoUnitario ?? 0));
        costoVenta = costoUnit * cant;
      }

      totalIngresos += totalCobrado;
      gananciaNeta += totalCobrado - costoVenta;

      const metodo = String(s?.metodoPago ?? 'Efectivo').toLowerCase();
      if (metodo.includes('efectivo')) {
        porEfectivo += totalCobrado;
      } else {
        porQR += totalCobrado;
      }
    });

    return { totalIngresos, gananciaNeta, porEfectivo, porQR };
  }, [filteredSales]);

  // Top 5 Prendas Más Vendidas en el período seleccionado
  const topSellingProducts = useMemo(() => {
    const prodMap = new Map();

    filteredSales.forEach((s) => {
      const itemsList =
        Array.isArray(s?.items) && s.items.length > 0
          ? s.items
          : [
              {
                productId: s?.productId ?? '',
                productoNombre: s?.productoNombre ?? 'Prenda',
                color: s?.color ?? 'General',
                talla: s?.talla ?? 'Única',
                cantidad: Math.max(1, Number(s?.cantidad ?? 1)),
                subtotalItem: Math.max(0, Number(s?.total ?? 0)),
              },
            ];

      itemsList.forEach((item) => {
        const nombre = String(item?.productoNombre ?? 'Prenda').trim();
        const claveProd = nombre.toLowerCase();
        const cant = Math.max(1, Number(item?.cantidad ?? 1));
        const color = String(item?.color ?? 'General').trim();
        const talla = String(item?.talla ?? 'Única').trim();
        const claveVariante = `${color} • Talla ${talla}`;

        if (!prodMap.has(claveProd)) {
          prodMap.set(claveProd, {
            nombre,
            totalUnidades: 0,
            variantesCount: new Map(),
          });
        }

        const registro = prodMap.get(claveProd);
        registro.totalUnidades += cant;

        const prevVar = registro.variantesCount.get(claveVariante) ?? {
          color,
          talla,
          unidades: 0,
        };
        prevVar.unidades += cant;
        registro.variantesCount.set(claveVariante, prevVar);
      });
    });

    const listaOrdenada = Array.from(prodMap.values())
      .map((entry) => {
        let mejorVariante = { color: 'General', talla: 'Única', unidades: 0 };
        for (const vData of entry.variantesCount.values()) {
          if (vData.unidades > mejorVariante.unidades) {
            mejorVariante = vData;
          }
        }
        return {
          nombre: entry.nombre,
          totalUnidades: entry.totalUnidades,
          mejorColor: mejorVariante.color,
          mejorTalla: mejorVariante.talla,
          unidadesMejorVariante: mejorVariante.unidades,
        };
      })
      .sort((a, b) => b.totalUnidades - a.totalUnidades)
      .slice(0, 5);

    return listaOrdenada;
  }, [filteredSales]);

  const maxUnidadesTop = useMemo(() => {
    return topSellingProducts.length > 0 ? Math.max(1, topSellingProducts[0].totalUnidades) : 1;
  }, [topSellingProducts]);

  // =========================================================
  // FUNCIONES DE GESTIÓN DE INVENTARIO (NUEVO / EDITAR / BORRAR)
  // =========================================================
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
      {/* VISTA 1: VENDER (PUNTO DE VENTA CON CARRITO)              */}
      {/* ========================================================= */}
      {activeTab === 'vender' && (
        <main className="p-4 flex-1 flex flex-col gap-4 max-w-md mx-auto w-full pb-40">
          {/* BUSCADOR AMPLIO */}
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

          {/* LISTA DE PRODUCTOS PARA AÑADIR AL CARRITO */}
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

                  {/* TARJETAS DE VARIANTES */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {(p?.variantes ?? []).map((v) => {
                      const stockDisp = Math.max(0, Number(v?.stock ?? 0));
                      const agotado = stockDisp <= 0;
                      const pocoStock = !agotado && stockDisp <= Number(v?.stockMinimo ?? 2);
                      const enCarritoItem = cart.find(
                        (item) => item.productId === p.id && item.variantId === v.id
                      );
                      const cantEnCarrito = enCarritoItem ? enCarritoItem.cantidad : 0;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={agotado}
                          onClick={() => handleAddToCart(p, v)}
                          className={`w-full text-left p-4 rounded-xl border transition-all flex flex-col gap-2 ${
                            agotado
                              ? 'bg-slate-950/50 border-slate-800/60 opacity-50 cursor-not-allowed'
                              : cantEnCarrito > 0
                              ? 'bg-indigo-950/40 border-indigo-500 shadow-md'
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
                                <AlertTriangle className="w-4 h-4" /> ¡Stock bajo! Quedan {stockDisp} un.
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">
                                Disponible: <strong className="text-slate-200">{stockDisp} un.</strong>
                              </span>
                            )}

                            {cantEnCarrito > 0 ? (
                              <span className="px-2.5 py-0.5 rounded-full bg-indigo-600 text-white font-extrabold text-xs">
                                En carrito: {cantEnCarrito} un. (+1)
                              </span>
                            ) : (
                              <span className="text-indigo-400 font-semibold">
                                {agotado ? 'Sin stock' : '+ Añadir al carrito'}
                              </span>
                            )}
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

      {/* BARRA FLOTANTE DEL CARRITO MULTI-PRODUCTO */}
      {cart.length > 0 && (
        <div className="fixed bottom-20 left-0 right-0 z-40 px-4 max-w-md mx-auto">
          <button
            type="button"
            onClick={() => setIsCartOpen(true)}
            className="w-full h-16 bg-indigo-600 hover:bg-indigo-500 active:scale-[0.99] text-white rounded-2xl px-4 shadow-2xl shadow-indigo-600/50 border border-indigo-400/40 flex items-center justify-between transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="relative bg-indigo-800/80 p-2.5 rounded-xl">
                <ShoppingCart className="w-6 h-6 text-white" />
                <span className="absolute -top-1.5 -right-1.5 bg-emerald-400 text-slate-950 font-extrabold text-xs w-5 h-5 rounded-full flex items-center justify-center">
                  {cartTotalItems}
                </span>
              </div>
              <div className="text-left">
                <span className="text-base font-extrabold block leading-tight">
                  {cartTotalItems} {cartTotalItems === 1 ? 'artículo' : 'artículos'} • $
                  {(Number.isNaN(finalTotalToCharge) ? cartSubtotal : finalTotalToCharge).toFixed(2)}
                </span>
                <span className="text-xs text-indigo-200 font-medium block">
                  Toca para revisar o cobrar
                </span>
              </div>
            </div>

            <span className="bg-white text-indigo-700 font-extrabold text-sm px-3.5 py-2 rounded-xl shrink-0 shadow-sm">
              Ver Carrito / Cobrar
            </span>
          </button>
        </div>
      )}

      {/* ========================================================= */}
      {/* VISTA 2: INVENTARIO                                       */}
      {/* ========================================================= */}
      {activeTab === 'inventario' && (
        <main className="p-4 flex-1 flex flex-col gap-5 max-w-md mx-auto w-full pb-36">
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
      {/* VISTA 3: MÉTRICAS, FILTRO DE FECHAS Y TOP 5 MÁS VENDIDAS  */}
      {/* ========================================================= */}
      {activeTab === 'metricas' && (
        <main className="p-4 flex-1 flex flex-col gap-5 max-w-md mx-auto w-full pb-36">
          <div className="flex flex-col gap-3">
            <h2 className="text-xl font-bold text-white">Métricas y Cierre de Caja</h2>

            {/* BOTONES DE FILTRO POR RANGO DE FECHAS */}
            <div className="grid grid-cols-2 gap-2">
              {[
                { id: 'hoy', label: 'Hoy' },
                { id: 'semana', label: 'Esta Semana' },
                { id: 'mes', label: 'Este Mes' },
                { id: 'todo', label: 'Todo el Historial' },
              ].map((filtro) => (
                <button
                  key={filtro.id}
                  type="button"
                  onClick={() => setDateRangeFilter(filtro.id)}
                  className={`h-11 px-3 rounded-xl font-bold text-sm transition-all border ${
                    dateRangeFilter === filtro.id
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {filtro.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setDateRangeFilter('personalizado')}
              className={`h-11 px-4 rounded-xl font-bold text-sm transition-all border w-full ${
                dateRangeFilter === 'personalizado'
                  ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                  : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
              }`}
            >
              Rango de Fecha Personalizado (Desde / Hasta)
            </button>

            {/* SELECTOR DE FECHA PERSONALIZADA */}
            {dateRangeFilter === 'personalizado' && (
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Desde
                  </label>
                  <input
                    type="date"
                    value={customDateFrom}
                    onChange={(e) => setCustomDateFrom(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-2.5 text-sm text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Hasta
                  </label>
                  <input
                    type="date"
                    value={customDateTo}
                    onChange={(e) => setCustomDateTo(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-700 rounded-xl px-2.5 text-sm text-white"
                  />
                </div>
              </div>
            )}
          </div>

          {/* TARJETAS DE VENTAS TOTALES Y GANANCIA NETA */}
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

          {/* DESGLOSE EFECTIVO VS QR / TRANSF. */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-3">
            <h3 className="text-base font-bold text-white">Desglose por Método de Pago</h3>
            <div className="grid grid-cols-2 gap-3 text-center">
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <span className="text-sm text-slate-400 font-medium block">Efectivo</span>
                <span className="text-xl font-extrabold text-white mt-1 block">
                  ${metrics.porEfectivo.toFixed(2)}
                </span>
              </div>
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3.5">
                <span className="text-sm text-slate-400 font-medium block">QR / Transf.</span>
                <span className="text-xl font-extrabold text-white mt-1 block">
                  ${metrics.porQR.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* SECCIÓN: TOP 5 PRENDAS MÁS VENDIDAS */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-indigo-400" />
                Top 5 Prendas Más Vendidas
              </h3>
              <span className="text-xs font-bold text-indigo-300 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 rounded-lg">
                Ranking
              </span>
            </div>

            {topSellingProducts.length === 0 ? (
              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-5 text-center text-slate-400 text-sm">
                No hay ventas registradas en este período para calcular el ranking.
              </div>
            ) : (
              <div className="flex flex-col gap-3.5">
                {topSellingProducts.map((prod, index) => {
                  const porcentaje = Math.max(
                    12,
                    Math.round((prod.totalUnidades / maxUnidadesTop) * 100)
                  );

                  return (
                    <div
                      key={prod.nombre + index}
                      className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-7 h-7 rounded-lg font-extrabold text-sm flex items-center justify-center shrink-0 ${
                              index === 0
                                ? 'bg-amber-500 text-slate-950'
                                : index === 1
                                ? 'bg-slate-300 text-slate-950'
                                : index === 2
                                ? 'bg-amber-700 text-white'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{index + 1}
                          </span>
                          <div>
                            <h4 className="text-base font-bold text-white leading-snug">
                              {prod.nombre}
                            </h4>
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                              <span className="text-xs text-slate-400">Más vendido:</span>
                              <span
                                className="w-3.5 h-3.5 rounded-full border shrink-0"
                                style={getColorSwatchStyle(prod.mejorColor)}
                              />
                              <span className="text-xs font-bold text-slate-200">
                                {prod.mejorColor}
                              </span>
                              <span className="text-xs text-slate-400">
                                (Talla {prod.mejorTalla})
                              </span>
                            </div>
                          </div>
                        </div>

                        <span className="px-3 py-1 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-extrabold text-sm shrink-0">
                          {prod.totalUnidades} un.
                        </span>
                      </div>

                      {/* Barra de progreso de volumen relativo */}
                      <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 rounded-full transition-all"
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* HISTORIAL DE VENTAS FILTRADO CON DESGLOSE DE TICKET */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">
                Historial de Ventas ({filteredSales.length})
              </h3>
            </div>

            {filteredSales.length === 0 ? (
              <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-base">
                No hay ventas registradas en el período seleccionado.
              </div>
            ) : (
              filteredSales.map((s) => {
                const itemsTicket =
                  Array.isArray(s?.items) && s.items.length > 0
                    ? s.items
                    : [
                        {
                          productoNombre: s?.productoNombre ?? 'Prenda',
                          color: s?.color ?? 'General',
                          talla: s?.talla ?? 'Única',
                          cantidad: Math.max(1, Number(s?.cantidad ?? 1)),
                          precioUnitario: Number(s?.precioUnitario ?? s?.total ?? 0),
                          subtotalItem: Number(s?.total ?? 0),
                        },
                      ];

                return (
                  <div
                    key={s.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3"
                  >
                    {/* Cabecera del Ticket */}
                    <div className="flex justify-between items-start border-b border-slate-800 pb-2.5">
                      <div>
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-400 block">
                          Pago: {s?.metodoPago ?? 'Efectivo'}
                        </span>
                        <span className="text-xs text-slate-400 block mt-0.5">
                          {s?.fechaLocal ?? ''}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-xl font-extrabold text-emerald-400 block">
                          ${Number(s?.total ?? 0).toFixed(2)}
                        </span>
                        {Number(s?.descuento ?? 0) > 0 && (
                          <span className="text-xs text-amber-400 font-semibold block">
                            Desc: -${Number(s.descuento).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Desglose de prendas vendidas en este ticket */}
                    <div className="flex flex-col gap-2">
                      {itemsTicket.map((item, idx) => (
                        <div
                          key={idx}
                          className="bg-slate-950 border border-slate-800/80 rounded-xl p-3 flex items-center justify-between gap-2"
                        >
                          <div>
                            <h4 className="text-base font-bold text-white leading-snug">
                              {item?.productoNombre ?? 'Prenda'}
                            </h4>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span
                                className="w-4 h-4 rounded-full border shrink-0"
                                style={getColorSwatchStyle(item?.color)}
                              />
                              <span className="text-sm font-bold text-slate-200">
                                {item?.color ?? 'General'}
                              </span>
                              <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                                Talla: {item?.talla ?? 'Única'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <span className="text-sm font-extrabold text-white bg-indigo-600/20 border border-indigo-500/30 px-2.5 py-0.5 rounded-lg inline-block">
                              x{item?.cantidad ?? 1}
                            </span>
                            <span className="text-xs text-slate-400 block mt-1">
                              ${Number(item?.subtotalItem ?? item?.precioUnitario ?? 0).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <button
                      type="button"
                      disabled={annulLoadingId === s?.id}
                      onClick={() => handleAnnulSale(s)}
                      className="w-full h-12 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] border border-rose-500/30 text-rose-300 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-1"
                    >
                      <Trash2 className="w-4 h-4" />
                      {annulLoadingId === s?.id
                        ? 'Procesando anulación...'
                        : 'Anular venta y restaurar stock'}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </main>
      )}

      {/* ========================================================= */}
      {/* MODAL DEL CARRITO DE COMPRAS MULTI-PRODUCTO               */}
      {/* ========================================================= */}
      {isCartOpen && cart.length > 0 && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4 my-auto max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <ShoppingCart className="w-6 h-6 text-indigo-400" />
                <div>
                  <h3 className="text-xl font-bold text-white leading-none">
                    Carrito de Compra
                  </h3>
                  <span className="text-xs text-slate-400 font-medium">
                    {cartTotalItems} {cartTotalItems === 1 ? 'unidad seleccionada' : 'unidades seleccionadas'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('¿Vaciar todo el carrito?')) {
                    setCart([]);
                    setIsCartOpen(false);
                  }
                }}
                className="text-xs font-bold text-rose-400 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-xl"
              >
                Vaciar
              </button>
            </div>

            {/* LISTA DE ARTÍCULOS EN EL CARRITO */}
            <div className="flex flex-col gap-3 max-h-64 overflow-y-auto pr-1">
              {cart.map((item) => {
                const maxDisp = getLiveStock(item.productId, item.variantId, item.stockMax);
                return (
                  <div
                    key={item.productId + '-' + item.variantId}
                    className="bg-slate-950 border border-slate-800 rounded-2xl p-3.5 flex flex-col gap-2.5"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <h4 className="text-base font-bold text-white leading-snug">
                          {item.productoNombre}
                        </h4>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span
                            className="w-4 h-4 rounded-full border shrink-0"
                            style={getColorSwatchStyle(item.color)}
                          />
                          <span className="text-sm font-bold text-slate-200">
                            {item.color}
                          </span>
                          <span className="text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
                            Talla: {item.talla}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveCartItem(item.productId, item.variantId)}
                        className="p-1.5 text-rose-400 hover:bg-rose-500/15 rounded-lg"
                        title="Quitar artículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-900">
                      <div>
                        <span className="text-xs text-slate-400 block">
                          Unitario: ${item.precioUnitario.toFixed(2)} (Máx: {maxDisp})
                        </span>
                        <span className="text-base font-extrabold text-emerald-400">
                          Subtotal: ${(item.precioUnitario * item.cantidad).toFixed(2)}
                        </span>
                      </div>

                      {/* Controles rápidos - / + */}
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCartQty(item.productId, item.variantId, -1)
                          }
                          className="w-10 h-10 bg-slate-800 active:bg-slate-700 border border-slate-700 rounded-xl text-lg font-bold text-white flex items-center justify-center"
                        >
                          -
                        </button>
                        <span className="min-w-[32px] text-center text-lg font-extrabold text-white">
                          {item.cantidad}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            handleUpdateCartQty(item.productId, item.variantId, 1)
                          }
                          className="w-10 h-10 bg-indigo-600 active:bg-indigo-500 rounded-xl text-lg font-bold text-white flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* SUBTOTAL, DESCUENTO Y TOTAL EDITABLE */}
            <div className="bg-slate-950 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex justify-between items-center text-base">
                <span className="text-slate-400 font-semibold">Subtotal:</span>
                <span className="font-bold text-white">${cartSubtotal.toFixed(2)}</span>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Descuento ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={discountInput}
                    onChange={(e) => {
                      setIsTotalOverridden(false);
                      setDiscountInput(e.target.value);
                    }}
                    className="w-full h-12 bg-slate-900 border border-slate-700 rounded-xl px-3 text-base font-bold text-amber-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-400 block mb-1">
                    Total a Cobrar ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="0.00"
                    value={manualTotalInput}
                    onChange={(e) => {
                      setIsTotalOverridden(true);
                      setManualTotalInput(e.target.value);
                      const val = parseFloat(e.target.value);
                      if (!Number.isNaN(val)) {
                        const descImpl = Math.max(0, cartSubtotal - val);
                        setDiscountInput(descImpl > 0 ? descImpl.toFixed(2) : '');
                      }
                    }}
                    className={`w-full h-12 bg-slate-900 border rounded-xl px-3 text-lg font-extrabold text-center ${
                      isCartTotalValid
                        ? 'border-emerald-500/60 text-emerald-400'
                        : 'border-rose-500 text-rose-400'
                    }`}
                  />
                </div>
              </div>
            </div>

            {/* SELECTOR EXCLUSIVO DE MÉTODO DE PAGO: EFECTIVO Y QR / TRANSF. */}
            <div>
              <label className="text-sm font-semibold text-slate-300 block mb-2">
                Método de Pago
              </label>
              <div className="grid grid-cols-2 gap-3">
                {['Efectivo', 'QR / Transf.'].map((metodo) => (
                  <button
                    key={metodo}
                    type="button"
                    onClick={() => setPaymentMethod(metodo)}
                    className={`h-14 rounded-xl font-extrabold text-base border transition-all ${
                      paymentMethod === metodo
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-lg shadow-indigo-600/30'
                        : 'bg-slate-950 text-slate-300 border-slate-800'
                    }`}
                  >
                    {metodo}
                  </button>
                ))}
              </div>
            </div>

            {/* BOTONES DE CONFIRMACIÓN */}
            <div className="flex flex-col gap-2.5 pt-1">
              <button
                type="button"
                disabled={isProcessingSale ? true : !isCartTotalValid}
                onClick={handleConfirmCartSale}
                className={`w-full h-14 rounded-xl text-lg font-extrabold transition-all ${
                  isCartTotalValid && !isProcessingSale
                    ? 'bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white shadow-lg shadow-emerald-600/30'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isProcessingSale
                  ? 'Procesando Venta...'
                  : `Cobrar $${(Number.isNaN(finalTotalToCharge) ? 0 : finalTotalToCharge).toFixed(2)}`}
              </button>
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-base font-semibold"
              >
                Seguir agregando prendas
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
