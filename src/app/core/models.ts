export interface Option { id: string; name: string; price: number; }
export interface OptionGroup { id: string; name: string; min: number; max: number; options: Option[]; }
export interface Product { id: string; name: string; category: string; description: string; price: number; emoji: string; tag: string; available: boolean; groups: OptionGroup[]; }
export interface Choices { [groupId: string]: string[]; }
export interface CartLine { lineId: string; pid: string; qty: number; choice: Choices; }
export type Fulfillment = 'delivery' | 'pickup';
export type OrderStatus = 'pendiente' | 'confirmado' | 'preparando' | 'listo' | 'en_camino' | 'entregado' | 'cancelado';
export interface Settings { name: string; phone: string; hours: string; acceptsOrders: boolean; fees: Record<string, number>; }
export interface Checkout { customer: string; phone: string; fulfillment: Fulfillment; zone: string; address: string; payment: 'efectivo' | 'yape'; notes: string; }
export interface OrderLine { productName: string; unitPrice: number; qty: number; options: { name: string; price: number }[]; total: number; }
export interface Order { id: string; code: string; createdAt: string; customer: string; phone: string; fulfillment: Fulfillment; zone: string; address: string; payment: string; notes: string; subtotal: number; deliveryFee: number; total: number; items: OrderLine[]; status: OrderStatus; history: { status: OrderStatus; at: string }[]; }
export const DEFAULT_SETTINGS: Settings = { name: 'Brasa Norte', phone: '900000000', hours: '11:00 a 22:00', acceptsOrders: true, fees: { cercana: 5, media: 7, extendida: 9 } };
export const ZONES: Record<string, string> = { cercana: 'Zona cercana', media: 'Zona intermedia', extendida: 'Zona extendida' };
export const ORDER_LABELS: Record<OrderStatus, string> = { pendiente: 'Pendiente', confirmado: 'Aceptado', preparando: 'Preparando', listo: 'Listo', en_camino: 'En reparto', entregado: 'Entregado', cancelado: 'Cancelado' };
export const STATUS_NEXT: Partial<Record<OrderStatus, OrderStatus>> = { pendiente: 'confirmado', confirmado: 'preparando', preparando: 'listo', listo: 'en_camino', en_camino: 'entregado' };
export const CATEGORIES: string[] = ['Pollos a la brasa', 'Hamburguesas', 'Piqueos', 'Bebidas'];
export const DEFAULT_PRODUCTS: Product[] = [
    {id:'p1',name:'1/4 de pollo clásico',category:'Pollos a la brasa',description:'Pollo doradito a la brasa, papas, ensalada y nuestras salsas.',price:18.90,emoji:'🍗',tag:'El favorito',available:true,groups:[
      {id:'acom',name:'Elige tu acompañamiento',min:1,max:1,options:[{id:'papas',name:'Papas clásicas',price:0},{id:'grandes',name:'Papas grandes',price:3},{id:'chaufa',name:'Arroz chaufa',price:4}]},
      {id:'extra',name:'Agrega algo más',min:0,max:3,options:[{id:'aji',name:'Ají extra',price:1},{id:'ensalada',name:'Ensalada extra',price:3},{id:'mayo',name:'Mayonesa extra',price:1}]}
    ]},
    {id:'p2',name:'1/2 pollo a la brasa',category:'Pollos a la brasa',description:'Para compartir o darte un gran gusto. Incluye papas y ensalada.',price:34.90,emoji:'🍖',tag:'Para compartir',available:true,groups:[
      {id:'acom',name:'Elige tu acompañamiento',min:1,max:1,options:[{id:'papas',name:'Papas clásicas',price:0},{id:'grandes',name:'Papas grandes',price:4},{id:'chaufa',name:'Arroz chaufa',price:5}]}
    ]},
    {id:'p3',name:'Pollo entero familiar',category:'Pollos a la brasa',description:'Un pollo entero con papas familiares, ensalada y cremas.',price:65.90,emoji:'🍗',tag:'Familiar',available:true,groups:[
      {id:'extra',name:'Complementos',min:0,max:2,options:[{id:'papas',name:'Papas adicionales',price:8},{id:'gaseosa',name:'Gaseosa grande',price:9}]}
    ]},
    {id:'p4',name:'Burger Brasa',category:'Hamburguesas',description:'Carne jugosa, queso, lechuga, tomate y salsa de la casa.',price:21.90,emoji:'🍔',tag:'Recomendada',available:true,groups:[
      {id:'termino',name:'Término de la carne',min:1,max:1,options:[{id:'bien',name:'Bien cocida',price:0},{id:'medio',name:'Tres cuartos',price:0}]},
      {id:'extras',name:'Extras',min:0,max:3,options:[{id:'queso',name:'Queso adicional',price:3},{id:'tocino',name:'Tocino',price:4},{id:'papas',name:'Papas fritas',price:6}]}
    ]},
    {id:'p5',name:'Doble Burger',category:'Hamburguesas',description:'Doble carne, doble queso, cebolla caramelizada y salsa especial.',price:29.90,emoji:'🍔',tag:'Más vendida',available:true,groups:[
      {id:'extras',name:'Agrega extras',min:0,max:2,options:[{id:'tocino',name:'Tocino crocante',price:4},{id:'papas',name:'Papas fritas',price:6}]}
    ]},
    {id:'p6',name:'Salchipapas clásicas',category:'Piqueos',description:'Papas crujientes con salchichas, cremas y el toque de la casa.',price:16.90,emoji:'🍟',tag:'Para picar',available:true,groups:[
      {id:'extras',name:'Complementos',min:0,max:2,options:[{id:'queso',name:'Queso derretido',price:3},{id:'huevo',name:'Huevo frito',price:3}]}
    ]},
    {id:'p7',name:'Alitas BBQ',category:'Piqueos',description:'Seis alitas bañadas en salsa BBQ con papas crocantes.',price:23.90,emoji:'🍗',tag:'Nuevo',available:true,groups:[
      {id:'salsa',name:'Salsa de las alitas',min:1,max:1,options:[{id:'bbq',name:'BBQ clásica',price:0},{id:'picante',name:'Picante',price:0}]}
    ]},
    {id:'p8',name:'Chicha morada',category:'Bebidas',description:'Bebida refrescante de maíz morado. Vaso de 500 ml.',price:7,emoji:'🥤',tag:'Casera',available:true,groups:[]},
    {id:'p9',name:'Gaseosa personal',category:'Bebidas',description:'Bebida personal fría para acompañar tu pedido.',price:5,emoji:'🥤',tag:'',available:true,groups:[
      {id:'sabor',name:'Elige la bebida',min:1,max:1,options:[{id:'inca',name:'Inca Kola',price:0},{id:'coca',name:'Coca-Cola',price:0},{id:'sprite',name:'Sprite',price:0}]}
    ]}
  ];
