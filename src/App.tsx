import { useState, useMemo, useEffect } from "react";
import { db, auth, initAnalytics } from "./firebase";
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from "firebase/firestore";
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import CalendarTab from "./CalendarTab";
import DevTab from "./DevTab";
import WikiTab from "./WikiTab";
import { logActivity, loadLocalLogs, clearLocalLogs } from "./logger";
import type { LogEntry } from "./logger";

// --- TYPES ---
export type Role = "owner" | "admin" | "dev";

export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  password?: string;
  role: Role;
  accessPin?: string;
  createdAt?: string;
}

export type PropertyType = "APARTAMENTO" | "CASA" | "STUDIO" | "CHALÉ" | "COBERTURA";

export interface Room {
  id: string;
  name: string;
  pricePerNight: number;
  airbnbCode: string;
  status: "Disponível" | "Ocupado" | "Manutenção";
  syncDate: string;
  iCalUrl?: string;
}

export interface Property {
  id: string;
  name: string;
  type: PropertyType;
  address: string;
  city?: string;
  ownerId: string; // "" ou "unassigned" representa "Sem Proprietário"
  rooms: Room[];
  imageUrl?: string;
  airbnbListingUrl?: string;
  airbnbListingId?: string;
  basePrice?: number;
  maxGuests?: number;
  bedrooms?: number;
  bathrooms?: number;
  amenities?: string[];
  description?: string;
}

export type ReservationStatus = "Confirmada" | "Pendente" | "Concluída" | "Cancelada";

export interface Reservation {
  id: string;
  guestName: string;
  propertyId: string;
  propertyName: string;
  roomId: string;
  roomName: string;
  ownerId: string;
  startDate: string; // DD/MM/YY ou AAAA-MM-DD
  endDate: string;   // DD/MM/YY ou AAAA-MM-DD
  nights: number;
  totalAmount: number;
  status: ReservationStatus;
  channel: "Airbnb" | "Booking" | "Direto" | "Bloqueio Manual";
  confirmationCode: string;
}

// Sample Curated Photos
const SAMPLE_PHOTOS = [
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=800&q=80",
];

// INITIAL DATA
const INITIAL_USERS: User[] = [
  { id: "dev-micael", name: "Micael Bardim (Dev)", email: "micaelbardimtech@gmail.com", username: "micaelbardimtech", password: "dev", role: "dev", createdAt: "14/10/2024" },
  { id: "joao", name: "João Silva", email: "joao@exemplo.com", username: "joao", password: "123", role: "owner", accessPin: "102030", createdAt: "10/10/2024" },
  { id: "maria", name: "Maria Costa", email: "maria@exemplo.com", username: "maria", password: "123", role: "owner", accessPin: "405060", createdAt: "11/10/2024" },
  { id: "admin", name: "Administrador", email: "admin@gestao.com", username: "admin", password: "admin123", role: "admin", createdAt: "01/10/2024" },
];

const INITIAL_PROPERTIES: Property[] = [
  {
    id: "prop-1",
    name: "Apartamento Centro com Vista",
    type: "APARTAMENTO",
    address: "Rua das Flores, 123 - Centro, São Paulo",
    city: "São Paulo, SP",
    ownerId: "joao",
    imageUrl: SAMPLE_PHOTOS[0],
    airbnbListingUrl: "https://www.airbnb.com.br/rooms/123456",
    airbnbListingId: "123456",
    basePrice: 280,
    maxGuests: 4,
    bedrooms: 2,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Ar-condicionado", "Cozinha", "Elevador"],
    rooms: [
      {
        id: "room-1-1",
        name: "Suíte Master",
        pricePerNight: 280,
        airbnbCode: "ARR123456",
        status: "Ocupado",
        syncDate: "Hoje",
        iCalUrl: "https://www.airbnb.com.br/calendar/ical/123456.ics",
      },
      {
        id: "room-1-2",
        name: "Quarto Casal",
        pricePerNight: 220,
        airbnbCode: "ARR123457",
        status: "Disponível",
        syncDate: "Hoje",
        iCalUrl: "https://www.airbnb.com.br/calendar/ical/123457.ics",
      },
    ],
  },
  {
    id: "prop-2",
    name: "Casa Praia Pé na Areia",
    type: "CASA",
    address: "Av. Beira Mar, 456 - Copacabana, Rio de Janeiro",
    city: "Rio de Janeiro, RJ",
    ownerId: "",
    imageUrl: SAMPLE_PHOTOS[1],
    airbnbListingUrl: "https://www.airbnb.com.br/rooms/789012",
    airbnbListingId: "789012",
    basePrice: 450,
    maxGuests: 6,
    bedrooms: 3,
    bathrooms: 2,
    amenities: ["Wi-Fi", "Piscina", "Ar-condicionado", "Churrasqueira", "Garagem"],
    rooms: [
      {
        id: "room-2-1",
        name: "Casa Completa",
        pricePerNight: 450,
        airbnbCode: "ARR789012",
        status: "Disponível",
        syncDate: "Hoje",
        iCalUrl: "https://www.airbnb.com.br/calendar/ical/789012.ics",
      },
    ],
  },
  {
    id: "prop-3",
    name: "Studio Moderno Jardins",
    type: "STUDIO",
    address: "Alameda Santos, 980 - Jardins, São Paulo",
    city: "São Paulo, SP",
    ownerId: "maria",
    imageUrl: SAMPLE_PHOTOS[2],
    airbnbListingUrl: "https://www.airbnb.com.br/rooms/345678",
    airbnbListingId: "345678",
    basePrice: 310,
    maxGuests: 2,
    bedrooms: 1,
    bathrooms: 1,
    amenities: ["Wi-Fi", "Smart TV", "Ar-condicionado", "Academia"],
    rooms: [
      {
        id: "room-3-1",
        name: "Studio Completo",
        pricePerNight: 310,
        airbnbCode: "ARR345678",
        status: "Disponível",
        syncDate: "Hoje",
        iCalUrl: "https://www.airbnb.com.br/calendar/ical/345678.ics",
      },
    ],
  },
];

const INITIAL_RESERVATIONS: Reservation[] = [
  {
    id: "res-1",
    guestName: "Ana Costa",
    propertyId: "prop-1",
    propertyName: "APARTAMENTO CENTRO COM VISTA",
    roomId: "room-1-2",
    roomName: "QUARTO CASAL",
    ownerId: "joao",
    startDate: "19/12/24",
    endDate: "24/12/24",
    nights: 5,
    totalAmount: 1100,
    status: "Pendente",
    channel: "Airbnb",
    confirmationCode: "HM901A",
  },
  {
    id: "res-2",
    guestName: "Pedro Almeida",
    propertyId: "prop-2",
    propertyName: "CASA PRAIA PÉ NA AREIA",
    roomId: "room-2-1",
    roomName: "CASA COMPLETA",
    ownerId: "",
    startDate: "15/12/24",
    endDate: "21/12/24",
    nights: 6,
    totalAmount: 2700,
    status: "Confirmada",
    channel: "Booking",
    confirmationCode: "BK442X",
  },
  {
    id: "res-3",
    guestName: "Carlos Oliveira",
    propertyId: "prop-1",
    propertyName: "APARTAMENTO CENTRO COM VISTA",
    roomId: "room-1-1",
    roomName: "SUÍTE MASTER",
    ownerId: "joao",
    startDate: "11/10/24",
    endDate: "18/10/24",
    nights: 7,
    totalAmount: 1960,
    status: "Confirmada",
    channel: "Airbnb",
    confirmationCode: "HM883Z",
  },
];

// Helper: Formata Moeda BRL
const formatBRL = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

// Converte string de data flexível (DD/MM/AA, DD/MM/AAAA ou AAAA-MM-DD) para objeto Date
function parseDateBR(dateStr: string): Date | null {
  if (!dateStr) return null;
  if (dateStr.includes("-")) {
    const p = dateStr.split("-");
    if (p.length === 3) return new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  }
  const p = dateStr.split("/");
  if (p.length === 3) {
    const day = parseInt(p[0], 10);
    const month = parseInt(p[1], 10) - 1;
    let year = parseInt(p[2], 10);
    if (year < 100) year += 2000;
    return new Date(year, month, day);
  }
  return null;
}

// Verifica vacância ao vivo comparando a data de hoje com o período reservado
function getRoomLiveStatus(roomId: string, reservations: Reservation[]): {
  isOccupiedNow: boolean;
  activeReservation?: Reservation;
  nextReservation?: Reservation;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  let activeRes: Reservation | undefined;
  let nextRes: Reservation | undefined;

  for (const res of reservations) {
    if (res.roomId === roomId && res.status !== "Cancelada") {
      const start = parseDateBR(res.startDate);
      const end = parseDateBR(res.endDate);
      if (start && end) {
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        if (now >= start && now <= end) {
          activeRes = res;
        } else if (start > now) {
          if (!nextRes || start < (parseDateBR(nextRes.startDate) || start)) {
            nextRes = res;
          }
        }
      }
    }
  }

  return {
    isOccupiedNow: !!activeRes,
    activeReservation: activeRes,
    nextReservation: nextRes,
  };
}

// --- ICONS ---
function IconGrid({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IconBuilding({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}

function IconCalendar({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function IconBookmark({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function IconBed({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
    </svg>
  );
}

function IconTrendUp({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconUsers({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconSettings({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function IconLogout({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" />
      <line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}

function IconPlus({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

function IconCopy({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function IconCheck({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function IconClose({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function IconUnlink({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m18.84 12.25 1.72-1.71a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="m5.16 11.75-1.72 1.71a5 5 0 0 0 7.07 7.07l1.71-1.71" />
      <line x1="2" y1="2" x2="22" y2="22" />
    </svg>
  );
}

function IconExternalLink({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

function IconEdit({ size = 15 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function IconSun({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function IconMoon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}

function IconMenu({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="12" x2="21" y2="12" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

function IconArrowLeft({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function IconMapPin({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function IconTerminal({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="4 17 10 11 4 5" />
      <line x1="12" y1="19" x2="20" y2="19" />
    </svg>
  );
}

function IconBook({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

export default function App() {
  // Theme state (Claro / Escuro)
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("propertyhub_theme") as "light" | "dark") || "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("propertyhub_theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  // Mobile drawer state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Users & Session
  const [usersList, setUsersList] = useState<User[]>(INITIAL_USERS);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      const ownerParam = p.get("owner");
      if (ownerParam) {
        const found = INITIAL_USERS.find(
          (u) =>
            u.id === ownerParam ||
            u.email.toLowerCase() === ownerParam.toLowerCase() ||
            u.username.toLowerCase() === ownerParam.toLowerCase()
        );
        if (found) return found;
      }
      const saved = localStorage.getItem("propertyhub_user");
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return null; // Exibe tela de login unificada se não houver sessão ativa
  });
  const [loginIdentifier, setLoginIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Tabs & Navigation
  const [activeTab, setActiveTab] = useState<"dashboard" | "calendar" | "owners" | "properties" | "reservations" | "settings" | "dev" | "wiki">("dashboard");
  const [logs, setLogs] = useState<LogEntry[]>(() => loadLocalLogs());

  // Estado do Tour Interativo / Prático da Wiki
  const [activeTour, setActiveTour] = useState<{
    tourId: "create_property" | "create_reservation" | "assign_owner";
    step: number;
    totalSteps?: number;
    title: string;
    description: string;
    actionHint: string;
    targetTab: "properties" | "calendar" | "owners";
    targetElementId: string;
  } | null>(null);

  // Modal & Form State: Editar Configurações do Imóvel
  const [isEditPropertyModalOpen, setIsEditPropertyModalOpen] = useState(false);
  const [editingProperty, setEditingProperty] = useState<Property | null>(null);
  const [editPropName, setEditPropName] = useState("");
  const [editPropType, setEditPropType] = useState<PropertyType>("APARTAMENTO");
  const [editPropAddress, setEditPropAddress] = useState("");
  const [editPropCity, setEditPropCity] = useState("");
  const [editPropOwnerId, setEditPropOwnerId] = useState("");
  const [editPropUrl, setEditPropUrl] = useState("");
  const [editPropListingId, setEditPropListingId] = useState("");
  const [editPropImg, setEditPropImg] = useState("");
  const [editPropPrice, setEditPropPrice] = useState(250);
  const [editPropGuests, setEditPropGuests] = useState(4);
  const [editPropBedrooms, setEditPropBedrooms] = useState(2);
  const [editPropBathrooms, setEditPropBathrooms] = useState(1);
  const [editPropAmenities, setEditPropAmenities] = useState("");
  const [editPropIcal, setEditPropIcal] = useState("");

  // Modal & Form State: Editar Usuário (Nome e Senha)
  const [isEditUserModalOpen, setIsEditUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editUserName, setEditUserName] = useState("");
  const [editUserUsername, setEditUserUsername] = useState("");
  const [editUserEmail, setEditUserEmail] = useState("");
  const [editUserPassword, setEditUserPassword] = useState("");

  // Dedicated owner view (quando clica no card do proprietário)
  const [viewingOwnerDetail, setViewingOwnerDetail] = useState<User | null>(null);

  // Core Data
  const [properties, setProperties] = useState<Property[]>(INITIAL_PROPERTIES);
  const [reservations, setReservations] = useState<Reservation[]>(INITIAL_RESERVATIONS);
  const [lastUpdated, setLastUpdated] = useState<string>("11/10, 14:44");

  // Modals state
  const [isNewPropertyModalOpen, setIsNewPropertyModalOpen] = useState(false);
  const [isNewOwnerModalOpen, setIsNewOwnerModalOpen] = useState(false);
  const [isQuickReserveModalOpen, setIsQuickReserveModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modal Card no Meio: Vincular Imóvel a um Proprietário
  const [isAssignOwnerModalOpen, setIsAssignOwnerModalOpen] = useState(false);
  const [targetAssignProperty, setTargetAssignProperty] = useState<Property | null>(null);
  const [selectedAssignOwnerId, setSelectedAssignOwnerId] = useState<string>("");

  // Modal Card no Meio: Vincular Imóvel Existente ao Proprietário Atual
  const [isPickUnassignedModalOpen, setIsPickUnassignedModalOpen] = useState(false);

  // Filter in Properties Tab
  const [propertyFilter, setPropertyFilter] = useState<"all" | "assigned" | "unassigned">("all");
  const [propertySearch, setPropertySearch] = useState("");

  // Reservation Filter
  const [reservationFilter, setReservationFilter] = useState<"Todas" | ReservationStatus>("Todas");

  // Quick Reserve Target State (com status inicial selecionável: Confirmada ou Pendente)
  const [targetReserveProperty, setTargetReserveProperty] = useState<Property | null>(null);
  const [targetReserveRoom, setTargetReserveRoom] = useState<Room | null>(null);
  const [reserveGuestName, setReserveGuestName] = useState("");
  const [reserveStartDate, setReserveStartDate] = useState("2024-12-20");
  const [reserveEndDate, setReserveEndDate] = useState("2024-12-25");
  const [reserveStatus, setReserveStatus] = useState<ReservationStatus>("Confirmada");

  // Form State: Novo Imóvel Airbnb Completo
  const [formPropName, setFormPropName] = useState("");
  const [formPropType, setFormPropType] = useState<PropertyType>("APARTAMENTO");
  const [formPropAddress, setFormPropAddress] = useState("");
  const [formPropCity, setFormPropCity] = useState("São Paulo, SP");
  const [formPropOwnerId, setFormPropOwnerId] = useState(""); // "" = Sem proprietário
  const [formPropUrl, setFormPropUrl] = useState("");
  const [formPropListingId, setFormPropListingId] = useState("");
  const [formPropImg, setFormPropImg] = useState("");
  const [formPropPrice, setFormPropPrice] = useState(250);
  const [formPropGuests, setFormPropGuests] = useState(4);
  const [formPropBedrooms, setFormPropBedrooms] = useState(2);
  const [formPropBathrooms, setFormPropBathrooms] = useState(1);
  const [formPropAmenities, setFormPropAmenities] = useState<string>("Wi-Fi, Ar-condicionado, Cozinha, Smart TV");
  const [formPropIcal, setFormPropIcal] = useState("");

  // Form State: Novo Proprietário
  const [newOwnerName, setNewOwnerName] = useState("");
  const [newOwnerUsername, setNewOwnerUsername] = useState("");
  const [newOwnerEmail, setNewOwnerEmail] = useState("");
  const [newOwnerPassword, setNewOwnerPassword] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  // --- AUTO-LOGIN VIA URL LINK (?owner=<id>) ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ownerParam = params.get("owner");
    if (ownerParam) {
      const targetUser = usersList.find(
        (u) => u.id === ownerParam || u.email.toLowerCase() === ownerParam.toLowerCase()
      );
      if (targetUser) {
        setCurrentUser(targetUser);
        setActiveTab("dashboard");
        showToast(`Painel Exclusivo de ${targetUser.name} carregado com sucesso.`);
      }
    }
  }, [usersList]);

  // --- FIREBASE LISTENERS ---
  useEffect(() => {
    initAnalytics();

    const unsubscribeAuth = onAuthStateChanged(auth, (firebaseUser) => {
      // Se acessou através de link exclusivo do proprietário (?owner=), NUNCA sobrepor com admin!
      const params = new URLSearchParams(window.location.search);
      if (params.get("owner")) {
        return;
      }

      if (firebaseUser) {
        const emailLower = firebaseUser.email?.toLowerCase() || "";
        const isDevUser = emailLower === "micaelbardimtech@gmail.com";
        const found = usersList.find((u) => u.email.toLowerCase() === emailLower);
        if (found) {
          if (isDevUser && found.role !== "dev") {
            const devUpgraded: User = { ...found, role: "dev" };
            setCurrentUser(devUpgraded);
          } else {
            setCurrentUser(found);
          }
        } else {
          const userObj: User = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || firebaseUser.email?.split("@")[0] || (isDevUser ? "Micael Bardim (Dev)" : "Administrador"),
            email: firebaseUser.email || (isDevUser ? "micaelbardimtech@gmail.com" : "admin@gestao.com"),
            username: firebaseUser.email?.split("@")[0] || (isDevUser ? "micaelbardimtech" : "admin"),
            role: isDevUser ? "dev" : "admin",
          };
          setCurrentUser(userObj);
        }
      }
    });

    const unsubUsers = onSnapshot(
      collection(db, "users"),
      async (snapshot) => {
        if (!snapshot.empty) {
          const loaded: User[] = snapshot.docs.map((d) => d.data() as User);
          setUsersList(loaded);
        } else {
          const baseStaff: User[] = [
            { id: "dev-micael", name: "Micael Bardim (Dev)", email: "micaelbardimtech@gmail.com", username: "micaelbardimtech", password: "dev", role: "dev", createdAt: "14/10/2024" },
            { id: "admin", name: "Administrador", email: "admin@gestao.com", username: "admin", password: "admin123", role: "admin", createdAt: "01/10/2024" },
          ];
          try {
            for (const user of baseStaff) {
              await setDoc(doc(db, "users", user.id), user);
            }
          } catch (e) {
            console.warn("Seed users note:", e);
          }
          setUsersList(baseStaff);
        }
      },
      (error) => console.warn("Users listener note:", error.message)
    );

    const unsubProps = onSnapshot(
      collection(db, "properties"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Property[] = snapshot.docs.map((d) => d.data() as Property);
          setProperties(loaded);
        } else {
          setProperties([]);
        }
      },
      (error) => console.warn("Properties listener note:", error.message)
    );

    const unsubRes = onSnapshot(
      collection(db, "reservations"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Reservation[] = snapshot.docs.map((d) => d.data() as Reservation);
          setReservations(loaded);
        } else {
          setReservations([]);
        }
      },
      (error) => console.warn("Reservations listener note:", error.message)
    );

    const unsubMeta = onSnapshot(
      doc(db, "settings", "meta"),
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data?.lastUpdated) setLastUpdated(data.lastUpdated);
        }
      },
      (error) => console.warn("Meta listener note:", error.message)
    );

    const unsubLogs = onSnapshot(
      collection(db, "logs"),
      (snapshot) => {
        if (!snapshot.empty) {
          const loadedLogs: LogEntry[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }));
          loadedLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setLogs(loadedLogs);
        }
      },
      (error) => console.warn("Logs listener note:", error.message)
    );

    return () => {
      unsubscribeAuth();
      unsubUsers();
      unsubProps();
      unsubRes();
      unsubMeta();
      unsubLogs();
    };
  }, []);

  // --- DATA FILTERING FOR USER ---
  const userProperties = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "dev") return properties;
    return properties.filter((p) => p.ownerId === currentUser.id);
  }, [properties, currentUser]);

  const userPropertyIds = useMemo(() => {
    return new Set(userProperties.map((p) => p.id));
  }, [userProperties]);

  const userReservations = useMemo(() => {
    if (!currentUser) return [];
    if (currentUser.role === "admin" || currentUser.role === "dev") return reservations;
    return reservations.filter(
      (r) => r.ownerId === currentUser.id || userPropertyIds.has(r.propertyId)
    );
  }, [reservations, currentUser, userPropertyIds]);

  const ownersList = useMemo(() => {
    return usersList.filter((u) => u.role === "owner");
  }, [usersList]);

  // KPIs
  const totalPropertiesCount = userProperties.length;
  const allRoomsOfUser = useMemo(() => {
    return userProperties.flatMap((p) => p.rooms);
  }, [userProperties]);

  const totalRoomsCount = allRoomsOfUser.length;

  const occupiedRoomsCount = useMemo(() => {
    return allRoomsOfUser.filter((r) => getRoomLiveStatus(r.id, userReservations).isOccupiedNow).length;
  }, [allRoomsOfUser, userReservations]);

  const availableRoomsCount = totalRoomsCount - occupiedRoomsCount;
  const occupancyRate = totalRoomsCount > 0 ? Math.round((occupiedRoomsCount / totalRoomsCount) * 100) : 0;
  const totalRevenue = useMemo(() => {
    return userReservations.reduce((acc, curr) => acc + curr.totalAmount, 0);
  }, [userReservations]);

  // Filtered Properties for Properties Tab
  const displayedProperties = useMemo(() => {
    // PROPRIETÁRIO SÓ VÊ EXCLUSIVAMENTE OS IMÓVEIS DELE!
    if (currentUser?.role === "owner") {
      return properties.filter((p) => p.ownerId === currentUser.id);
    }

    let list = properties;
    if (propertyFilter === "assigned") {
      list = list.filter((p) => p.ownerId && p.ownerId !== "unassigned");
    } else if (propertyFilter === "unassigned") {
      list = list.filter((p) => !p.ownerId || p.ownerId === "unassigned");
    }

    if (propertySearch.trim()) {
      const q = propertySearch.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          (p.city && p.city.toLowerCase().includes(q))
      );
    }
    return list;
  }, [properties, propertyFilter, propertySearch, currentUser]);

  // Filtered Reservations
  const displayedReservations = useMemo(() => {
    if (reservationFilter === "Todas") return userReservations;
    return userReservations.filter((r) => r.status === reservationFilter);
  }, [userReservations, reservationFilter]);

  // --- LOGIN UNIFICADO (ADMIN OU PROPRIETÁRIO PELO BANCO) ---
  const handleUnifiedLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);

    const ident = loginIdentifier.trim().toLowerCase();
    const pass = loginPassword.trim();

    if (!ident || !pass) {
      setAuthError("Informe o usuário ou e-mail e a senha.");
      setAuthLoading(false);
      return;
    }

    // 1. Procura primeiro na lista de usuários sincronizada do Firestore
    const matchedUser = usersList.find(
      (u) =>
        (u.username && u.username.toLowerCase() === ident) ||
        (u.email && u.email.toLowerCase() === ident)
    );

    if (matchedUser && matchedUser.password === pass) {
      setCurrentUser(matchedUser);
      localStorage.setItem("propertyhub_user", JSON.stringify(matchedUser));
      setActiveTab(matchedUser.role === "dev" ? "dev" : "dashboard");
      setViewingOwnerDetail(null);
      const roleName = matchedUser.role === "dev" ? "Desenvolvedor" : matchedUser.role === "admin" ? "Administrador" : "Proprietário";
      showToast(`Bem-vindo, ${matchedUser.name}! (${roleName})`);
      logActivity({
        actorName: matchedUser.name,
        actorEmail: matchedUser.email,
        actorRole: matchedUser.role,
        category: "auth",
        action: "LOGIN_SUCESSO",
        description: `Login efetuado com sucesso como ${roleName}.`,
      });
      setAuthLoading(false);
      return;
    }

    // 2. Se for admin ou dev autenticado pelo Firebase Auth
    try {
      const emailToAuth = matchedUser?.email || (ident.includes("@") ? ident : `${ident}@gestao.com`);
      const cred = await signInWithEmailAndPassword(auth, emailToAuth, pass);
      if (cred.user) {
        const emailLower = cred.user.email?.toLowerCase() || ident;
        const isDevUser = emailLower === "micaelbardimtech@gmail.com";
        const found = usersList.find((u) => u.email.toLowerCase() === emailLower);
        const loggedUser: User = found || {
          id: cred.user.uid,
          name: cred.user.displayName || cred.user.email?.split("@")[0] || (isDevUser ? "Micael Bardim (Dev)" : "Administrador"),
          email: cred.user.email || ident,
          username: cred.user.email?.split("@")[0] || (isDevUser ? "micaelbardimtech" : "admin"),
          role: isDevUser ? "dev" : "admin",
        };
        setCurrentUser(loggedUser);
        localStorage.setItem("propertyhub_user", JSON.stringify(loggedUser));
        setActiveTab(isDevUser ? "dev" : "dashboard");
        setViewingOwnerDetail(null);
        showToast(`Bem-vindo, ${loggedUser.name}! (${isDevUser ? "Desenvolvedor" : "Administrador"})`);
        logActivity({
          actorName: loggedUser.name,
          actorEmail: loggedUser.email,
          actorRole: loggedUser.role,
          category: "auth",
          action: "LOGIN_FIREBASE_AUTH",
          description: `Login autenticado via Firebase Auth (${loggedUser.role}).`,
        });
        setAuthLoading(false);
        return;
      }
    } catch (fbErr: any) {
      console.warn("Tentativa Firebase Auth:", fbErr?.code);
    }

    // 3. Fallback Dev Direto: micaelbardimtech@gmail.com
    if (
      ident === "micaelbardimtech@gmail.com" ||
      ident === "micaelbardimtech" ||
      ident === "micaelbardim" ||
      (ident === "dev" && (pass === "dev" || pass === "123" || pass === "dev123" || pass === "admin" || pass === "admin123"))
    ) {
      const devObj = usersList.find((u) => u.email.toLowerCase() === "micaelbardimtech@gmail.com") || INITIAL_USERS[0];
      setCurrentUser(devObj);
      localStorage.setItem("propertyhub_user", JSON.stringify(devObj));
      setActiveTab("dev");
      setViewingOwnerDetail(null);
      showToast("⚡ Modo Desenvolvedor ativado com sucesso! Bem-vindo, Micael.");
      logActivity({
        actorName: devObj.name,
        actorEmail: devObj.email,
        actorRole: "dev",
        category: "auth",
        action: "LOGIN_DEV_DIRETO",
        description: "Acesso de Desenvolvedor autenticado diretamente no sistema.",
      });
      setAuthLoading(false);
      return;
    }

    // 4. Fallback demo admin
    if ((ident === "admin" || ident === "admin@gestao.com") && (pass === "admin123" || pass === "admin")) {
      const adminObj = INITIAL_USERS.find((u) => u.role === "admin") || INITIAL_USERS[3];
      setCurrentUser(adminObj);
      localStorage.setItem("propertyhub_user", JSON.stringify(adminObj));
      setActiveTab("dashboard");
      setViewingOwnerDetail(null);
      showToast("Bem-vindo, Administrador!");
      logActivity({
        actorName: adminObj.name,
        actorEmail: adminObj.email,
        actorRole: "admin",
        category: "auth",
        action: "LOGIN_DEMO_ADMIN",
        description: "Login efetuado com credenciais demo de administrador.",
      });
      setAuthLoading(false);
      return;
    }

    setAuthError("Usuário ou senha incorretos. Verifique suas credenciais.");
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {}
    localStorage.removeItem("propertyhub_user");
    window.history.replaceState({}, document.title, window.location.pathname);
    setCurrentUser(null);
    setLoginIdentifier("");
    setLoginPassword("");
    setViewingOwnerDetail(null);
    setMobileMenuOpen(false);
    showToast("Sessão encerrada com sucesso.");
  };

  // --- CADASTRAR PROPRIETÁRIO COM USER E SENHA NO BANCO ---
  const handleCreateOwner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerName.trim() || !newOwnerUsername.trim() || !newOwnerPassword.trim()) {
      showToast("Preencha nome, usuário e senha para cadastrar o proprietário.");
      return;
    }

    const cleanUsername = newOwnerUsername.trim().toLowerCase();
    const cleanEmail = newOwnerEmail.trim().toLowerCase() || `${cleanUsername}@propertyhub.local`;

    if (usersList.some((u) => u.username?.toLowerCase() === cleanUsername)) {
      showToast("⚠️ Este nome de usuário já está em uso. Escolha outro.");
      return;
    }

    const ownerId = "owner-" + Date.now();
    const newOwner: User = {
      id: ownerId,
      name: newOwnerName.trim(),
      username: cleanUsername,
      email: cleanEmail,
      password: newOwnerPassword.trim(),
      role: "owner",
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };

    setUsersList((prev) => [...prev, newOwner]);

    try {
      await setDoc(doc(db, "users", ownerId), newOwner);
    } catch (err) {
      console.warn("Owner salvo localmente:", err);
    }

    setIsNewOwnerModalOpen(false);
    setNewOwnerName("");
    setNewOwnerUsername("");
    setNewOwnerEmail("");
    setNewOwnerPassword("");
    showToast(`✓ Proprietário ${newOwner.name} gravado no banco com usuário "${cleanUsername}" e senha configurada!`);
  };

  // Helper: Converte a URL do app para o domínio legível e amigável (sem o punycode xn--)
  const getPrettyAppOrigin = () => {
    if (typeof window === "undefined") return "https://rjadmlocação.com.br";
    const host = window.location.host;
    if (
      host.includes("xn--rjadmlocao-n5a1c") ||
      host.includes("rjadmlocacao") ||
      host.includes("rjadmlocação")
    ) {
      return "https://rjadmlocação.com.br";
    }
    let current = window.location.origin;
    current = current.replace(/xn--rjadmlocao-n5a1c\.com\.br/gi, "rjadmlocação.com.br");
    return current;
  };

  // --- COPIAR CREDENCIAIS DE ACESSO DO PROPRIETÁRIO (WHATSAPP) ---
  const handleCopyOwnerCredentials = (owner: User) => {
    const origin = getPrettyAppOrigin();
    const directLink = `${origin.replace(/\/+$/, "")}/?owner=${owner.id}`;
    const textToCopy = `🔑 *Acesso ao Portal do Proprietário*\n\nOlá ${owner.name}, aqui estão seus dados de acesso:\n🌐 Link: ${origin}\n👤 Usuário: ${owner.username || owner.email}\n🔐 Senha: ${owner.password || "(senha configurada)"}\n\nVocê também pode acessar diretamente por: ${directLink}`;
    navigator.clipboard.writeText(textToCopy).then(() => {
      showToast(`✓ Dados de acesso de ${owner.name} copiados com link rjadmlocação.com.br!`);
    }).catch(() => {
      showToast(`Usuário: ${owner.username} | Senha: ${owner.password}`);
    });
  };

  const handleCopyOwnerLink = (owner: User) => {
    const origin = getPrettyAppOrigin();
    const directLink = `${origin.replace(/\/+$/, "")}/?owner=${owner.id}`;
    navigator.clipboard.writeText(directLink).then(() => {
      showToast(`✓ Link exclusivo de ${owner.name} copiado (rjadmlocação.com.br)!`);
    }).catch(() => {
      showToast(`Link de acesso: ${directLink}`);
    });
  };

  // --- EXCLUIR PROPRIETÁRIO (IMÓVEIS FICAM 'SEM PROPRIETÁRIO') ---
  const handleDeleteOwner = async (owner: User) => {
    if (!window.confirm(`Tem certeza que deseja excluir o proprietário "${owner.name}"? Os imóveis vinculados a ele NÃO serão apagados, mas ficarão marcados como "Sem Proprietário".`)) {
      return;
    }

    // 1. Atualizar imóveis vinculados para sem proprietário
    const linkedProps = properties.filter((p) => p.ownerId === owner.id);
    const updatedProps = properties.map((p) => {
      if (p.ownerId === owner.id) {
        return { ...p, ownerId: "" };
      }
      return p;
    });
    setProperties(updatedProps);

    try {
      for (const p of linkedProps) {
        await updateDoc(doc(db, "properties", p.id), { ownerId: "" });
      }
      await deleteDoc(doc(db, "users", owner.id));
    } catch (err) {
      console.warn("Atualização Firestore ao deletar proprietário:", err);
    }

    // 2. Atualizar lista de usuários
    setUsersList((prev) => prev.filter((u) => u.id !== owner.id));
    setViewingOwnerDetail(null);
    showToast(`✓ Proprietário ${owner.name} excluído. ${linkedProps.length} imóvel(is) agora estão "Sem Proprietário".`);
  };

  // --- CRIAR IMÓVEL COMPLETO COM AIRBNB DATA ---
  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPropName.trim()) return;

    const newPropId = `prop-${Date.now()}`;
    const mainRoom: Room = {
      id: `room-${Date.now()}`,
      name: "Acomodação Principal",
      pricePerNight: Number(formPropPrice) || 200,
      airbnbCode: formPropListingId.trim() || "ARR" + Math.floor(100000 + Math.random() * 900000),
      status: "Disponível",
      syncDate: "Hoje",
      iCalUrl: formPropIcal.trim() || undefined,
    };

    const amenitiesList = formPropAmenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const newProperty: Property = {
      id: newPropId,
      name: formPropName.trim(),
      type: formPropType,
      address: formPropAddress.trim() || "Endereço não informado",
      city: formPropCity.trim() || "Brasil",
      ownerId: formPropOwnerId.trim(), // "" se sem proprietário
      imageUrl: formPropImg.trim() || SAMPLE_PHOTOS[0],
      airbnbListingUrl: formPropUrl.trim() || undefined,
      airbnbListingId: formPropListingId.trim() || undefined,
      basePrice: Number(formPropPrice) || 200,
      maxGuests: Number(formPropGuests) || 2,
      bedrooms: Number(formPropBedrooms) || 1,
      bathrooms: Number(formPropBathrooms) || 1,
      amenities: amenitiesList.length ? amenitiesList : ["Wi-Fi", "Ar-condicionado"],
      rooms: [mainRoom],
    };

    setProperties((prev) => [newProperty, ...prev]);

    try {
      await setDoc(doc(db, "properties", newPropId), newProperty);
    } catch (err) {
      console.warn("Salvo localmente no Firestore:", err);
    }

    setIsNewPropertyModalOpen(false);
    setFormPropName("");
    setFormPropAddress("");
    setFormPropUrl("");
    setFormPropListingId("");
    setFormPropImg("");
    if (activeTour?.tourId === "create_property") {
      setActiveTour(null);
      showToast("🎉 Parabéns! Você aprendeu na prática e cadastrou o imóvel por completo!");
    } else {
      showToast("✓ Imóvel cadastrado com sucesso no Firebase!");
    }
  };

  // --- DESVINCULAR IMÓVEL DE PROPRIETÁRIO ---
  const handleUnlinkProperty = async (propertyId: string) => {
    const updated = properties.map((p) => {
      if (p.id === propertyId) return { ...p, ownerId: "" };
      return p;
    });
    setProperties(updated);

    try {
      await updateDoc(doc(db, "properties", propertyId), { ownerId: "" });
    } catch (e) {
      console.warn("Erro ao desvincular:", e);
    }
    showToast("✓ Imóvel desvinculado! Agora está 'Sem Proprietário'.");
  };

  // --- EXCLUIR IMÓVEL ---
  const handleDeleteProperty = async (propertyId: string) => {
    if (!window.confirm("Deseja realmente excluir este imóvel permanentemente?")) return;

    setProperties((prev) => prev.filter((p) => p.id !== propertyId));
    try {
      await deleteDoc(doc(db, "properties", propertyId));
    } catch (e) {
      console.warn("Erro ao deletar imóvel:", e);
    }
    showToast("✓ Imóvel removido com sucesso.");
  };

  // --- ABRIR MODAL CARD NO MEIO: VINCULAR PROPRIETÁRIO ---
  const openAssignOwnerModal = (property: Property) => {
    setTargetAssignProperty(property);
    setSelectedAssignOwnerId(property.ownerId || "");
    setIsAssignOwnerModalOpen(true);
  };

  const handleConfirmAssignOwner = async () => {
    if (!targetAssignProperty) return;

    const newOwnerId = selectedAssignOwnerId;
    const updated = properties.map((p) => {
      if (p.id === targetAssignProperty.id) {
        return { ...p, ownerId: newOwnerId };
      }
      return p;
    });
    setProperties(updated);

    try {
      await updateDoc(doc(db, "properties", targetAssignProperty.id), {
        ownerId: newOwnerId,
      });
    } catch (err) {
      console.warn("Erro ao salvar vínculo no Firestore:", err);
    }

    const assignedOwner = ownersList.find((o) => o.id === newOwnerId);
    if (assignedOwner) {
      showToast(`✓ Imóvel "${targetAssignProperty.name}" vinculado a ${assignedOwner.name} com sucesso!`);
    } else {
      showToast(`✓ Imóvel "${targetAssignProperty.name}" agora está sem proprietário.`);
    }

    setIsAssignOwnerModalOpen(false);
  };

  const handleAssignSpecificPropertyToOwner = async (propertyId: string, ownerId: string) => {
    const updated = properties.map((p) => {
      if (p.id === propertyId) {
        return { ...p, ownerId };
      }
      return p;
    });
    setProperties(updated);

    try {
      await updateDoc(doc(db, "properties", propertyId), {
        ownerId,
      });
    } catch (err) {
      console.warn("Erro ao vincular no Firestore:", err);
    }

    const assignedOwner = ownersList.find((o) => o.id === ownerId);
    const targetProp = properties.find((p) => p.id === propertyId);
    showToast(`✓ Imóvel "${targetProp?.name || 'Selecionado'}" vinculado a ${assignedOwner?.name || 'Proprietário'}!`);
    setIsPickUnassignedModalOpen(false);
  };

  // --- ABRIR MODAL DE RESERVA / VINCULAR RESERVA NO IMÓVEL ---
  const openQuickReserveModal = (prop?: Property, room?: Room, initialDate?: Date) => {
    const chosenProp = prop || (properties.length > 0 ? properties[0] : null);
    setTargetReserveProperty(chosenProp);
    setTargetReserveRoom(room || (chosenProp?.rooms && chosenProp.rooms.length > 0 ? chosenProp.rooms[0] : null));
    setReserveGuestName("");
    setReserveStatus("Confirmada");
    
    if (initialDate) {
      const s = new Date(initialDate);
      const startStr = s.toISOString().split("T")[0];
      s.setDate(s.getDate() + 3);
      const endStr = s.toISOString().split("T")[0];
      setReserveStartDate(startStr);
      setReserveEndDate(endStr);
    } else {
      // Default dates: tomorrow to +4 days
      const t = new Date();
      t.setDate(t.getDate() + 1);
      const startStr = t.toISOString().split("T")[0];
      t.setDate(t.getDate() + 4);
      const endStr = t.toISOString().split("T")[0];
      setReserveStartDate(startStr);
      setReserveEndDate(endStr);
    }

    setIsQuickReserveModalOpen(true);
  };

  // --- SALVAR RESERVA NO IMÓVEL (COM STATUS: CONFIRMADA OU PENDENTE) ---
  const handleSaveQuickReserve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetReserveProperty || !reserveGuestName.trim()) {
      showToast("Selecione um imóvel e informe o nome do cliente.");
      return;
    }

    const assignedRoom = targetReserveRoom || (targetReserveProperty.rooms && targetReserveProperty.rooms.length > 0 ? targetReserveProperty.rooms[0] : {
      id: "room-default",
      name: "Acomodação Principal",
      pricePerNight: targetReserveProperty.basePrice || 250,
      airbnbCode: "",
      status: "Disponível" as const,
      syncDate: "Hoje",
    });

    const sDate = parseDateBR(reserveStartDate);
    const eDate = parseDateBR(reserveEndDate);
    let nights = 1;
    if (sDate && eDate) {
      const diff = Math.ceil((eDate.getTime() - sDate.getTime()) / (1000 * 3600 * 24));
      nights = diff > 0 ? diff : 1;
    }

    const price = assignedRoom.pricePerNight || targetReserveProperty.basePrice || 200;
    const totalAmount = nights * price;
    const newResId = `res-${Date.now()}`;

    // Converte para DD/MM/AA para manter padrão da tabela
    const startFormatted = reserveStartDate.includes("-")
      ? reserveStartDate.split("-").reverse().join("/").slice(0, 8)
      : reserveStartDate;
    const endFormatted = reserveEndDate.includes("-")
      ? reserveEndDate.split("-").reverse().join("/").slice(0, 8)
      : reserveEndDate;

    const newRes: Reservation = {
      id: newResId,
      guestName: reserveGuestName.trim(),
      propertyId: targetReserveProperty.id,
      propertyName: targetReserveProperty.name.toUpperCase(),
      roomId: assignedRoom.id,
      roomName: assignedRoom.name.toUpperCase(),
      ownerId: targetReserveProperty.ownerId || "",
      startDate: startFormatted,
      endDate: endFormatted,
      nights,
      totalAmount,
      status: reserveStatus, // "Confirmada" ou "Pendente"
      channel: "Direto",
      confirmationCode: "RES" + Math.floor(100 + Math.random() * 900) + "X",
    };

    const now = new Date();
    const timeStr = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}, ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

    setReservations((prev) => [newRes, ...prev]);
    setLastUpdated(timeStr);

    try {
      await setDoc(doc(db, "reservations", newResId), newRes);
      await setDoc(doc(db, "settings", "meta"), { lastUpdated: timeStr }, { merge: true });
    } catch (err) {
      console.warn("Reserva salva localmente:", err);
    }

    logActivity({
      actorName: currentUser?.name || "Admin",
      actorEmail: currentUser?.email || "admin",
      actorRole: currentUser?.role || "admin",
      category: "reservation",
      action: "CRIOU_RESERVA",
      description: `Reserva vinculada para ${reserveGuestName} no imóvel "${targetReserveProperty.name}" com status ${reserveStatus}.`,
      details: newRes,
    });

    setIsQuickReserveModalOpen(false);
    showToast(`✓ Reserva vinculada com sucesso para ${reserveGuestName}! Status: ${reserveStatus === "Confirmada" ? "Confirmada 🟢" : "Pendente da confirmação 🟡"}`);
  };

  // --- ALTERAR STATUS DA RESERVA PELO ADMIN (CONFIRMADA x PENDENTE DA CONFIRMAÇÃO) ---
  const handleUpdateReservationStatus = async (resId: string, newStatus: ReservationStatus) => {
    setReservations((prev) =>
      prev.map((r) => (r.id === resId ? { ...r, status: newStatus } : r))
    );

    try {
      await updateDoc(doc(db, "reservations", resId), { status: newStatus });
    } catch (e) {
      console.warn("Update status Firestore:", e);
    }

    const target = reservations.find((r) => r.id === resId);
    showToast(`✓ Status alterado para: ${newStatus === "Confirmada" ? "Confirmada 🟢" : "Pendente da confirmação 🟡"}`);

    await logActivity({
      actorName: currentUser?.name || "Admin",
      actorEmail: currentUser?.email || "admin",
      actorRole: currentUser?.role || "admin",
      category: "reservation",
      action: "ALTEROU_STATUS_RESERVA",
      description: `Status da reserva de "${target?.guestName || resId}" alterado para ${newStatus}.`,
      details: { reservationId: resId, newStatus },
    });
  };

  // --- GESTÃO DE EDIÇÃO DE CONFIGURAÇÕES DO IMÓVEL ---
  const openEditPropertyModal = (prop: Property) => {
    setEditingProperty(prop);
    setEditPropName(prop.name);
    setEditPropType(prop.type);
    setEditPropAddress(prop.address);
    setEditPropCity(prop.city || "");
    setEditPropOwnerId(prop.ownerId || "");
    setEditPropUrl(prop.airbnbListingUrl || "");
    setEditPropListingId(prop.airbnbListingId || "");
    setEditPropImg(prop.imageUrl || "");
    setEditPropPrice(prop.basePrice || 250);
    setEditPropGuests(prop.maxGuests || 4);
    setEditPropBedrooms(prop.bedrooms || 1);
    setEditPropBathrooms(prop.bathrooms || 1);
    setEditPropAmenities(prop.amenities ? prop.amenities.join(", ") : "");
    const primaryRoom = prop.rooms && prop.rooms.length > 0 ? prop.rooms[0] : null;
    setEditPropIcal(primaryRoom?.iCalUrl || "");
    setIsEditPropertyModalOpen(true);
  };

  const handleSaveEditProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProperty || !editPropName.trim()) return;

    const amenitiesList = editPropAmenities
      .split(",")
      .map((a) => a.trim())
      .filter(Boolean);

    const existingRooms = editingProperty.rooms && editingProperty.rooms.length > 0 ? editingProperty.rooms : [];
    const updatedRooms = existingRooms.length > 0
      ? existingRooms.map((r, idx) =>
          idx === 0
            ? {
                ...r,
                pricePerNight: Number(editPropPrice) || r.pricePerNight,
                iCalUrl: editPropIcal.trim() || undefined,
              }
            : r
        )
      : [
          {
            id: `room-${Date.now()}`,
            name: "Acomodação Principal",
            pricePerNight: Number(editPropPrice) || 250,
            airbnbCode: editPropListingId.trim() || "",
            status: "Disponível" as const,
            syncDate: "Hoje",
            iCalUrl: editPropIcal.trim() || undefined,
          },
        ];

    const updatedProp: Property = {
      ...editingProperty,
      name: editPropName.trim(),
      type: editPropType,
      address: editPropAddress.trim() || "Endereço não informado",
      city: editPropCity.trim() || "Brasil",
      ownerId: editPropOwnerId.trim(),
      imageUrl: editPropImg.trim() || SAMPLE_PHOTOS[0],
      airbnbListingUrl: editPropUrl.trim() || undefined,
      airbnbListingId: editPropListingId.trim() || undefined,
      basePrice: Number(editPropPrice) || 200,
      maxGuests: Number(editPropGuests) || 2,
      bedrooms: Number(editPropBedrooms) || 1,
      bathrooms: Number(editPropBathrooms) || 1,
      amenities: amenitiesList.length ? amenitiesList : ["Wi-Fi", "Ar-condicionado"],
      rooms: updatedRooms,
    };

    setProperties((prev) => prev.map((p) => (p.id === editingProperty.id ? updatedProp : p)));

    try {
      await updateDoc(doc(db, "properties", editingProperty.id), updatedProp as any);
    } catch (err) {
      console.warn("Erro ao atualizar imóvel no Firestore:", err);
    }

    await logActivity({
      actorName: currentUser?.name || "Admin",
      actorEmail: currentUser?.email || "admin",
      actorRole: currentUser?.role || "admin",
      category: "property",
      action: "EDITOU_CONFIGURACOES_IMOVEL",
      description: `Configurações do imóvel "${updatedProp.name}" foram atualizadas com sucesso.`,
      details: { propertyId: editingProperty.id },
    });

    setIsEditPropertyModalOpen(false);
    showToast(`✓ Configurações do imóvel "${updatedProp.name}" atualizadas com sucesso!`);
  };

  // --- GESTÃO DE EDIÇÃO DE USUÁRIO (NOME E SENHA) ---
  const openEditUserModal = (user: User) => {
    setEditingUser(user);
    setEditUserName(user.name);
    setEditUserUsername(user.username || "");
    setEditUserEmail(user.email);
    setEditUserPassword(user.password || "");
    setIsEditUserModalOpen(true);
  };

  const handleSaveEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser || !editUserName.trim() || !editUserPassword.trim()) {
      showToast("Informe o nome e a nova senha do usuário.");
      return;
    }

    const updatedUser: User = {
      ...editingUser,
      name: editUserName.trim(),
      username: editUserUsername.trim() || editUserName.trim().toLowerCase().replace(/\s+/g, ""),
      email: editUserEmail.trim() || editingUser.email,
      password: editUserPassword.trim(),
    };

    setUsersList((prev) => prev.map((u) => (u.id === editingUser.id ? updatedUser : u)));

    if (currentUser && currentUser.id === editingUser.id) {
      setCurrentUser(updatedUser);
    }

    if (viewingOwnerDetail && viewingOwnerDetail.id === editingUser.id) {
      setViewingOwnerDetail(updatedUser);
    }

    try {
      await updateDoc(doc(db, "users", editingUser.id), {
        name: updatedUser.name,
        username: updatedUser.username,
        email: updatedUser.email,
        password: updatedUser.password,
      });
    } catch (err) {
      console.warn("Erro ao atualizar usuário no Firestore:", err);
    }

    await logActivity({
      actorName: currentUser?.name || "Admin",
      actorEmail: currentUser?.email || "admin",
      actorRole: currentUser?.role || "admin",
      category: "user",
      action: "EDITOU_USUARIO_SENHA",
      description: `Dados e credenciais de "${updatedUser.name}" (${updatedUser.role}) foram atualizados.`,
      details: { userId: editingUser.id },
    });

    setIsEditUserModalOpen(false);
    showToast(`✓ Usuário "${updatedUser.name}" atualizado (nova senha salva no banco)!`);
  };

  // --- PASSOS DO TOUR INTERATIVO COMPLETO PARA CRIAR IMÓVEL ---
  const tourCreatePropertySteps = [
    {
      step: 1,
      totalSteps: 6,
      title: "Passo 1/6: Abrir Formulário de Novo Imóvel",
      description: "Clique no botão destacado '+ Novo Imóvel' no canto superior direito para iniciar o cadastro completo.",
      actionHint: "Clique no botão '+ Novo Imóvel' pulsando em verde.",
      targetTab: "properties" as const,
      targetElementId: "btn-novo-imovel",
    },
    {
      step: 2,
      totalSteps: 6,
      title: "Passo 2/6: Título / Nome do Imóvel",
      description: "Digite o título comercial como ele aparece no Airbnb (ex: 'Apartamento Copacabana com Vista').",
      actionHint: "Preencha o campo 'Título / Nome do Imóvel' destacado.",
      targetTab: "properties" as const,
      targetElementId: "tour-field-prop-name",
    },
    {
      step: 3,
      totalSteps: 6,
      title: "Passo 3/6: Categoria e Proprietário",
      description: "Selecione o tipo do imóvel (Apartamento, Casa, etc.) e vincule a um proprietário ou deixe para vincular depois.",
      actionHint: "Defina o Tipo de Imóvel e o Proprietário responsável.",
      targetTab: "properties" as const,
      targetElementId: "tour-field-prop-type",
    },
    {
      step: 4,
      totalSteps: 6,
      title: "Passo 4/6: Endereço Completo & Cidade",
      description: "Informe a rua, número, bairro e cidade/UF da propriedade.",
      actionHint: "Preencha os campos de localização destacados.",
      targetTab: "properties" as const,
      targetElementId: "tour-field-prop-address",
    },
    {
      step: 5,
      totalSteps: 6,
      title: "Passo 5/6: Diária Base e Capacidade",
      description: "Defina o valor da diária padrão em R$, quantidade máxima de hóspedes, quartos e banheiros.",
      actionHint: "Defina a diária base (R$) e a lotação máxima de hóspedes.",
      targetTab: "properties" as const,
      targetElementId: "tour-field-prop-pricing",
    },
    {
      step: 6,
      totalSteps: 6,
      title: "Passo 6/6: Concluir Cadastro no Firebase",
      description: "Tudo pronto! Clique no botão pulsando 'Salvar Imóvel no Firebase' para gravar o imóvel com sucesso!",
      actionHint: "Clique no botão 'Salvar Imóvel no Firebase' destacado em verde.",
      targetTab: "properties" as const,
      targetElementId: "tour-btn-save-prop",
    },
  ];

  const handleTourNextStep = () => {
    if (!activeTour) return;
    if (activeTour.tourId === "create_property") {
      const nextStepNum = activeTour.step + 1;
      const found = tourCreatePropertySteps.find((s) => s.step === nextStepNum);
      if (found) {
        if (nextStepNum >= 2 && !isNewPropertyModalOpen) {
          setIsNewPropertyModalOpen(true);
        }
        setActiveTour({ ...found, tourId: "create_property" });
      } else {
        setActiveTour(null);
        showToast("🎉 Treinamento concluído com sucesso!");
      }
    }
  };

  const handleTourPrevStep = () => {
    if (!activeTour || activeTour.step <= 1) return;
    if (activeTour.tourId === "create_property") {
      const prevStepNum = activeTour.step - 1;
      const found = tourCreatePropertySteps.find((s) => s.step === prevStepNum);
      if (found) {
        setActiveTour({ ...found, tourId: "create_property" });
      }
    }
  };

  const handleTourStepGoTo = (stepNum: number) => {
    const found = tourCreatePropertySteps.find((s) => s.step === stepNum);
    if (found) {
      setActiveTour({ ...found, tourId: "create_property" });
    }
  };

  // --- TOUR INTERATIVO PRÁTICO DA WIKI ---
  const handleStartInteractiveTour = (tourId: "create_property" | "create_reservation" | "assign_owner") => {
    if (tourId === "create_property") {
      setActiveTab("properties");
      setActiveTour({
        ...tourCreatePropertySteps[0],
        tourId,
      });
      showToast("🚀 Treinamento Guiado: Siga os botões destacados para criar o imóvel completo!");
    } else if (tourId === "create_reservation") {
      setActiveTab("calendar");
      setActiveTour({
        tourId,
        step: 1,
        title: "Passo a Passo: Vincular Reserva no Imóvel",
        description: "Clique no botão destacado '+ Vincular Reserva no Imóvel' ou clique diretamente em qualquer dia livre do calendário.",
        actionHint: "Defina o cliente, datas e selecione o status (Confirmada ou Pendente da confirmação).",
        targetTab: "calendar",
        targetElementId: "btn-vincular-reserva",
      });
      showToast("📅 Guia Interativo: Clique no botão destacado para vincular uma reserva!");
    } else if (tourId === "assign_owner") {
      setActiveTab("properties");
      setActiveTour({
        tourId,
        step: 1,
        title: "Passo a Passo: Vincular Imóvel ao Proprietário",
        description: "Localize um imóvel com a tarja 'Sem Proprietário' e clique no botão destacado 'Vincular'.",
        actionHint: "Associe o imóvel ao proprietário cadastrado para gerar o acesso exclusivo dele.",
        targetTab: "properties",
        targetElementId: "btn-vincular-dono",
      });
      showToast("👥 Guia Interativo: Vincule um imóvel a um proprietário!");
    }
  };

  // =========================================
  // OPERAÇÕES DO DESENVOLVEDOR (DEV DIRETO)
  // =========================================
  const handleDevCreateUser = async (userData: Partial<User>) => {
    const userId = userData.id || `user-${Date.now()}`;
    const newUser: User = {
      id: userId,
      name: userData.name || "Novo Usuário",
      email: userData.email || "",
      username: userData.username || "",
      password: userData.password || "123",
      role: userData.role || "owner",
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };
    setUsersList((prev) => [...prev, newUser]);
    try {
      await setDoc(doc(db, "users", userId), newUser);
    } catch (e) {
      console.warn("Dev save user Firestore:", e);
    }
    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "user",
      action: "CRIOU_USUARIO",
      description: `Dev criou usuário ${newUser.name} (${newUser.email}) com cargo ${newUser.role}.`,
      details: newUser,
    });
  };

  const handleDevUpdateUser = async (userId: string, updates: Partial<User>) => {
    setUsersList((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, ...updates } : u))
    );
    try {
      await updateDoc(doc(db, "users", userId), updates);
    } catch (e) {
      console.warn("Dev update user Firestore:", e);
    }
    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "user",
      action: "EDITOU_USUARIO",
      description: `Dev atualizou dados do usuário ID ${userId}.`,
      details: updates,
    });
  };

  const handleDevDeleteUser = async (userId: string) => {
    const target = usersList.find((u) => u.id === userId);
    const updatedProps = properties.map((p) => {
      if (p.ownerId === userId) return { ...p, ownerId: "" };
      return p;
    });
    setProperties(updatedProps);
    setUsersList((prev) => prev.filter((u) => u.id !== userId));

    try {
      for (const p of properties.filter((p) => p.ownerId === userId)) {
        await updateDoc(doc(db, "properties", p.id), { ownerId: "" });
      }
      await deleteDoc(doc(db, "users", userId));
    } catch (e) {
      console.warn("Dev delete user Firestore:", e);
    }

    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "user",
      action: "EXCLUIU_USUARIO",
      description: `Dev excluiu usuário ${target?.name || userId} do banco de dados sem precisar de aprovação.`,
      details: { deletedUserId: userId, userName: target?.name },
    });
  };

  const handleDevCreateRoom = async (propertyId: string, roomData: Omit<Room, "id" | "syncDate">) => {
    const newRoom: Room = {
      id: `room-${Date.now()}`,
      syncDate: "Hoje",
      ...roomData,
    };
    const prop = properties.find((p) => p.id === propertyId);
    const updatedRooms = [...(prop?.rooms || []), newRoom];
    const updatedProps = properties.map((p) => (p.id === propertyId ? { ...p, rooms: updatedRooms } : p));
    setProperties(updatedProps);

    try {
      await updateDoc(doc(db, "properties", propertyId), { rooms: updatedRooms });
    } catch (e) {
      console.warn("Dev create room Firestore:", e);
    }

    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "room",
      action: "CRIOU_COMODO",
      description: `Dev adicionou cômodo "${newRoom.name}" no imóvel "${prop?.name || propertyId}".`,
      details: { propertyId, room: newRoom },
    });
  };

  const handleDevUpdateRoom = async (propertyId: string, roomId: string, updates: Partial<Room>) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return;
    const updatedRooms = (prop.rooms || []).map((r) => (r.id === roomId ? { ...r, ...updates } : r));
    const updatedProps = properties.map((p) => (p.id === propertyId ? { ...p, rooms: updatedRooms } : p));
    setProperties(updatedProps);

    try {
      await updateDoc(doc(db, "properties", propertyId), { rooms: updatedRooms });
    } catch (e) {
      console.warn("Dev update room Firestore:", e);
    }

    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "room",
      action: "EDITOU_COMODO",
      description: `Dev editou cômodo ID ${roomId} no imóvel "${prop.name}".`,
      details: { propertyId, roomId, updates },
    });
  };

  const handleDevDeleteRoom = async (propertyId: string, roomId: string) => {
    const prop = properties.find((p) => p.id === propertyId);
    if (!prop) return;
    const roomToDelete = prop.rooms.find((r) => r.id === roomId);
    const updatedRooms = prop.rooms.filter((r) => r.id !== roomId);
    const updatedProps = properties.map((p) => (p.id === propertyId ? { ...p, rooms: updatedRooms } : p));
    setProperties(updatedProps);

    try {
      await updateDoc(doc(db, "properties", propertyId), { rooms: updatedRooms });
    } catch (e) {
      console.warn("Dev delete room Firestore:", e);
    }

    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "room",
      action: "EXCLUIU_COMODO",
      description: `Dev excluiu cômodo "${roomToDelete?.name || roomId}" do imóvel "${prop.name}".`,
      details: { propertyId, roomId },
    });
  };

  const handleDevAssignPropertyOwner = async (propertyId: string, ownerId: string) => {
    const updatedProps = properties.map((p) => (p.id === propertyId ? { ...p, ownerId } : p));
    setProperties(updatedProps);

    try {
      await updateDoc(doc(db, "properties", propertyId), { ownerId });
    } catch (e) {
      console.warn("Dev assign property Firestore:", e);
    }

    const prop = properties.find((p) => p.id === propertyId);
    const owner = usersList.find((u) => u.id === ownerId);
    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: currentUser?.role || "dev",
      category: "property",
      action: "VINCULOU_IMOVEL",
      description: ownerId
        ? `Dev vinculou o imóvel "${prop?.name}" ao proprietário ${owner?.name || ownerId}.`
        : `Dev desvinculou o imóvel "${prop?.name}", deixando como 'Sem Proprietário'.`,
      details: { propertyId, ownerId },
    });
  };

  // --- RESETS DO BANCO DE DADOS (DEV EXCLUSIVE) ---
  const handleDevResetUsers = async (mode: "restore_initial" | "clear_owners") => {
    if (mode === "restore_initial") {
      setUsersList(INITIAL_USERS);
      try {
        for (const u of INITIAL_USERS) {
          await setDoc(doc(db, "users", u.id), u);
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "RESET_USERS_INICIAIS",
        description: "Dev restaurou usuários padrão de fábrica no Firestore.",
      });
    } else if (mode === "clear_owners") {
      const remaining = usersList.filter((u) => u.role !== "owner");
      const removed = usersList.filter((u) => u.role === "owner");
      setUsersList(remaining);
      try {
        for (const o of removed) {
          await deleteDoc(doc(db, "users", o.id));
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "LIMPAR_PROPRIETARIOS",
        description: `Dev removeu ${removed.length} proprietários do Firestore mantendo Dev e Admin.`,
      });
    }
  };

  const handleDevResetReservations = async (mode: "clear_all" | "restore_initial" | "clear_by_prop", propertyId?: string) => {
    if (mode === "clear_all") {
      const toDelete = [...reservations];
      setReservations([]);
      try {
        for (const r of toDelete) {
          await deleteDoc(doc(db, "reservations", r.id));
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "ESVAZIAR_AGENDA",
        description: `Dev esvaziou todas as ${toDelete.length} reservas da agenda no Firestore.`,
      });
    } else if (mode === "restore_initial") {
      setReservations(INITIAL_RESERVATIONS);
      try {
        for (const r of INITIAL_RESERVATIONS) {
          await setDoc(doc(db, "reservations", r.id), r);
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "RESTAURAR_AGENDA_DEMO",
        description: "Dev restaurou reservas iniciais de teste na agenda.",
      });
    } else if (mode === "clear_by_prop" && propertyId) {
      const prop = properties.find((p) => p.id === propertyId);
      const toDelete = reservations.filter((r) => r.propertyId === propertyId);
      setReservations((prev) => prev.filter((r) => r.propertyId !== propertyId));
      try {
        for (const r of toDelete) {
          await deleteDoc(doc(db, "reservations", r.id));
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "LIMPAR_AGENDA_IMOVEL",
        description: `Dev limpou ${toDelete.length} reservas do imóvel "${prop?.name || propertyId}".`,
        details: { propertyId },
      });
    }
  };

  const handleDevResetProperties = async (mode: "restore_initial" | "clear_all") => {
    if (mode === "restore_initial") {
      setProperties(INITIAL_PROPERTIES);
      try {
        for (const p of INITIAL_PROPERTIES) {
          await setDoc(doc(db, "properties", p.id), p);
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "RESTAURAR_IMOVEIS_INICIAIS",
        description: "Dev restaurou imóveis padrão de fábrica no Firestore.",
      });
    } else if (mode === "clear_all") {
      const toDelete = [...properties];
      setProperties([]);
      try {
        for (const p of toDelete) {
          await deleteDoc(doc(db, "properties", p.id));
        }
      } catch (e) {}
      await logActivity({
        actorName: currentUser?.name || "Dev",
        actorEmail: currentUser?.email || "dev",
        actorRole: "dev",
        category: "database",
        action: "ESVAZIAR_IMOVEIS",
        description: `Dev esvaziou todos os ${toDelete.length} imóveis no Firestore.`,
      });
    }
  };

  const handleDevFullFactoryReset = async () => {
    // 1. Manter APENAS Dev e Admin (exclui todos os proprietários)
    const devUser: User = {
      id: "dev-micael",
      name: "Micael Bardim (Dev)",
      email: "micaelbardimtech@gmail.com",
      username: "micaelbardimtech",
      password: "dev",
      role: "dev",
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };
    const adminUser: User = {
      id: "admin",
      name: "Administrador",
      email: "admin@gestao.com",
      username: "admin",
      password: "admin123",
      role: "admin",
      createdAt: new Date().toLocaleDateString("pt-BR"),
    };

    // Apagar todos os proprietários do Firestore
    const ownersToDelete = usersList.filter((u) => u.role === "owner");
    for (const o of ownersToDelete) {
      try {
        await deleteDoc(doc(db, "users", o.id));
      } catch (e) {
        console.warn("Delete owner Firestore:", e);
      }
    }
    try {
      await setDoc(doc(db, "users", devUser.id), devUser);
      await setDoc(doc(db, "users", adminUser.id), adminUser);
    } catch (e) {}
    setUsersList([devUser, adminUser]);

    // 2. Apagar TODOS os imóveis do Firestore
    const propsToDelete = [...properties];
    setProperties([]);
    for (const p of propsToDelete) {
      try {
        await deleteDoc(doc(db, "properties", p.id));
      } catch (e) {
        console.warn("Delete property Firestore:", e);
      }
    }

    // 3. Apagar TODAS as reservas do Firestore
    const resToDelete = [...reservations];
    setReservations([]);
    for (const r of resToDelete) {
      try {
        await deleteDoc(doc(db, "reservations", r.id));
      } catch (e) {
        console.warn("Delete reservation Firestore:", e);
      }
    }

    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: "dev",
      category: "database",
      action: "HARD_RESET_ZEROU_BANCO",
      description: "Dev executou Reset Total do banco de dados: saíram todos os proprietários, saíram todos os imóveis e todas as reservas. Ficaram apenas Admin e Dev.",
    });

    showToast("✓ Reset concluído: saíram todos os proprietários e imóveis. Ficaram apenas Admin e Dev!");
  };

  const handleDevImportBackup = async (backupData: any) => {
    if (backupData.users && Array.isArray(backupData.users)) {
      setUsersList(backupData.users);
      for (const u of backupData.users) {
        try { await setDoc(doc(db, "users", u.id), u); } catch (e) {}
      }
    }
    if (backupData.properties && Array.isArray(backupData.properties)) {
      setProperties(backupData.properties);
      for (const p of backupData.properties) {
        try { await setDoc(doc(db, "properties", p.id), p); } catch (e) {}
      }
    }
    if (backupData.reservations && Array.isArray(backupData.reservations)) {
      setReservations(backupData.reservations);
      for (const r of backupData.reservations) {
        try { await setDoc(doc(db, "reservations", r.id), r); } catch (e) {}
      }
    }
    await logActivity({
      actorName: currentUser?.name || "Dev",
      actorEmail: currentUser?.email || "dev",
      actorRole: "dev",
      category: "database",
      action: "RESTAURACAO_BACKUP_JSON",
      description: "Dev restaurou backup completo do banco a partir de arquivo JSON.",
      details: {
        usersCount: backupData.users?.length,
        propertiesCount: backupData.properties?.length,
        reservationsCount: backupData.reservations?.length,
      },
    });
  };

  // =========================================
  // RENDER: LOGIN GERAL (ADMIN OU PROPRIETÁRIO)
  // =========================================
  if (!currentUser) {
    return (
      <div className="login-screen">
        <div className="login-brand-header">
          <img
            src="/favicon.png"
            alt="PropertyHub"
            style={{ width: "52px", height: "52px", objectFit: "contain", filter: "drop-shadow(0 0 12px rgba(16,185,129,0.35))" }}
          />
          <span className="login-brand-title">PropertyHub</span>
        </div>

        <div className="login-card">
          <span className="login-admin-badge">Acesso ao Sistema</span>
          <h1 className="login-card-title">Entrar na Plataforma</h1>
          <p className="login-card-subtitle">
            Informe seu usuário ou e-mail e sua senha cadastrada no banco de dados. O sistema identifica automaticamente seu tipo de acesso.
          </p>

          {authError && (
            <div style={{ background: "rgba(239, 68, 68, 0.12)", color: "#ef4444", padding: "10px 14px", borderRadius: "8px", fontSize: "12.5px", marginBottom: "14px" }}>
              {authError}
            </div>
          )}

          <form className="login-form" onSubmit={handleUnifiedLogin}>
            <div className="input-group">
              <IconUsers size={18} />
              <input
                type="text"
                placeholder="Seu usuário ou e-mail"
                value={loginIdentifier}
                onChange={(e) => setLoginIdentifier(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="input-group">
              <IconSettings size={18} />
              <input
                type="password"
                placeholder="Sua senha de acesso"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
              />
            </div>

            <button type="submit" className="btn-login-submit" disabled={authLoading}>
              {authLoading ? "Verificando no banco..." : "Entrar na Plataforma"}
            </button>
          </form>


        </div>
      </div>
    );
  }

  // =========================================
  // APP LAYOUT (MOBILE RESPONSIVE + DARK MODE)
  // =========================================
  const isDev = currentUser.role === "dev" || currentUser.email.toLowerCase() === "micaelbardimtech@gmail.com";
  const isAdmin = currentUser.role === "admin";
  const isAdminOrDev = isAdmin || isDev;
  const firstName = currentUser.name.split(" ")[0];

  return (
    <div className="app-layout">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="toast-notice">
          <IconCheck size={18} />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOPBAR MOBILE */}
      <header className="mobile-topbar">
        <div className="mobile-brand">
          <img
            src="/favicon.png"
            alt="PropertyHub"
            style={{ width: "26px", height: "26px", objectFit: "contain" }}
          />
          <span className="mobile-brand-title">PropertyHub</span>
        </div>

        <div className="mobile-actions">
          <button className="mobile-btn-icon" onClick={toggleTheme} title="Alternar tema">
            {theme === "light" ? <IconMoon size={18} /> : <IconSun size={18} />}
          </button>
          <button
            className="mobile-btn-icon"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            title="Menu de navegação"
          >
            <IconMenu size={20} />
          </button>
        </div>
      </header>

      {/* OVERLAY PARA O MENU MOBILE */}
      <div
        className={`drawer-overlay ${mobileMenuOpen ? "mobile-open" : ""}`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* SIDEBAR NAVIGATION */}
      <aside className={`sidebar ${mobileMenuOpen ? "mobile-open" : ""}`}>
        <div className="sidebar-brand">
          <div className="sidebar-logo-row">
            <img
              src="/favicon.png"
              alt="PropertyHub"
              style={{ width: "28px", height: "28px", objectFit: "contain", filter: "drop-shadow(0 0 8px rgba(16,185,129,0.3))" }}
            />
            <span className="sidebar-logo-text">PropertyHub</span>
          </div>
          <span className="sidebar-role-badge">
            {isDev ? "DEV / ENGENHARIA" : isAdmin ? "ADMIN" : "PROPRIETÁRIO"}
          </span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-link ${activeTab === "dashboard" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("dashboard");
              setViewingOwnerDetail(null);
              setMobileMenuOpen(false);
            }}
          >
            <IconGrid size={18} />
            <span>{isAdminOrDev ? "Painel Geral" : "Meu Painel"}</span>
          </button>

          <button
            className={`nav-link ${activeTab === "calendar" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("calendar");
              setViewingOwnerDetail(null);
              setMobileMenuOpen(false);
            }}
          >
            <IconCalendar size={18} />
            <span>Calendário / Agenda</span>
          </button>

          {/* ABA PROPRIETÁRIOS (ADMIN OU DEV) */}
          {isAdminOrDev && (
            <button
              className={`nav-link ${activeTab === "owners" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("owners");
                setViewingOwnerDetail(null);
                setMobileMenuOpen(false);
              }}
            >
              <IconUsers size={18} />
              <span>Proprietários</span>
            </button>
          )}

          <button
            className={`nav-link ${activeTab === "properties" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("properties");
              setViewingOwnerDetail(null);
              setMobileMenuOpen(false);
            }}
          >
            <IconBuilding size={18} />
            <span>Imóveis</span>
          </button>

          <button
            className={`nav-link ${activeTab === "reservations" ? "active" : ""}`}
            onClick={() => {
              setActiveTab("reservations");
              setViewingOwnerDetail(null);
              setMobileMenuOpen(false);
            }}
          >
            <IconBookmark size={18} />
            <span>Reservas</span>
          </button>

          {isAdminOrDev && (
            <button
              className={`nav-link ${activeTab === "settings" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("settings");
                setViewingOwnerDetail(null);
                setMobileMenuOpen(false);
              }}
            >
              <IconSettings size={18} />
              <span>Configurações</span>
            </button>
          )}

          {/* ABA WIKI & GUIA PASSO A PASSO (ADMIN OU DEV) */}
          {isAdminOrDev && (
            <button
              className={`nav-link wiki-link ${activeTab === "wiki" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("wiki");
                setViewingOwnerDetail(null);
                setMobileMenuOpen(false);
              }}
            >
              <IconBook size={18} />
              <span>Wiki / Treinamento</span>
            </button>
          )}

          {/* ABA EXCLUSIVA DO DEV: LOGS & BANCO DE DADOS */}
          {isDev && (
            <button
              className={`nav-link dev-link ${activeTab === "dev" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("dev");
                setViewingOwnerDetail(null);
                setMobileMenuOpen(false);
              }}
            >
              <IconTerminal size={18} />
              <span>Console Dev & DB</span>
            </button>
          )}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="user-avatar">{currentUser.name.charAt(0)}</div>
            <div className="user-info">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-email">{currentUser.email}</span>
            </div>
          </div>

          <div className="sidebar-controls">
            <button className="theme-toggle-btn" onClick={toggleTheme}>
              {theme === "light" ? (
                <>
                  <IconMoon size={14} /> Modo Dark
                </>
              ) : (
                <>
                  <IconSun size={14} /> Modo Claro
                </>
              )}
            </button>

            <button className="btn-logout" onClick={handleLogout} title="Encerrar sessão">
              <IconLogout size={16} />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="main-content">
        {/* =========================================
            TAB: DASHBOARD
           ========================================= */}
        {activeTab === "dashboard" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Olá, {firstName}!</h1>
                <p className="page-subtitle">
                  {isAdminOrDev
                    ? "Painel Central de Gestão Multi-Propriedades"
                    : "Aqui está o resumo em tempo real dos seus imóveis"}
                </p>
              </div>
              <div className="last-updated-badge">
                <span className="pulse-dot" />
                <span>ATUALIZADO: {lastUpdated}</span>
              </div>
            </div>

            {/* KPI GRID 4 */}
            <div className="kpi-grid-4">
              <div className="kpi-card">
                <div className="kpi-icon-wrap gray">
                  <IconBuilding size={20} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">{totalPropertiesCount}</span>
                  <span className="kpi-label">Imóveis Ativos</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap orange">
                  <IconBed size={20} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">
                    {occupiedRoomsCount}/{totalRoomsCount}
                  </span>
                  <span className="kpi-label">Ocupados ({availableRoomsCount} livres)</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap green">
                  <IconTrendUp size={20} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">{occupancyRate}%</span>
                  <span className="kpi-label">Taxa de Ocupação</span>
                </div>
              </div>

              <div className="kpi-card">
                <div className="kpi-icon-wrap purple">
                  <IconCalendar size={20} />
                </div>
                <div className="kpi-content">
                  <span className="kpi-value">{formatBRL(totalRevenue)}</span>
                  <span className="kpi-label">Faturamento Total</span>
                </div>
              </div>
            </div>

            {/* Quick Properties Summary Grid */}
            <div style={{ marginTop: "32px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: "700" }}>Seus Imóveis Vinculados</h2>
                <button className="btn-secondary" onClick={() => setActiveTab("properties")}>
                  Ver Todos os Imóveis →
                </button>
              </div>

              <div className="properties-full-grid">
                {userProperties.slice(0, 3).map((prop) => {
                  const isAssigned = !!prop.ownerId && prop.ownerId !== "unassigned";
                  const ownerObj = isAssigned ? usersList.find((u) => u.id === prop.ownerId) : null;

                  return (
                    <div className="airbnb-property-card" key={prop.id}>
                      <div
                        className="prop-img-box"
                        style={{ backgroundImage: `url(${prop.imageUrl || SAMPLE_PHOTOS[0]})` }}
                      >
                        <span className="prop-badge-top-left">{prop.type}</span>
                        <div className="prop-badge-top-right">
                          <span className={`owner-pill-badge ${isAssigned ? "assigned" : "unassigned"}`}>
                            {isAssigned ? (ownerObj?.name || "Proprietário") : "⚠️ Sem Proprietário"}
                          </span>
                        </div>
                      </div>

                      <div className="prop-card-body">
                        <h3 className="prop-main-title">{prop.name}</h3>
                        <span className="prop-address-text">
                          <IconMapPin size={13} /> {prop.address}
                        </span>

                        <div className="prop-features-row">
                          <span><IconUsers size={13} /> Até {prop.maxGuests || 4} hóspedes</span>
                          <span><IconBed size={13} /> {prop.rooms.length} acomodações</span>
                        </div>

                        <div className="prop-price-footer">
                          <span className="prop-price-val">{formatBRL(prop.basePrice || 250)}</span>
                          <span className="prop-price-unit">/noite</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB: PROPRIETÁRIOS (APENAS ADMIN)
           ========================================= */}
        {activeTab === "owners" && isAdmin && (
          <div>
            {/* SUB-VIEW DEDICADA: DETALHE DO PROPRIETÁRIO */}
            {viewingOwnerDetail ? (
              <div className="owner-view-dedicated">
                <button
                  className="back-to-owners-btn"
                  onClick={() => setViewingOwnerDetail(null)}
                >
                  <IconArrowLeft size={16} /> Voltar para Todos os Proprietários
                </button>

                {/* Hero Header do Proprietário */}
                <div className="owner-profile-hero">
                  <div className="owner-profile-info">
                    <div className="owner-avatar-lg">
                      {viewingOwnerDetail.name.charAt(0)}
                    </div>
                    <div className="owner-profile-title">
                      <h1>{viewingOwnerDetail.name}</h1>
                      <p>{viewingOwnerDetail.email} • Cadastrado em {viewingOwnerDetail.createdAt || "Hoje"}</p>
                      <div style={{ display: "flex", gap: "8px", marginTop: "8px", flexWrap: "wrap", alignItems: "center" }}>
                        <span style={{ fontSize: "12px", background: "rgba(37, 99, 235, 0.12)", color: "var(--brand-primary)", padding: "4px 10px", borderRadius: "8px", fontWeight: 600, border: "1px solid rgba(37,99,235,0.25)" }}>
                          👤 Usuário: <strong>{viewingOwnerDetail.username || viewingOwnerDetail.email}</strong>
                        </span>
                        {viewingOwnerDetail.password && (
                          <span style={{ fontSize: "12px", background: "rgba(16, 185, 129, 0.12)", color: "var(--accent-green)", padding: "4px 10px", borderRadius: "8px", fontWeight: 600, border: "1px solid rgba(16,185,129,0.25)" }}>
                            🔑 Senha: <strong>{viewingOwnerDetail.password}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="owner-profile-actions">
                    <button
                      className="btn-primary"
                      onClick={() => handleCopyOwnerCredentials(viewingOwnerDetail)}
                      title="Copiar dados de acesso completos (usuário, senha e link) para enviar por WhatsApp"
                    >
                      <IconCopy size={15} /> Copiar Acesso (WhatsApp)
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => openEditUserModal(viewingOwnerDetail)}
                      title="Editar nome, e-mail e redefinir senha deste proprietário"
                      style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                    >
                      <IconEdit size={15} /> Editar Nome e Senha
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => handleCopyOwnerLink(viewingOwnerDetail)}
                    >
                      <IconCopy size={15} /> Copiar Link Direto
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => setIsPickUnassignedModalOpen(true)}
                    >
                      <IconBuilding size={15} /> Vincular Imóvel Existente
                    </button>
                    <button
                      className="btn-primary"
                      onClick={() => {
                        setFormPropOwnerId(viewingOwnerDetail.id);
                        setIsNewPropertyModalOpen(true);
                      }}
                    >
                      <IconPlus size={15} /> Cadastrar Novo Imóvel
                    </button>
                    <button
                      className="btn-danger"
                      onClick={() => handleDeleteOwner(viewingOwnerDetail)}
                      title="Ao excluir, seus imóveis passam a ficar 'Sem Proprietário'"
                    >
                      <IconTrash size={15} /> Excluir Proprietário
                    </button>
                  </div>
                </div>

                {/* Imóveis vinculados a este proprietário */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                    <div>
                      <h2 style={{ fontSize: "18px", fontWeight: "700" }}>
                        Imóveis de {viewingOwnerDetail.name}
                      </h2>
                      <p style={{ fontSize: "13px", color: "var(--text-secondary)" }}>
                        Clique em <strong>Reservar Agora</strong> no imóvel para lançar uma reserva com ocupação e vacância automática.
                      </p>
                    </div>
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text-secondary)" }}>
                      {properties.filter((p) => p.ownerId === viewingOwnerDetail.id).length} IMÓVEIS
                    </span>
                  </div>

                  {properties.filter((p) => p.ownerId === viewingOwnerDetail.id).length === 0 ? (
                    <div style={{ padding: "40px", background: "var(--bg-card)", border: "1px dashed var(--border-light)", borderRadius: "12px", textAlign: "center" }}>
                      <p style={{ color: "var(--text-secondary)", fontSize: "14px", marginBottom: "12px" }}>
                        Nenhum imóvel vinculado a este proprietário no momento.
                      </p>
                      <button
                        className="btn-primary"
                        onClick={() => {
                          setFormPropOwnerId(viewingOwnerDetail.id);
                          setIsNewPropertyModalOpen(true);
                        }}
                      >
                        <IconPlus size={15} /> Cadastrar Imóvel para {viewingOwnerDetail.name}
                      </button>
                    </div>
                  ) : (
                    <div className="properties-full-grid">
                      {properties
                        .filter((p) => p.ownerId === viewingOwnerDetail.id)
                        .map((prop) => {
                          const primaryRoom = prop.rooms[0];
                          const roomStatus = primaryRoom
                            ? getRoomLiveStatus(primaryRoom.id, reservations)
                            : { isOccupiedNow: false };

                          return (
                            <div className="airbnb-property-card" key={prop.id}>
                              <div
                                className="prop-img-box"
                                style={{ backgroundImage: `url(${prop.imageUrl || SAMPLE_PHOTOS[0]})` }}
                              >
                                <span className="prop-badge-top-left">{prop.type}</span>
                                <div className="prop-badge-top-right">
                                  <span
                                    className={`status-badge ${
                                      roomStatus.isOccupiedNow ? "occupied" : "available"
                                    }`}
                                  >
                                    {roomStatus.isOccupiedNow ? "🔒 Ocupado Agora" : "✓ Disponível Hoje"}
                                  </span>
                                </div>
                              </div>

                              <div className="prop-card-body">
                                <h3 className="prop-main-title">{prop.name}</h3>
                                <span className="prop-address-text">
                                  <IconMapPin size={13} /> {prop.address}
                                </span>

                                <div className="prop-features-row">
                                  <span><IconUsers size={13} /> {prop.maxGuests || 4} hóspedes</span>
                                  <span><IconBed size={13} /> {prop.bedrooms || 1} quartos</span>
                                </div>

                                {roomStatus.isOccupiedNow && roomStatus.activeReservation && (
                                  <div style={{ background: "rgba(234, 88, 12, 0.1)", color: "#ea580c", padding: "8px 10px", borderRadius: "6px", fontSize: "11.5px" }}>
                                    Hóspede atual: <strong>{roomStatus.activeReservation.guestName}</strong> ({roomStatus.activeReservation.startDate} até {roomStatus.activeReservation.endDate})
                                  </div>
                                )}

                                <div className="prop-price-footer">
                                  <span className="prop-price-val">{formatBRL(prop.basePrice || 250)}</span>
                                  <span className="prop-price-unit">/noite</span>
                                </div>
                              </div>

                              <div className="prop-card-actions">
                                <button
                                  className="btn-reserve-instant"
                                  onClick={() => openQuickReserveModal(prop, primaryRoom)}
                                >
                                  <IconCalendar size={15} /> Reservar Agora
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => openEditPropertyModal(prop)}
                                  title="Editar Configurações do Imóvel"
                                  style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                                >
                                  <IconEdit size={14} />
                                  <span>Editar</span>
                                </button>
                                <button
                                  className="btn-secondary"
                                  onClick={() => handleUnlinkProperty(prop.id)}
                                  title="Desvincular deste proprietário"
                                >
                                  <IconUnlink size={15} />
                                </button>
                                <button
                                  className="btn-danger"
                                  onClick={() => handleDeleteProperty(prop.id)}
                                  title="Excluir imóvel permanentemente"
                                >
                                  <IconTrash size={15} />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              /* LISTAGEM DOS CARDS COMPACTOS DOS PROPRIETÁRIOS */
              <div>
                <div className="page-header">
                  <div>
                    <h1 className="page-title">Proprietários</h1>
                    <p className="page-subtitle">
                      Clique em qualquer card para entrar na aba exclusiva do proprietário e gerenciar seus imóveis.
                    </p>
                  </div>
                  <button
                    className="btn-primary"
                    onClick={() => setIsNewOwnerModalOpen(true)}
                  >
                    <IconPlus size={16} /> Novo Proprietário
                  </button>
                </div>

                <div className="owner-compact-grid">
                  {ownersList.map((owner) => {
                    const ownerProps = properties.filter((p) => p.ownerId === owner.id);
                    const ownerRooms = ownerProps.flatMap((p) => p.rooms);

                    return (
                      <div
                        className="owner-compact-card"
                        key={owner.id}
                        onClick={() => setViewingOwnerDetail(owner)}
                      >
                        <div className="owner-card-window-controls">
                          <div className="owner-card-dots">
                            <span className="mac-dot red" />
                            <span className="mac-dot yellow" />
                            <span className="mac-dot green" />
                          </div>
                          <span className="owner-badge-mini">{ownerProps.length} Imóveis</span>
                        </div>

                        <h3>{owner.name}</h3>
                        <p>{owner.email}</p>

                        <div className="owner-card-stats-row">
                          <span><IconBuilding size={12} /> {ownerProps.length} Imóveis</span>
                          <span><IconBed size={12} /> {ownerRooms.length} Quartos</span>
                        </div>

                        <div className="owner-card-enter-hint">
                          <span>Entrar no Proprietário →</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* =========================================
            TAB: IMÓVEIS (AIRBNB COMPLETO)
           ========================================= */}
        {activeTab === "properties" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Imóveis Cadastrados</h1>
                <p className="page-subtitle">
                  {isAdminOrDev
                    ? "Gerencie os imóveis do Airbnb, vincule ou desvincule proprietários"
                    : "Todos os seus imóveis disponíveis para locação"}
                </p>
              </div>

              {isAdminOrDev && (
                <button
                  id="btn-novo-imovel"
                  className={`btn-primary ${activeTour?.targetElementId === "btn-novo-imovel" ? "tour-spotlight-highlight" : ""}`}
                  onClick={() => {
                    setFormPropOwnerId("");
                    setIsNewPropertyModalOpen(true);
                    if (activeTour?.tourId === "create_property" && activeTour.step === 1) {
                      handleTourStepGoTo(2);
                    }
                  }}
                >
                  <IconPlus size={16} /> Novo Imóvel
                </button>
              )}
            </div>

            {/* BARRA DE FILTROS & BUSCA */}
            <div className="properties-search-bar">
              <div className="filter-pills-row">
                <button
                  className={`filter-pill ${propertyFilter === "all" ? "active" : ""}`}
                  onClick={() => setPropertyFilter("all")}
                >
                  Todos ({properties.length})
                </button>
                {isAdminOrDev && (
                  <>
                    <button
                      className={`filter-pill ${propertyFilter === "assigned" ? "active" : ""}`}
                      onClick={() => setPropertyFilter("assigned")}
                    >
                      Com Proprietário ({properties.filter((p) => p.ownerId).length})
                    </button>
                    <button
                      className={`filter-pill ${propertyFilter === "unassigned" ? "active" : ""}`}
                      onClick={() => setPropertyFilter("unassigned")}
                    >
                      Sem Proprietário ({properties.filter((p) => !p.ownerId).length})
                    </button>
                  </>
                )}
              </div>

              <div className="input-group" style={{ maxWidth: 300 }}>
                <input
                  type="text"
                  placeholder="Buscar por nome ou cidade..."
                  value={propertySearch}
                  onChange={(e) => setPropertySearch(e.target.value)}
                />
              </div>
            </div>

            {/* GRID DE IMÓVEIS AIRBNB */}
            <div className="properties-full-grid">
              {displayedProperties.map((prop) => {
                const isAssigned = !!prop.ownerId && prop.ownerId !== "unassigned";
                const ownerObj = isAssigned ? usersList.find((u) => u.id === prop.ownerId) : null;
                const primaryRoom = prop.rooms[0];
                const roomStatus = primaryRoom
                  ? getRoomLiveStatus(primaryRoom.id, reservations)
                  : { isOccupiedNow: false };

                return (
                  <div className="airbnb-property-card" key={prop.id}>
                    <div
                      className="prop-img-box"
                      style={{ backgroundImage: `url(${prop.imageUrl || SAMPLE_PHOTOS[0]})` }}
                    >
                      <span className="prop-badge-top-left">{prop.type}</span>
                      <div className="prop-badge-top-right">
                        <span className={`owner-pill-badge ${isAssigned ? "assigned" : "unassigned"}`}>
                          {isAssigned ? (ownerObj?.name || "Proprietário") : "⚠️ Sem Proprietário"}
                        </span>
                      </div>
                    </div>

                    <div className="prop-card-body">
                      <h3 className="prop-main-title">{prop.name}</h3>
                      <span className="prop-address-text">
                        <IconMapPin size={13} /> {prop.address} {prop.city ? `• ${prop.city}` : ""}
                      </span>

                      <div className="prop-features-row">
                        <span><IconUsers size={13} /> {prop.maxGuests || 4} hóspedes</span>
                        <span><IconBed size={13} /> {prop.bedrooms || 1} quartos</span>
                        <span
                          className={`status-badge ${
                            roomStatus.isOccupiedNow ? "occupied" : "available"
                          }`}
                        >
                          {roomStatus.isOccupiedNow ? "Ocupado Agora" : "Disponível"}
                        </span>
                      </div>

                      {prop.amenities && prop.amenities.length > 0 && (
                        <div className="prop-amenities-tags">
                          {prop.amenities.slice(0, 3).map((am, i) => (
                            <span className="prop-amenity-tag" key={i}>{am}</span>
                          ))}
                        </div>
                      )}

                      <div className="prop-price-footer">
                        <span className="prop-price-val">{formatBRL(prop.basePrice || 250)}</span>
                        <span className="prop-price-unit">/noite</span>
                      </div>
                    </div>

                    {isAdminOrDev && (
                      <div className="prop-card-actions">
                        <button
                          className="btn-reserve-instant"
                          onClick={() => openQuickReserveModal(prop, primaryRoom)}
                        >
                          <IconCalendar size={15} /> Reservar
                        </button>

                        <button
                          className="btn-secondary"
                          onClick={() => openEditPropertyModal(prop)}
                          title="Editar Configurações do Imóvel"
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <IconEdit size={14} />
                          <span>Editar</span>
                        </button>

                        {prop.airbnbListingUrl && (
                          <a
                            href={prop.airbnbListingUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn-secondary"
                            title="Abrir no Airbnb"
                          >
                            <IconExternalLink size={15} />
                          </a>
                        )}

                        <button
                          id={!isAssigned ? "btn-vincular-dono" : undefined}
                          className={`btn-secondary ${(!isAssigned && activeTour?.targetElementId === "btn-vincular-dono") ? "tour-spotlight-highlight" : ""}`}
                          onClick={() => openAssignOwnerModal(prop)}
                          title={isAssigned ? "Trocar Proprietário" : "Vincular a um Proprietário"}
                          style={{ display: "inline-flex", alignItems: "center", gap: "5px" }}
                        >
                          <IconUsers size={14} />
                          <span>{isAssigned ? "Trocar Dono" : "Vincular"}</span>
                        </button>

                        {isAssigned && (
                          <button
                            className="btn-secondary"
                            onClick={() => handleUnlinkProperty(prop.id)}
                            title="Desvincular proprietário"
                          >
                            <IconUnlink size={15} />
                          </button>
                        )}

                        <button
                          className="btn-danger"
                          onClick={() => handleDeleteProperty(prop.id)}
                          title="Excluir imóvel"
                        >
                          <IconTrash size={15} />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* =========================================
            TAB: CALENDÁRIO / AGENDA DE OCUPAÇÃO
           ========================================= */}
        {activeTab === "calendar" && (
          <CalendarTab
            properties={userProperties}
            reservations={userReservations}
            usersList={usersList}
            currentUser={currentUser}
            isAdmin={isAdminOrDev}
            onOpenQuickReserve={(prop, room, initialDate) => {
              openQuickReserveModal(prop, room, initialDate);
            }}
            onNavigateToReservations={() => setActiveTab("reservations")}
            onUpdateReservationStatus={handleUpdateReservationStatus}
            activeTourElementId={activeTour?.targetElementId}
          />
        )}

        {/* =========================================
            TAB: RESERVAS
           ========================================= */}
        {activeTab === "reservations" && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Reservas</h1>
                <p className="page-subtitle">Acompanhe todas as reservas e bloqueios</p>
              </div>
              <div className="last-updated-badge">
                <span className="pulse-dot" />
                <span>ATUALIZADO: {lastUpdated}</span>
              </div>
            </div>

            <div className="reservations-filter-bar">
              {(["Todas", "Confirmadas", "Pendentes", "Concluídas", "Canceladas"] as const).map(
                (filterKey) => (
                  <button
                    key={filterKey}
                    className={`filter-pill-btn ${
                      reservationFilter === (filterKey === "Confirmadas" ? "Confirmada" : filterKey === "Pendentes" ? "Pendente" : filterKey === "Concluídas" ? "Concluída" : filterKey === "Canceladas" ? "Cancelada" : "Todas")
                        ? "active"
                        : ""
                    }`}
                    onClick={() => {
                      if (filterKey === "Todas") setReservationFilter("Todas");
                      else if (filterKey === "Confirmadas") setReservationFilter("Confirmada");
                      else if (filterKey === "Pendentes") setReservationFilter("Pendente");
                      else if (filterKey === "Concluídas") setReservationFilter("Concluída");
                      else if (filterKey === "Canceladas") setReservationFilter("Cancelada");
                    }}
                  >
                    {filterKey}
                  </button>
                )
              )}
            </div>

            <div className="reservations-grid">
              {displayedReservations.map((res) => (
                <div className="res-card" key={res.id}>
                  <div className="res-card-top">
                    <div>
                      <h4 className="res-guest-name">{res.guestName}</h4>
                      <span className="res-prop-name">{res.propertyName} • {res.roomName}</span>
                    </div>
                    <span className={`status-badge ${res.status === "Confirmada" ? "confirmed" : res.status === "Pendente" ? "pending" : "completed"}`}>
                      {res.status}
                    </span>
                  </div>

                  <div className="res-dates-row">
                    <span className="res-dates-text">
                      {res.startDate} → {res.endDate}
                    </span>
                    <span className="res-nights-pill">{res.nights} noites</span>
                  </div>

                  <div className="res-card-footer">
                    <span className="res-amount">{formatBRL(res.totalAmount)}</span>
                    <span className="res-channel-tag">{res.channel}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* =========================================
            TAB: CONFIGURAÇÕES & AIRBNB
           ========================================= */}
        {activeTab === "settings" && isAdmin && (
          <div>
            <div className="page-header">
              <div>
                <h1 className="page-title">Configurações & Conexão Airbnb</h1>
                <p className="page-subtitle">Sincronização de dados, relatórios e integrações</p>
              </div>
            </div>

            {/* MEU PERFIL & ALTERAR SENHA */}
            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "12px", padding: "24px", maxWidth: "800px", marginBottom: "20px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
                <div>
                  <h2 style={{ fontSize: "16px", fontWeight: "700", margin: 0 }}>
                    Meu Perfil & Alterar Senha
                  </h2>
                  <p style={{ fontSize: "13px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Atualize seu nome de exibição e altere sua senha de acesso no banco de dados.
                  </p>
                </div>
                {currentUser && (
                  <button
                    className="btn-primary"
                    onClick={() => openEditUserModal(currentUser)}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
                  >
                    <IconEdit size={15} /> Editar Meus Dados / Senha
                  </button>
                )}
              </div>

              {currentUser && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>Nome Atual</span>
                    <strong style={{ fontSize: "14px" }}>{currentUser.name}</strong>
                  </div>
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>E-mail / Login</span>
                    <strong style={{ fontSize: "14px" }}>{currentUser.email}</strong>
                  </div>
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>Usuário</span>
                    <strong style={{ fontSize: "14px" }}>{currentUser.username || currentUser.email}</strong>
                  </div>
                  <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)", display: "block" }}>Senha Atual</span>
                    <strong style={{ fontSize: "14px", color: "#10b981" }}>{currentUser.password || "••••••"}</strong>
                  </div>
                </div>
              )}
            </div>

            <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-light)", borderRadius: "12px", padding: "24px", maxWidth: "800px" }}>
              <h2 style={{ fontSize: "16px", fontWeight: "700", marginBottom: "12px" }}>
                Como Funciona a Conexão Real com o Airbnb
              </h2>
              <p style={{ fontSize: "13.5px", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "16px" }}>
                O Airbnb possui três formas principais de sincronização com dashboards externos:
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <div style={{ padding: "14px", background: "var(--bg-app)", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "14px" }}>1. Sincronização iCal (.ics) — Gratuita e Instantânea</strong>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    Você copia o link de exportação de calendário do Airbnb e cola no imóvel. O sistema lê as datas reservadas sem expor sua senha.
                  </p>
                </div>

                <div style={{ padding: "14px", background: "var(--bg-app)", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "14px" }}>2. Importação de Relatório CSV</strong>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    No painel do Airbnb, acesse <em>Ganhos &gt; Histórico de Transações &gt; Baixar CSV</em>. O sistema grava os valores líquidos e confirmações no Firebase.
                  </p>
                </div>

                <div style={{ padding: "14px", background: "var(--bg-app)", borderRadius: "8px" }}>
                  <strong style={{ fontSize: "14px" }}>3. API Oficial de PMS (Channel Manager)</strong>
                  <p style={{ fontSize: "12.5px", color: "var(--text-secondary)", marginTop: "4px" }}>
                    O Airbnb exige certificação de parceiro para chamadas diretas REST. Serviços de ponte como Beds24 fornecem API pronta a partir de R$ 6 por mês por anúncio.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================
            TAB: CONSOLE DEV & BANCO DE DADOS
           ========================================= */}
        {activeTab === "dev" && isDev && (
          <DevTab
            currentUser={currentUser}
            usersList={usersList}
            properties={properties}
            reservations={reservations}
            logs={logs}
            onRefreshLogs={() => {
              setLogs([...loadLocalLogs()]);
              showToast("Logs atualizados com sucesso.");
            }}
            onClearLogs={() => {
              clearLocalLogs();
              setLogs([]);
            }}
            onCreateUser={handleDevCreateUser}
            onUpdateUser={handleDevUpdateUser}
            onDeleteUser={handleDevDeleteUser}
            onCreateRoom={handleDevCreateRoom}
            onUpdateRoom={handleDevUpdateRoom}
            onDeleteRoom={handleDevDeleteRoom}
            onAssignPropertyOwner={handleDevAssignPropertyOwner}
            onResetUsers={handleDevResetUsers}
            onResetReservations={handleDevResetReservations}
            onResetProperties={handleDevResetProperties}
            onFullFactoryReset={handleDevFullFactoryReset}
            onImportBackup={handleDevImportBackup}
            showToast={showToast}
            getPrettyAppOrigin={getPrettyAppOrigin}
          />
        )}

        {/* =========================================
            TAB: WIKI / MANUAL OPERACIONAL PASSO A PASSO
           ========================================= */}
        {activeTab === "wiki" && isAdminOrDev && (
          <WikiTab
            onStartInteractiveTour={handleStartInteractiveTour}
            getPrettyAppOrigin={getPrettyAppOrigin}
            isDev={isDev}
          />
        )}
      </main>

      {/* =========================================
          MODAL: VINCULAR RESERVA NO IMÓVEL (CLIENTE, DATAS & 2 STATUS)
         ========================================= */}
      {isQuickReserveModalOpen && targetReserveProperty && (
        <div className="modal-overlay" onClick={() => setIsQuickReserveModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>+ Vincular Reserva no Imóvel</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Defina o imóvel, cômodo, cliente, período e o status de confirmação
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsQuickReserveModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveQuickReserve}>
              <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* 1. SELEÇÃO DO IMÓVEL */}
                <label className="form-label">
                  Selecione o Imóvel Vinculado
                  <select
                    className="form-select"
                    value={targetReserveProperty.id}
                    onChange={(e) => {
                      const found = properties.find((p) => p.id === e.target.value);
                      if (found) {
                        setTargetReserveProperty(found);
                        setTargetReserveRoom(found.rooms && found.rooms.length > 0 ? found.rooms[0] : null);
                      }
                    }}
                    required
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.type})
                      </option>
                    ))}
                  </select>
                </label>

                {/* 2. SELEÇÃO DO CÔMODO SE HOUVER */}
                {targetReserveProperty.rooms && targetReserveProperty.rooms.length > 0 && (
                  <label className="form-label">
                    Cômodo / Acomodação
                    <select
                      className="form-select"
                      value={targetReserveRoom?.id || targetReserveProperty.rooms[0].id}
                      onChange={(e) => {
                        const r = targetReserveProperty.rooms.find((rm) => rm.id === e.target.value);
                        if (r) setTargetReserveRoom(r);
                      }}
                    >
                      {targetReserveProperty.rooms.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name} — Diária: {formatBRL(r.pricePerNight)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                {/* 3. NOME DO CLIENTE */}
                <label className="form-label">
                  Nome do Hóspede / Cliente
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Nome completo do cliente"
                    value={reserveGuestName}
                    onChange={(e) => setReserveGuestName(e.target.value)}
                    required
                    autoFocus
                  />
                </label>

                {/* 4. DATAS: CHECK-IN E CHECK-OUT */}
                <div className="form-row">
                  <label className="form-label">
                    Data de Check-in
                    <input
                      className="form-input"
                      type="date"
                      value={reserveStartDate}
                      onChange={(e) => setReserveStartDate(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-label">
                    Data de Check-out
                    <input
                      className="form-input"
                      type="date"
                      value={reserveEndDate}
                      onChange={(e) => setReserveEndDate(e.target.value)}
                      required
                    />
                  </label>
                </div>

                {/* 5. SELEÇÃO DOS 2 STATUS: CONFIRMADA x PENDENTE DA CONFIRMAÇÃO */}
                <div>
                  <label className="form-label" style={{ marginBottom: "6px" }}>
                    Status da Reserva na Agenda (2 Cores):
                  </label>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      onClick={() => setReserveStatus("Confirmada")}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: reserveStatus === "Confirmada" ? "2px solid #10b981" : "1px solid var(--border-light)",
                        background: reserveStatus === "Confirmada" ? "rgba(16, 185, 129, 0.18)" : "var(--bg-card)",
                        color: reserveStatus === "Confirmada" ? "#10b981" : "var(--text-primary)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🟢 Confirmada</span>
                      {reserveStatus === "Confirmada" && <span style={{ fontSize: "10px", background: "#10b981", color: "#fff", padding: "1px 6px", borderRadius: "4px" }}>Ativo</span>}
                    </button>

                    <button
                      type="button"
                      onClick={() => setReserveStatus("Pendente")}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: reserveStatus === "Pendente" ? "2px solid #f59e0b" : "1px solid var(--border-light)",
                        background: reserveStatus === "Pendente" ? "rgba(245, 158, 11, 0.18)" : "var(--bg-card)",
                        color: reserveStatus === "Pendente" ? "#f59e0b" : "var(--text-primary)",
                        fontWeight: "700",
                        fontSize: "13px",
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "6px",
                      }}
                    >
                      <span>🟡 Pendente</span>
                      {reserveStatus === "Pendente" && <span style={{ fontSize: "10px", background: "#f59e0b", color: "#fff", padding: "1px 6px", borderRadius: "4px" }}>Ativo</span>}
                    </button>
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)", marginTop: "4px", display: "block" }}>
                    {reserveStatus === "Confirmada"
                      ? "🟢 Aparecerá em verde na agenda como reserva garantida."
                      : "🟡 Aparecerá em amarelo/laranja na agenda como aguardando confirmação (o admin pode confirmar depois)."}
                  </span>
                </div>

                <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  💡 <strong>Automação de Disponibilidade:</strong> Durante o período informado, o imóvel será marcado como <strong>Ocupado Agora</strong>. Assim que a data de check-out expirar, ele volta a ficar <strong>Disponível Hoje</strong> automaticamente.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsQuickReserveModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ padding: "10px 20px" }}>
                  Confirmar e Vincular Reserva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: NOVO IMÓVEL COMPLETO COM AIRBNB
         ========================================= */}
      {isNewPropertyModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewPropertyModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 650 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadastrar Imóvel (Airbnb)</h3>
              <button className="modal-close-btn" onClick={() => setIsNewPropertyModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateProperty}>
              <div className="modal-body">
                <label id="tour-field-prop-name" className={`form-label ${activeTour?.targetElementId === "tour-field-prop-name" ? "tour-spotlight-highlight" : ""}`}>
                  Título / Nome do Imóvel no Airbnb
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: Apartamento Copacabana com Vista Panorâmica"
                    value={formPropName}
                    onChange={(e) => setFormPropName(e.target.value)}
                    required
                  />
                </label>

                <div id="tour-field-prop-type" className={`form-row ${activeTour?.targetElementId === "tour-field-prop-type" ? "tour-spotlight-highlight" : ""}`}>
                  <label className="form-label">
                    Tipo de Imóvel
                    <select
                      className="form-select"
                      value={formPropType}
                      onChange={(e) => setFormPropType(e.target.value as PropertyType)}
                    >
                      <option value="APARTAMENTO">Apartamento</option>
                      <option value="CASA">Casa</option>
                      <option value="STUDIO">Studio / Flat</option>
                      <option value="CHALÉ">Chalé / Cabana</option>
                      <option value="COBERTURA">Cobertura</option>
                    </select>
                  </label>

                  <label className="form-label">
                    Vincular a um Proprietário
                    <select
                      className="form-select"
                      value={formPropOwnerId}
                      onChange={(e) => setFormPropOwnerId(e.target.value)}
                    >
                      <option value="">⚠️ Sem Proprietário (Vincular Depois)</option>
                      {ownersList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.email})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div id="tour-field-prop-address" className={`form-row ${activeTour?.targetElementId === "tour-field-prop-address" ? "tour-spotlight-highlight" : ""}`}>
                  <label className="form-label">
                    Endereço Completo
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Rua, Número, Bairro"
                      value={formPropAddress}
                      onChange={(e) => setFormPropAddress(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-label">
                    Cidade / UF
                    <input
                      className="form-input"
                      type="text"
                      placeholder="São Paulo, SP"
                      value={formPropCity}
                      onChange={(e) => setFormPropCity(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="form-label">
                    Link do Anúncio no Airbnb (URL)
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://www.airbnb.com.br/rooms/123456"
                      value={formPropUrl}
                      onChange={(e) => setFormPropUrl(e.target.value)}
                    />
                  </label>

                  <label className="form-label">
                    ID / Código do Anúncio Airbnb
                    <input
                      className="form-input"
                      type="text"
                      placeholder="123456"
                      value={formPropListingId}
                      onChange={(e) => setFormPropListingId(e.target.value)}
                    />
                  </label>
                </div>

                <div id="tour-field-prop-pricing" className={`form-row-3 ${activeTour?.targetElementId === "tour-field-prop-pricing" ? "tour-spotlight-highlight" : ""}`}>
                  <label className="form-label">
                    Diária Base (R$)
                    <input
                      className="form-input"
                      type="number"
                      placeholder="280"
                      value={formPropPrice}
                      onChange={(e) => setFormPropPrice(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Hóspedes Máx.
                    <input
                      className="form-input"
                      type="number"
                      placeholder="4"
                      value={formPropGuests}
                      onChange={(e) => setFormPropGuests(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Quartos
                    <input
                      className="form-input"
                      type="number"
                      placeholder="2"
                      value={formPropBedrooms}
                      onChange={(e) => setFormPropBedrooms(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Banheiros
                    <input
                      className="form-input"
                      type="number"
                      placeholder="1"
                      value={formPropBathrooms}
                      onChange={(e) => setFormPropBathrooms(Number(e.target.value))}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                    <label className="form-label" style={{ marginBottom: 0, fontWeight: "600" }}>
                      Foto de Capa (Link Direto da Imagem)
                    </label>
                    <a
                      href="https://postimages.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        padding: "5px 11px",
                        background: "rgba(37, 99, 235, 0.08)",
                        color: "#2563eb",
                        border: "1px solid rgba(37, 99, 235, 0.25)",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                      title="Clique para abrir o PostImages em uma nova aba e hospedar fotos gratuitamente"
                    >
                      <span>📷 Abrir gerador PostImages ↗</span>
                    </a>
                  </div>

                  <input
                    className="form-input"
                    type="url"
                    placeholder="Ex: https://i.postimg.cc/.../foto.jpg"
                    value={formPropImg}
                    onChange={(e) => setFormPropImg(e.target.value)}
                  />

                  <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", marginTop: "4px", marginBottom: "8px" }}>
                    💡 <strong>Como usar:</strong> No PostImages, faça upload da foto e copie o <strong>"Link direto"</strong> (ex: com final <code>.jpg</code> ou <code>.png</code>).
                  </p>

                  {formPropImg.trim() && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <img
                        src={formPropImg.trim()}
                        alt="Prévia do Imóvel"
                        style={{
                          width: "72px",
                          height: "52px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid var(--border-light)",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = SAMPLE_PHOTOS[0];
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                          ✓ Imagem carregada com sucesso
                        </span>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0 0" }}>
                          {formPropImg}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setFormPropImg("")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--color-danger, #ef4444)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          padding: "4px 8px",
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                <label className="form-label">
                  Comodidades (Separadas por vírgula)
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Wi-Fi, Ar-condicionado, Piscina, Estacionamento"
                    value={formPropAmenities}
                    onChange={(e) => setFormPropAmenities(e.target.value)}
                  />
                </label>

                <label className="form-label">
                  Link iCal do Calendário Airbnb (Opcional)
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://www.airbnb.com.br/calendar/ical/..."
                    value={formPropIcal}
                    onChange={(e) => setFormPropIcal(e.target.value)}
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewPropertyModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  id="tour-btn-save-prop"
                  type="submit"
                  className={`btn-primary ${activeTour?.targetElementId === "tour-btn-save-prop" ? "tour-spotlight-highlight" : ""}`}
                >
                  Salvar Imóvel no Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: NOVO PROPRIETÁRIO
         ========================================= */}
      {isNewOwnerModalOpen && (
        <div className="modal-overlay" onClick={() => setIsNewOwnerModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Cadastrar Novo Proprietário</h3>
              <button className="modal-close-btn" onClick={() => setIsNewOwnerModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateOwner}>
              <div className="modal-body">
                <label className="form-label">
                  Nome Completo
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: Carlos Eduardo"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  Usuário de Login (Username)
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: carloseduardo"
                    value={newOwnerUsername}
                    onChange={(e) => setNewOwnerUsername(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  E-mail do Proprietário
                  <input
                    className="form-input"
                    type="email"
                    placeholder="carlos@exemplo.com"
                    value={newOwnerEmail}
                    onChange={(e) => setNewOwnerEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  Senha de Acesso
                  <input
                    className="form-input"
                    type="password"
                    placeholder="Defina uma senha segura"
                    value={newOwnerPassword}
                    onChange={(e) => setNewOwnerPassword(e.target.value)}
                    required
                  />
                </label>

                <div style={{ padding: "12px", background: "var(--bg-app)", borderRadius: "8px", fontSize: "12px", color: "var(--text-secondary)" }}>
                  🔐 <strong>Gravado no Banco:</strong> O proprietário utilizará este usuário e senha na tela de login para acessar exclusivamente os imóveis dele.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsNewOwnerModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Cadastrar Proprietário
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: EDITAR CONFIGURAÇÕES DO IMÓVEL
         ========================================= */}
      {isEditPropertyModalOpen && editingProperty && (
        <div className="modal-overlay" onClick={() => setIsEditPropertyModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>⚙️ Configurações do Imóvel</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {editingProperty.name}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditPropertyModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditProperty}>
              <div className="modal-body">
                <label className="form-label">
                  Título / Nome do Imóvel no Airbnb
                  <input
                    className="form-input"
                    type="text"
                    value={editPropName}
                    onChange={(e) => setEditPropName(e.target.value)}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="form-label">
                    Tipo de Imóvel
                    <select
                      className="form-select"
                      value={editPropType}
                      onChange={(e) => setEditPropType(e.target.value as PropertyType)}
                    >
                      <option value="APARTAMENTO">Apartamento</option>
                      <option value="CASA">Casa</option>
                      <option value="STUDIO">Studio / Flat</option>
                      <option value="CHALÉ">Chalé / Cabana</option>
                      <option value="COBERTURA">Cobertura</option>
                    </select>
                  </label>

                  <label className="form-label">
                    Proprietário Vinculado
                    <select
                      className="form-select"
                      value={editPropOwnerId}
                      onChange={(e) => setEditPropOwnerId(e.target.value)}
                    >
                      <option value="">⚠️ Sem Proprietário (Gestão Própria)</option>
                      {ownersList.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.email})
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label className="form-label">
                    Endereço Completo
                    <input
                      className="form-input"
                      type="text"
                      value={editPropAddress}
                      onChange={(e) => setEditPropAddress(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-label">
                    Cidade / UF
                    <input
                      className="form-input"
                      type="text"
                      value={editPropCity}
                      onChange={(e) => setEditPropCity(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row">
                  <label className="form-label">
                    Link do Anúncio no Airbnb (URL)
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://www.airbnb.com.br/rooms/123456"
                      value={editPropUrl}
                      onChange={(e) => setEditPropUrl(e.target.value)}
                    />
                  </label>

                  <label className="form-label">
                    ID / Código do Anúncio Airbnb
                    <input
                      className="form-input"
                      type="text"
                      placeholder="123456"
                      value={editPropListingId}
                      onChange={(e) => setEditPropListingId(e.target.value)}
                    />
                  </label>
                </div>

                <div className="form-row-3">
                  <label className="form-label">
                    Diária Base (R$)
                    <input
                      className="form-input"
                      type="number"
                      value={editPropPrice}
                      onChange={(e) => setEditPropPrice(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Hóspedes Máx.
                    <input
                      className="form-input"
                      type="number"
                      value={editPropGuests}
                      onChange={(e) => setEditPropGuests(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Quartos
                    <input
                      className="form-input"
                      type="number"
                      value={editPropBedrooms}
                      onChange={(e) => setEditPropBedrooms(Number(e.target.value))}
                    />
                  </label>

                  <label className="form-label">
                    Banheiros
                    <input
                      className="form-input"
                      type="number"
                      value={editPropBathrooms}
                      onChange={(e) => setEditPropBathrooms(Number(e.target.value))}
                    />
                  </label>
                </div>

                <div style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px", flexWrap: "wrap", gap: "6px" }}>
                    <label className="form-label" style={{ marginBottom: 0, fontWeight: "600" }}>
                      Foto de Capa (Link Direto da Imagem)
                    </label>
                    <a
                      href="https://postimages.org/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        padding: "5px 11px",
                        background: "rgba(37, 99, 235, 0.08)",
                        color: "#2563eb",
                        border: "1px solid rgba(37, 99, 235, 0.25)",
                        borderRadius: "8px",
                        textDecoration: "none",
                        fontWeight: "600",
                        cursor: "pointer"
                      }}
                      title="Clique para abrir o PostImages e hospedar fotos"
                    >
                      <span>📷 Abrir gerador PostImages ↗</span>
                    </a>
                  </div>

                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://i.postimg.cc/.../foto.jpg"
                    value={editPropImg}
                    onChange={(e) => setEditPropImg(e.target.value)}
                  />

                  {editPropImg.trim() && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 12px",
                        background: "var(--bg-card)",
                        border: "1px solid var(--border-light)",
                        borderRadius: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      <img
                        src={editPropImg.trim()}
                        alt="Prévia do Imóvel"
                        style={{
                          width: "72px",
                          height: "52px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid var(--border-light)",
                          flexShrink: 0,
                        }}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = SAMPLE_PHOTOS[0];
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: "12px", color: "var(--color-success)", fontWeight: "600" }}>
                          ✓ Prévia da Foto Atualizada
                        </span>
                        <p style={{ fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", margin: "2px 0 0 0" }}>
                          {editPropImg}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditPropImg("")}
                        style={{
                          background: "transparent",
                          border: "none",
                          color: "var(--color-danger, #ef4444)",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                        }}
                      >
                        Limpar
                      </button>
                    </div>
                  )}
                </div>

                <label className="form-label">
                  Comodidades (Separadas por vírgula)
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Wi-Fi, Ar-condicionado, Piscina, Estacionamento"
                    value={editPropAmenities}
                    onChange={(e) => setEditPropAmenities(e.target.value)}
                  />
                </label>

                <label className="form-label">
                  Link iCal do Calendário Airbnb (Sincronização Automática)
                  <input
                    className="form-input"
                    type="url"
                    placeholder="https://www.airbnb.com.br/calendar/ical/..."
                    value={editPropIcal}
                    onChange={(e) => setEditPropIcal(e.target.value)}
                  />
                </label>

                {/* Exibição dos Cômodos / Quartos Cadastrados */}
                {editingProperty.rooms && editingProperty.rooms.length > 0 && (
                  <div style={{ marginTop: "12px", padding: "12px", background: "var(--bg-app)", borderRadius: "8px" }}>
                    <span style={{ fontSize: "12px", fontWeight: "700", display: "block", marginBottom: "6px" }}>
                      🛏️ Cômodos Cadastrados ({editingProperty.rooms.length}):
                    </span>
                    <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                      {editingProperty.rooms.map((room) => (
                        <div key={room.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", padding: "6px 10px", background: "var(--bg-card)", borderRadius: "6px", border: "1px solid var(--border-light)" }}>
                          <span><strong>{room.name}</strong> ({room.status})</span>
                          <span style={{ color: "var(--color-success)", fontWeight: "600" }}>{formatBRL(room.pricePerNight)}/noite</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditPropertyModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Alterações no Firebase
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: EDITAR USUÁRIO (NOME E SENHA)
         ========================================= */}
      {isEditUserModalOpen && editingUser && (
        <div className="modal-overlay" onClick={() => setIsEditUserModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>👤 Editar Usuário & Senha</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  {editingUser.name} ({editingUser.role.toUpperCase()})
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsEditUserModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser}>
              <div className="modal-body">
                <label className="form-label">
                  Nome Completo
                  <input
                    className="form-input"
                    type="text"
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  Nome de Usuário (Username para Login)
                  <input
                    className="form-input"
                    type="text"
                    value={editUserUsername}
                    onChange={(e) => setEditUserUsername(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  E-mail de Cadastro
                  <input
                    className="form-input"
                    type="email"
                    value={editUserEmail}
                    onChange={(e) => setEditUserEmail(e.target.value)}
                    required
                  />
                </label>

                <label className="form-label">
                  Senha de Acesso no Banco de Dados
                  <input
                    className="form-input"
                    type="text"
                    value={editUserPassword}
                    onChange={(e) => setEditUserPassword(e.target.value)}
                    placeholder="Digite a nova senha"
                    required
                  />
                </label>

                <div style={{ padding: "12px", background: "rgba(16, 185, 129, 0.1)", borderRadius: "8px", fontSize: "12px", color: "#047857", border: "1px solid rgba(16, 185, 129, 0.25)" }}>
                  🔐 <strong>Senha Salva no Firestore:</strong> Ao salvar, o usuário poderá se autenticar imediatamente com essa nova senha.
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsEditUserModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL / CARD NO MEIO: VINCULAR IMÓVEL AO PROPRIETÁRIO
         ========================================= */}
      {isAssignOwnerModalOpen && targetAssignProperty && (
        <div className="modal-overlay" onClick={() => setIsAssignOwnerModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Vincular Imóvel ao Proprietário</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Escolha o proprietário que gerenciará este anúncio
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsAssignOwnerModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <div className="modal-body">
              {/* Preview do Imóvel Selecionado */}
              <div className="prop-preview-box">
                <div
                  className="prop-preview-thumb"
                  style={{ backgroundImage: `url(${targetAssignProperty.imageUrl || SAMPLE_PHOTOS[0]})` }}
                />
                <div className="prop-preview-info">
                  <h4>{targetAssignProperty.name}</h4>
                  <p>{targetAssignProperty.address} • {targetAssignProperty.type}</p>
                  <span style={{ fontSize: "11px", fontWeight: "600", color: targetAssignProperty.ownerId ? "#15803d" : "#b45309" }}>
                    Status atual: {targetAssignProperty.ownerId ? (usersList.find((u) => u.id === targetAssignProperty.ownerId)?.name || "Vinculado") : "⚠️ Sem Proprietário"}
                  </span>
                </div>
              </div>

              <div style={{ marginTop: "8px", marginBottom: "4px" }}>
                <span style={{ fontSize: "13px", fontWeight: "700" }}>Selecione o Proprietário:</span>
              </div>

              {/* Lista em Cards no Meio para Escolher o Proprietário */}
              <div className="owner-select-card-list">
                {ownersList.map((owner) => {
                  const isSelected = selectedAssignOwnerId === owner.id;
                  const ownerPropCount = properties.filter((p) => p.ownerId === owner.id).length;

                  return (
                    <div
                      key={owner.id}
                      className={`owner-pick-card ${isSelected ? "selected" : ""}`}
                      onClick={() => setSelectedAssignOwnerId(owner.id)}
                    >
                      <div className="owner-pick-left">
                        <div className="owner-pick-avatar">{owner.name.charAt(0)}</div>
                        <div className="owner-pick-details">
                          <h5>{owner.name}</h5>
                          <p>{owner.email}</p>
                        </div>
                      </div>

                      <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                        <span className="owner-pick-badge">{ownerPropCount} imóvel(is)</span>
                        <div className="owner-pick-check">
                          <IconCheck size={14} />
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Opção para Deixar Sem Proprietário */}
                <div
                  className={`owner-pick-card ${selectedAssignOwnerId === "" ? "selected" : ""}`}
                  onClick={() => setSelectedAssignOwnerId("")}
                >
                  <div className="owner-pick-left">
                    <div
                      className="owner-pick-avatar"
                      style={{ background: "#fef3c7", color: "#b45309" }}
                    >
                      ⚠️
                    </div>
                    <div className="owner-pick-details">
                      <h5>Nenhum (Deixar Sem Proprietário)</h5>
                      <p>O anúncio ficará disponível para vínculo futuro</p>
                    </div>
                  </div>

                  <div className="owner-pick-check">
                    <IconCheck size={14} />
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsAssignOwnerModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={handleConfirmAssignOwner}
              >
                Confirmar Vínculo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          MODAL: VINCULAR IMÓVEL EXISTENTE AO PROPRIETÁRIO SELECIONADO
         ========================================= */}
      {isPickUnassignedModalOpen && viewingOwnerDetail && (
        <div className="modal-overlay" onClick={() => setIsPickUnassignedModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>Vincular Imóvel a {viewingOwnerDetail.name}</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Selecione um imóvel existente para atribuir a este proprietário
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsPickUnassignedModalOpen(false)}>
                <IconClose size={18} />
              </button>
            </div>

            <div className="modal-body">
              {properties.filter((p) => p.ownerId !== viewingOwnerDetail.id).length === 0 ? (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--text-secondary)", fontSize: "13px" }}>
                  Todos os imóveis cadastrados já pertencem a este proprietário.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {properties
                    .filter((p) => p.ownerId !== viewingOwnerDetail.id)
                    .map((prop) => (
                      <div
                        key={prop.id}
                        className="prop-preview-box"
                        style={{ justifyContent: "space-between", cursor: "pointer" }}
                        onClick={() => handleAssignSpecificPropertyToOwner(prop.id, viewingOwnerDetail.id)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                          <div
                            className="prop-preview-thumb"
                            style={{ backgroundImage: `url(${prop.imageUrl || SAMPLE_PHOTOS[0]})` }}
                          />
                          <div className="prop-preview-info">
                            <h4>{prop.name}</h4>
                            <p>{prop.address} • {formatBRL(prop.basePrice || 250)}/noite</p>
                            <span style={{ fontSize: "11px", color: prop.ownerId ? "var(--text-secondary)" : "#b45309", fontWeight: "600" }}>
                              {prop.ownerId ? `Dono atual: ${usersList.find((u) => u.id === prop.ownerId)?.name || "Outro"}` : "⚠️ Sem Proprietário"}
                            </span>
                          </div>
                        </div>

                        <button className="btn-primary" style={{ padding: "6px 12px", fontSize: "12px" }}>
                          Vincular
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsPickUnassignedModalOpen(false)}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================
          GUIA INTERATIVO PRÁTICO (WIKI TOUR OVERLAY)
         ========================================= */}
      {activeTour && (
        <div className="tour-floating-guide animate-slide-up">
          <div className="tour-guide-badge">
            <span className="tour-beacon-dot" />
            <span>GUIA INTERATIVO PRÁTICO • PASSO {activeTour.step} DE {activeTour.totalSteps || 6}</span>
          </div>
          <div className="tour-guide-content">
            <h4 className="tour-guide-title">{activeTour.title}</h4>
            <p className="tour-guide-desc">{activeTour.description}</p>
            <div className="tour-guide-hint">
              👉 <strong>Ação Prática:</strong> {activeTour.actionHint}
            </div>
          </div>
          <div className="tour-guide-actions">
            {activeTour.step > 1 && (
              <button
                type="button"
                className="btn-tour-step"
                onClick={handleTourPrevStep}
              >
                ⬅ Voltar Passo
              </button>
            )}
            {activeTour.step < (activeTour.totalSteps || 6) && (
              <button
                type="button"
                className="btn-tour-step-primary"
                onClick={handleTourNextStep}
              >
                Próximo Passo ➡
              </button>
            )}
            <button
              type="button"
              className="btn-tour-wiki"
              onClick={() => {
                setActiveTab("wiki");
                setActiveTour(null);
              }}
            >
              📚 Voltar à Wiki
            </button>
            <button
              type="button"
              className="btn-tour-close"
              onClick={() => setActiveTour(null)}
              title="Encerrar treinamento"
            >
              ✕ Sair
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
