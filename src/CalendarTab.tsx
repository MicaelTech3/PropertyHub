import { useState, useMemo, useEffect } from "react";
import type { Property, Room, Reservation, User, ReservationStatus } from "./App";

interface CalendarTabProps {
  properties: Property[];
  reservations: Reservation[];
  usersList: User[];
  currentUser: User | null;
  isAdmin: boolean;
  onOpenQuickReserve: (property: Property, room?: Room, initialDate?: Date) => void;
  onNavigateToReservations: () => void;
  onUpdateReservationStatus?: (reservationId: string, newStatus: ReservationStatus) => Promise<void>;
  activeTourElementId?: string;
}

// ===========================================================
// FERIADOS BRASILEIROS
// Retorna: { name: string; type: "nacional" | "facultativo" | "estadual" } | null
// ===========================================================
interface HolidayInfo {
  name: string;
  type: "nacional" | "facultativo" | "estadual";
}

/** Feriados fixos nacionais brasileiros (dia/mês) */
const FIXED_HOLIDAYS: Record<string, HolidayInfo> = {
  "01-01": { name: "Confraternização Universal (Ano Novo)", type: "nacional" },
  "21-04": { name: "Tiradentes", type: "nacional" },
  "01-05": { name: "Dia do Trabalho", type: "nacional" },
  "07-09": { name: "Independência do Brasil", type: "nacional" },
  "12-10": { name: "Nossa Sra. Aparecida (Padroeira do Brasil)", type: "nacional" },
  "02-11": { name: "Finados", type: "nacional" },
  "15-11": { name: "Proclamação da República", type: "nacional" },
  "20-11": { name: "Consciência Negra", type: "nacional" },
  "25-12": { name: "Natal", type: "nacional" },
  "24-12": { name: "Véspera de Natal", type: "facultativo" },
  "31-12": { name: "Réveillon", type: "facultativo" },
  "02-01": { name: "Início de Ano (facultativo)", type: "facultativo" },
};

/** Calcula Páscoa (algoritmo de Butcher) */
function getEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31) - 1;
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(year, month, day);
}

/** Retorna informações do feriado para uma data (ou null se não for feriado) */
export function getHolidayInfo(date: Date): HolidayInfo | null {
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const key = `${day}-${month}`;

  if (FIXED_HOLIDAYS[key]) return FIXED_HOLIDAYS[key];

  // Feriados móveis baseados na Páscoa
  const year = date.getFullYear();
  const easter = getEaster(year);
  const easterTime = easter.getTime();
  const dateTime = new Date(year, date.getMonth(), date.getDate()).getTime();

  const diffDays = Math.round((dateTime - easterTime) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { name: "Páscoa", type: "nacional" };
  if (diffDays === -2) return { name: "Sexta-Feira Santa", type: "nacional" };
  if (diffDays === -47) return { name: "Carnaval (2º dia)", type: "facultativo" };
  if (diffDays === -48) return { name: "Carnaval (1º dia)", type: "facultativo" };
  if (diffDays === 60) return { name: "Corpus Christi", type: "facultativo" };

  return null;
}

// Formata Moeda BRL
const formatCurrency = (val: number) => {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(val || 0);
};

// Conversor de data flexível para objeto Date (às 00:00:00 local)
export function parseFlexibleDate(dateStr: string): Date | null {
  if (!dateStr) return null;
  const str = dateStr.trim();
  if (str.includes("-")) {
    const p = str.split("-");
    if (p.length === 3) {
      const year = parseInt(p[0], 10);
      const month = parseInt(p[1], 10) - 1;
      const day = parseInt(p[2], 10);
      return new Date(year, month, day);
    }
  }
  if (str.includes("/")) {
    const p = str.split("/");
    if (p.length === 3) {
      const day = parseInt(p[0], 10);
      const month = parseInt(p[1], 10) - 1;
      let year = parseInt(p[2], 10);
      if (year < 100) year += 2000;
      return new Date(year, month, day);
    }
  }
  const timestamp = Date.parse(str);
  if (!isNaN(timestamp)) {
    const d = new Date(timestamp);
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  return null;
}

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const WEEKDAY_NAMES = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

// Cores e estilos por canal
export function getChannelColor(channel: Reservation["channel"]) {
  switch (channel) {
    case "Airbnb":
      return {
        bg: "rgba(255, 56, 92, 0.12)",
        border: "#ff385c",
        text: "#e00b41",
        badgeBg: "#ff385c",
        badgeText: "#ffffff",
      };
    case "Booking":
      return {
        bg: "rgba(0, 53, 128, 0.12)",
        border: "#003580",
        text: "#003580",
        badgeBg: "#003580",
        badgeText: "#ffffff",
      };
    case "Direto":
      return {
        bg: "rgba(16, 185, 129, 0.12)",
        border: "#10b981",
        text: "#047857",
        badgeBg: "#10b981",
        badgeText: "#ffffff",
      };
    case "Bloqueio Manual":
      return {
        bg: "rgba(245, 158, 11, 0.14)",
        border: "#f59e0b",
        text: "#b45309",
        badgeBg: "#f59e0b",
        badgeText: "#ffffff",
      };
    default:
      return {
        bg: "rgba(100, 116, 139, 0.12)",
        border: "#64748b",
        text: "#475569",
        badgeBg: "#64748b",
        badgeText: "#ffffff",
      };
  }
}

// Cores e 2 status principais da agenda: Confirmada (🟢 Verde) e Pendente da confirmação (🟡 Amarelo/Laranja)
export function getReservationStatusStyle(status: Reservation["status"]) {
  if (status === "Confirmada") {
    return {
      label: "Confirmada",
      shortLabel: "Confirmada",
      badgeClass: "status-confirmed-badge",
      color: "#10b981",
      border: "#10b981",
      bg: "rgba(16, 185, 129, 0.16)",
      text: "#059669",
      darkText: "#34d399",
      badgeBg: "#10b981",
      badgeText: "#ffffff",
      dotColor: "#10b981",
      icon: "🟢",
    };
  }
  // Pendente da confirmação
  return {
    label: "Pendente da confirmação",
    shortLabel: "Pendente",
    badgeClass: "status-pending-badge",
    color: "#f59e0b",
    border: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.20)",
    text: "#b45309",
    darkText: "#fbbf24",
    badgeBg: "#f59e0b",
    badgeText: "#ffffff",
    dotColor: "#f59e0b",
    icon: "🟡",
  };
}

export default function CalendarTab({
  properties,
  reservations,
  usersList,
  isAdmin,
  onOpenQuickReserve,
  onNavigateToReservations,
  onUpdateReservationStatus,
  activeTourElementId,
}: CalendarTabProps) {
  // Encontra o mês inicial mais relevante com reservas (ex: se tem reservas em Dez/2024 ou no mês atual)
  const initialDate = useMemo(() => {
    const today = new Date();
    // Verifica se hoje tem reservas no mesmo mês/ano
    const hasCurrentMonth = reservations.some((r) => {
      const d = parseFlexibleDate(r.startDate);
      return d && d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth();
    });
    if (hasCurrentMonth) return new Date(today.getFullYear(), today.getMonth(), 1);

    // Se não, busca a reserva mais próxima
    if (reservations.length > 0) {
      const parsed = reservations
        .map((r) => parseFlexibleDate(r.startDate))
        .filter((d): d is Date => d !== null)
        .sort((a, b) => b.getTime() - a.getTime()); // Mais recente
      if (parsed.length > 0) {
        return new Date(parsed[0].getFullYear(), parsed[0].getMonth(), 1);
      }
    }
    return new Date(today.getFullYear(), today.getMonth(), 1);
  }, [reservations]);

  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(initialDate);
  const [viewMode, setViewMode] = useState<"month" | "timeline">("month");
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>("all");
  const [selectedChannel, setSelectedChannel] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Dia atualmente selecionado no calendário (interação mobile / toque)
  const [selectedDayDate, setSelectedDayDate] = useState<Date>(() => {
    return new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);
  });

  // Modal de Detalhes da Reserva selecionada
  const [activeReservationModal, setActiveReservationModal] = useState<Reservation | null>(null);

  // Navegação de mês
  const handlePrevMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const handleToday = () => {
    const now = new Date();
    setCurrentMonthDate(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  const currentYear = currentMonthDate.getFullYear();
  const currentMonth = currentMonthDate.getMonth();

  // Sincroniza o dia selecionado quando o usuário navega entre os meses
  useEffect(() => {
    setSelectedDayDate((prev) => {
      if (!prev || prev.getFullYear() !== currentYear || prev.getMonth() !== currentMonth) {
        return new Date(currentYear, currentMonth, 1);
      }
      return prev;
    });
  }, [currentYear, currentMonth]);

  // Encontra meses que contêm reservas para botões de atalho rápido
  const monthsWithBookings = useMemo(() => {
    const map = new Map<string, { label: string; count: number; date: Date }>();
    reservations.forEach((r) => {
      const s = parseFlexibleDate(r.startDate);
      if (s) {
        const key = `${s.getFullYear()}-${s.getMonth()}`;
        const label = `${MONTH_NAMES[s.getMonth()]} ${s.getFullYear()}`;
        const existing = map.get(key);
        if (existing) {
          existing.count += 1;
        } else {
          map.set(key, { label, count: 1, date: new Date(s.getFullYear(), s.getMonth(), 1) });
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [reservations]);

  // Filtra reservas ativas de acordo com filtros de topo
  const filteredReservations = useMemo(() => {
    return reservations.filter((res) => {
      if (selectedPropertyId !== "all" && res.propertyId !== selectedPropertyId) return false;
      if (selectedChannel !== "all" && res.channel !== selectedChannel) return false;
      if (selectedStatus !== "all" && res.status !== selectedStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchGuest = res.guestName.toLowerCase().includes(q);
        const matchProp = res.propertyName.toLowerCase().includes(q);
        const matchCode = res.confirmationCode?.toLowerCase().includes(q);
        if (!matchGuest && !matchProp && !matchCode) return false;
      }
      return true;
    });
  }, [reservations, selectedPropertyId, selectedChannel, selectedStatus, searchQuery]);

  // Reservas que cruzam o mês atual selecionado
  const reservationsInCurrentMonth = useMemo(() => {
    const monthStart = new Date(currentYear, currentMonth, 1).getTime();
    const monthEnd = new Date(currentYear, currentMonth + 1, 0, 23, 59, 59, 999).getTime();

    return filteredReservations.filter((res) => {
      const s = parseFlexibleDate(res.startDate);
      const e = parseFlexibleDate(res.endDate);
      if (!s || !e) return false;
      const sTime = s.getTime();
      const eTime = e.getTime();
      // Há interseção se início <= fim do mês e fim >= início do mês
      return sTime <= monthEnd && eTime >= monthStart;
    });
  }, [filteredReservations, currentYear, currentMonth]);

  // Reservas ativas no dia selecionado (para a visão móvel / touch do calendário)
  const selectedDayReservations = useMemo(() => {
    if (!selectedDayDate) return [];
    const targetTime = new Date(
      selectedDayDate.getFullYear(),
      selectedDayDate.getMonth(),
      selectedDayDate.getDate()
    ).getTime();

    return filteredReservations.filter((res) => {
      const s = parseFlexibleDate(res.startDate);
      const e = parseFlexibleDate(res.endDate);
      if (!s || !e) return false;
      s.setHours(0, 0, 0, 0);
      e.setHours(0, 0, 0, 0);
      return targetTime >= s.getTime() && targetTime <= e.getTime();
    });
  }, [selectedDayDate, filteredReservations]);

  // Métricas do Mês
  const monthMetrics = useMemo(() => {
    const totalReservations = reservationsInCurrentMonth.length;
    let totalNights = 0;
    let totalRevenue = 0;

    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthStart = new Date(currentYear, currentMonth, 1).getTime();
    const monthEnd = new Date(currentYear, currentMonth, daysInMonth, 23, 59, 59).getTime();

    reservationsInCurrentMonth.forEach((r) => {
      totalRevenue += r.totalAmount || 0;
      const s = parseFlexibleDate(r.startDate);
      const e = parseFlexibleDate(r.endDate);
      if (s && e) {
        // Calcula apenas as noites que caem dentro deste mês
        const clampedStart = Math.max(s.getTime(), monthStart);
        const clampedEnd = Math.min(e.getTime(), monthEnd);
        const diffDays = Math.max(0, Math.round((clampedEnd - clampedStart) / (1000 * 60 * 60 * 24)));
        totalNights += diffDays > 0 ? diffDays : 1;
      } else {
        totalNights += r.nights || 1;
      }
    });

    const activePropertiesCount =
      selectedPropertyId !== "all"
        ? 1
        : properties.length > 0
        ? properties.length
        : 1;

    const totalPossibleNights = daysInMonth * activePropertiesCount;
    const occupancyRate =
      totalPossibleNights > 0
        ? Math.min(100, Math.round((totalNights / totalPossibleNights) * 100))
        : 0;

    return {
      totalReservations,
      totalNights,
      totalRevenue,
      occupancyRate,
    };
  }, [reservationsInCurrentMonth, currentYear, currentMonth, selectedPropertyId, properties]);

  // ==========================================
  // LÓGICA DE DIAS DO MÊS (GRADE MENSAL)
  // ==========================================
  const calendarDays = useMemo(() => {
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Dom, 1 = Seg...
    // Queremos começar na Segunda-feira (Seg = 0, Dom = 6)
    const startOffset = (firstDayOfWeek + 6) % 7;

    const days: Array<{
      date: Date;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      reservations: Reservation[];
      holiday: HolidayInfo | null;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Dias do mês anterior para completar a primeira semana
    const prevMonthDaysCount = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(currentYear, currentMonth - 1, prevMonthDaysCount - i);
      days.push({
        date: d,
        dayNumber: d.getDate(),
        isCurrentMonth: false,
        isToday: d.getTime() === today.getTime(),
        reservations: [],
        holiday: null,
      });
    }

    // Dias do mês atual
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(currentYear, currentMonth, day);
      d.setHours(0, 0, 0, 0);
      const dTime = d.getTime();

      // Reservas que cobrem esse dia
      const dayReservations = filteredReservations.filter((res) => {
        const s = parseFlexibleDate(res.startDate);
        const e = parseFlexibleDate(res.endDate);
        if (!s || !e) return false;
        s.setHours(0, 0, 0, 0);
        e.setHours(0, 0, 0, 0);
        return dTime >= s.getTime() && dTime <= e.getTime();
      });

      days.push({
        date: d,
        dayNumber: day,
        isCurrentMonth: true,
        isToday: dTime === today.getTime(),
        reservations: dayReservations,
        holiday: getHolidayInfo(d),
      });
    }

    // Dias do próximo mês para completar a última semana
    const remainingDays = 42 - days.length; // grade de 6 semanas fixas para estabilidade
    if (remainingDays > 0 && remainingDays < 7) {
      for (let day = 1; day <= remainingDays; day++) {
        const d = new Date(currentYear, currentMonth + 1, day);
        days.push({
          date: d,
          dayNumber: day,
          isCurrentMonth: false,
          isToday: d.getTime() === today.getTime(),
          reservations: [],
          holiday: null,
        });
      }
    }

    return days;
  }, [currentYear, currentMonth, filteredReservations]);

  // ==========================================
  // LÓGICA DA LINHA DO TEMPO (TAPE CHART GANTT)
  // ==========================================
  const daysInTimelineMonth = useMemo(() => {
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();
    const result: Array<{ dayNumber: number; date: Date; weekday: string; isToday: boolean }> = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= totalDays; day++) {
      const d = new Date(currentYear, currentMonth, day);
      const isToday = d.getTime() === today.getTime();
      const wdIndex = (d.getDay() + 6) % 7;
      result.push({
        dayNumber: day,
        date: d,
        weekday: WEEKDAY_NAMES[wdIndex],
        isToday,
      });
    }
    return result;
  }, [currentYear, currentMonth]);

  const propertiesToDisplay = useMemo(() => {
    if (selectedPropertyId === "all") return properties;
    return properties.filter((p) => p.id === selectedPropertyId);
  }, [properties, selectedPropertyId]);

  return (
    <div className="calendar-tab-container">
      {/* HEADER DA ABA */}
      <div className="page-header" style={{ marginBottom: "20px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <h1 className="page-title">Agenda & Calendário de Ocupação</h1>
            <span className="live-status-pill">
              <span className="pulse-dot" />
              Ao Vivo
            </span>
          </div>
          <p className="page-subtitle">
            Acompanhe o mapa de agendamentos, diárias ocupadas e disponibilidade dos imóveis
          </p>
        </div>

        {/* CONTROLES DO TOPO: ALTERNADOR DE VISÃO */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <div className="calendar-view-toggle">
            <button
              className={`toggle-btn ${viewMode === "month" ? "active" : ""}`}
              onClick={() => setViewMode("month")}
              title="Visualização em Grade Mensal"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="4" width="18" height="18" rx="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <span>Mês (Grade)</span>
            </button>
            <button
              className={`toggle-btn ${viewMode === "timeline" ? "active" : ""}`}
              onClick={() => setViewMode("timeline")}
              title="Mapa de Ocupação por Imóvel (Linha do Tempo)"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="15" y2="12" />
                <line x1="3" y1="18" x2="18" y2="18" />
              </svg>
              <span>Mapa por Imóvel (Fita)</span>
            </button>
          </div>

          {isAdmin && (
            <button
              id="btn-vincular-reserva"
              className={`btn-primary ${activeTourElementId === "btn-vincular-reserva" ? "tour-spotlight-highlight" : ""}`}
              style={{ padding: "9px 18px", fontSize: "13.5px", fontWeight: "700", display: "inline-flex", alignItems: "center", gap: "8px" }}
              onClick={() => {
                if (properties.length > 0) {
                  onOpenQuickReserve(properties[0], undefined, new Date(currentYear, currentMonth, 1));
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>+ Vincular Reserva no Imóvel</span>
            </button>
          )}
        </div>
      </div>

      {/* KPI CARDS: MÉTRICAS DO MÊS ATUAL */}
      <div className="calendar-kpi-grid">
        <div className="calendar-kpi-card">
          <div className="kpi-icon-box" style={{ background: "rgba(232, 252, 82, 0.15)", color: "#9cae00" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="cal-kpi-value">{monthMetrics.totalNights}</span>
            <span className="cal-kpi-label">Noites Ocupadas no Mês</span>
          </div>
        </div>

        <div className="calendar-kpi-card">
          <div className="kpi-icon-box" style={{ background: "rgba(16, 185, 129, 0.12)", color: "#10b981" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="cal-kpi-value">{monthMetrics.occupancyRate}%</span>
            <span className="cal-kpi-label">Taxa de Ocupação</span>
          </div>
        </div>

        <div className="calendar-kpi-card">
          <div className="kpi-icon-box" style={{ background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="cal-kpi-value">{monthMetrics.totalReservations}</span>
            <span className="cal-kpi-label">Reservas no Período</span>
          </div>
        </div>

        <div className="calendar-kpi-card">
          <div className="kpi-icon-box" style={{ background: "rgba(168, 85, 247, 0.12)", color: "#a855f7" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div className="kpi-info">
            <span className="cal-kpi-value">{formatCurrency(monthMetrics.totalRevenue)}</span>
            <span className="cal-kpi-label">Faturamento Previsto</span>
          </div>
        </div>
      </div>

      {/* BARRA DE FERRAMENTAS: NAVEGAÇÃO DE DATA + FILTROS */}
      <div className="calendar-toolbar-card">
        <div className="calendar-nav-section">
          <div className="calendar-nav-controls">
            <button
              type="button"
              className="cal-nav-btn"
              onClick={handlePrevMonth}
              title="Mês anterior"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>

            <div className="calendar-current-title">
              <span className="month-highlight">{MONTH_NAMES[currentMonth]}</span>
              <span className="year-highlight">{currentYear}</span>
            </div>

            <button
              type="button"
              className="cal-nav-btn"
              onClick={handleNextMonth}
              title="Próximo mês"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>

            <button type="button" className="cal-today-btn" onClick={handleToday}>
              Hoje
            </button>
          </div>

          {/* Atalhos Rápidos para Meses com Reservas Registradas */}
          {monthsWithBookings.length > 0 && (
            <div className="cal-quick-jumps">
              <span className="quick-jump-label">Com reservas:</span>
              {monthsWithBookings.map((m) => {
                const isSelected =
                  m.date.getFullYear() === currentYear && m.date.getMonth() === currentMonth;
                return (
                  <button
                    key={`${m.date.getFullYear()}-${m.date.getMonth()}`}
                    type="button"
                    className={`quick-jump-pill ${isSelected ? "active" : ""}`}
                    onClick={() => setCurrentMonthDate(m.date)}
                  >
                    {m.label} ({m.count})
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* FILTROS DE IMÓVEL, CANAL E BUSCA */}
        <div className="calendar-filters-section">
          {/* Seletor de Imóvel */}
          <div className="cal-filter-select-wrapper">
            <select
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="cal-select-input"
            >
              <option value="all">🏢 Todos os Imóveis ({properties.length})</option>
              {properties.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Seletor de Canal */}
          <div className="cal-filter-select-wrapper">
            <select
              value={selectedChannel}
              onChange={(e) => setSelectedChannel(e.target.value)}
              className="cal-select-input"
            >
              <option value="all">Todos os Canais</option>
              <option value="Airbnb">Airbnb</option>
              <option value="Booking">Booking.com</option>
              <option value="Direto">Direto</option>
              <option value="Bloqueio Manual">Bloqueio Manual</option>
            </select>
          </div>

          {/* Seletor de Status */}
          <div className="cal-filter-select-wrapper">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="cal-select-input"
            >
              <option value="all">Todos os Status</option>
              <option value="Confirmada">Confirmadas</option>
              <option value="Pendente">Pendentes</option>
              <option value="Concluída">Concluídas</option>
            </select>
          </div>

          {/* Campo de Busca Rápida */}
          <div className="cal-search-box">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              placeholder="Buscar hóspede, código..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="cal-search-input"
            />
            {searchQuery && (
              <button
                type="button"
                className="cal-search-clear"
                onClick={() => setSearchQuery("")}
              >
                ✕
              </button>
            )}
          </div>
        </div>

        {/* LEGENDA DE CORES E STATUS (2 CORES PRINCIPAIS DA AGENDA) */}
        <div className="calendar-legend-bar">
          <div className="legend-item" style={{ background: "rgba(16, 185, 129, 0.12)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(16, 185, 129, 0.3)" }}>
            <span className="legend-dot" style={{ background: "#10b981", boxShadow: "0 0 6px rgba(16,185,129,0.6)" }} />
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>🟢 Confirmada</span>
          </div>
          <div className="legend-item" style={{ background: "rgba(245, 158, 11, 0.12)", padding: "4px 10px", borderRadius: "8px", border: "1px solid rgba(245, 158, 11, 0.3)" }}>
            <span className="legend-dot" style={{ background: "#f59e0b", boxShadow: "0 0 6px rgba(245,158,11,0.6)" }} />
            <span style={{ color: "var(--text-primary)", fontWeight: "600" }}>🟡 Pendente da confirmação</span>
          </div>
          <div className="legend-separator" />
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#dc2626", border: "1px solid #fca5a5" }} />
            <span>Feriado Nacional</span>
          </div>
          <div className="legend-item">
            <span className="legend-dot" style={{ background: "#d97706", border: "1px solid #fcd34d" }} />
            <span>Facultativo</span>
          </div>
          <div className="legend-separator" />
          <div className="legend-item">
            <span className="legend-flag checkin">🛫</span>
            <span>Check-in</span>
          </div>
          <div className="legend-item">
            <span className="legend-flag checkout">🛬</span>
            <span>Check-out</span>
          </div>
        </div>
      </div>

      {/* ====================================================
          VISÃO 1: GRADE MENSAL (MONTH GRID)
         ==================================================== */}
      {viewMode === "month" && (
        <div className="calendar-month-wrapper">
          {/* DIAS DA SEMANA */}
          <div className="calendar-weekdays-header">
            {WEEKDAY_NAMES.map((name) => (
              <div key={name} className="weekday-header-cell">
                {name}
              </div>
            ))}
          </div>

          {/* GRADE DE DIAS */}
          <div className="calendar-month-grid">
            {calendarDays.map((cell, idx) => {
              const hasBookings = cell.reservations.length > 0;
              const isSelected =
                selectedDayDate && cell.date.getTime() === selectedDayDate.getTime();
              const holiday = cell.holiday;
              const holidayClass = holiday
                ? holiday.type === "nacional"
                  ? "holiday-nacional"
                  : holiday.type === "facultativo"
                  ? "holiday-facultativo"
                  : "holiday-estadual"
                : "";

              return (
                <div
                  key={idx}
                  className={`calendar-day-cell ${!cell.isCurrentMonth ? "other-month" : ""} ${
                    cell.isToday ? "today-cell" : ""
                  } ${isSelected ? "selected-day-cell" : ""} ${hasBookings ? "has-bookings" : "empty-day"} ${holidayClass}`}
                  onClick={() => setSelectedDayDate(cell.date)}
                  title={holiday && cell.isCurrentMonth ? holiday.name : undefined}
                >
                  <div className="day-cell-header">
                    <span
                      className={`day-number ${cell.isToday ? "today-badge" : ""} ${
                        isSelected && !cell.isToday ? "selected-badge" : ""
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Ícone de Feriado */}
                    {holiday && cell.isCurrentMonth && (
                      <span
                        className="holiday-flag"
                        title={holiday.name}
                      >
                        {holiday.type === "nacional" ? "🎌" : "📅"}
                      </span>
                    )}

                    {/* Botão de Agendamento Rápido ao passar o mouse — APENAS ADMIN */}
                    {isAdmin && cell.isCurrentMonth && (
                      <button
                        type="button"
                        className="day-add-btn"
                        title="Criar reserva nesta data"
                        onClick={(e) => {
                          e.stopPropagation();
                          const targetProp =
                            selectedPropertyId !== "all"
                              ? properties.find((p) => p.id === selectedPropertyId) || properties[0]
                              : properties[0];
                          if (targetProp) {
                            onOpenQuickReserve(targetProp, undefined, cell.date);
                          }
                        }}
                      >
                        +
                      </button>
                    )}
                  </div>

                  {/* Nome do feriado (micro label) */}
                  {holiday && cell.isCurrentMonth && (
                    <div className="holiday-name-label">
                      {holiday.name.split(" ").slice(0, 3).join(" ")}
                    </div>
                  )}

                  {/* Indicador de Bolinhas para Mobile (visível em telas menores com as 2 cores de status) */}
                  {hasBookings && (
                    <div className="day-mobile-dots">
                      {cell.reservations.slice(0, 3).map((res) => {
                        const sStyle = getReservationStatusStyle(res.status);
                        return (
                          <span
                            key={res.id}
                            className="day-dot"
                            style={{ backgroundColor: sStyle.badgeBg }}
                            title={`${res.guestName} (${sStyle.label})`}
                          />
                        );
                      })}
                      {cell.reservations.length > 3 && (
                        <span className="day-dot-more">+{cell.reservations.length - 3}</span>
                      )}
                    </div>
                  )}

                  {/* RESERVAS NESTE DIA COM AS 2 CORES DE STATUS (CONFIRMADA 🟢 vs PENDENTE 🟡) */}
                  <div className="day-reservations-list">
                    {cell.reservations.map((res) => {
                      const sStyle = getReservationStatusStyle(res.status);
                      const sDate = parseFlexibleDate(res.startDate);
                      const eDate = parseFlexibleDate(res.endDate);
                      const isCheckIn = sDate && sDate.getTime() === cell.date.getTime();
                      const isCheckOut = eDate && eDate.getTime() === cell.date.getTime();

                      return (
                        <div
                          key={res.id}
                          className="calendar-res-pill"
                          style={{
                            backgroundColor: sStyle.bg,
                            borderLeft: `4px solid ${sStyle.border}`,
                            color: sStyle.text,
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveReservationModal(res);
                          }}
                          title={`${res.propertyName}\nHóspede: ${res.guestName}\nStatus: ${sStyle.label}\nValor: ${formatCurrency(res.totalAmount)}`}
                        >
                          <div className="res-pill-content">
                            <span className="res-pill-status-icon">{sStyle.icon}</span>
                            <span className="res-pill-guest">{res.guestName}</span>
                            {isCheckIn && <span className="flight-tag in" title="Check-in hoje">🛫</span>}
                            {isCheckOut && <span className="flight-tag out" title="Check-out hoje">🛬</span>}
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "10.5px", marginTop: "2px" }}>
                            <span className="res-pill-prop">{res.propertyName.split(" ")[0]}</span>
                            <span style={{ fontSize: "10px", fontWeight: "700", opacity: 0.9 }}>
                              {sStyle.shortLabel}
                            </span>
                          </div>
                        </div>
                      );
                    })}

                    {/* Espaço vazio se não houver reserva — clicável apenas para admin */}
                    {cell.isCurrentMonth && !hasBookings && (
                      <div
                        className="day-empty-placeholder"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDayDate(cell.date);
                          if (isAdmin) {
                            const targetProp =
                              selectedPropertyId !== "all"
                                ? properties.find((p) => p.id === selectedPropertyId) || properties[0]
                                : properties[0];
                            if (targetProp) {
                              onOpenQuickReserve(targetProp, undefined, cell.date);
                            }
                          }
                        }}
                      >
                        <span>Livre</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* PAINEL DINÂMICO DO DIA SELECIONADO (PERFEITO PARA MOBILE & TABLET) */}
          {selectedDayDate && (
            <div className="calendar-selected-day-agenda">
              <div className="agenda-day-header">
                <div className="agenda-day-title">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <h3>
                    Agenda de{" "}
                    {selectedDayDate.toLocaleDateString("pt-BR", {
                      weekday: "short",
                      day: "numeric",
                      month: "long",
                    })}
                  </h3>
                </div>
                <span className={`agenda-day-badge ${selectedDayReservations.length > 0 ? "occupied" : "free"}`}>
                  {selectedDayReservations.length > 0
                    ? `${selectedDayReservations.length} reserva(s) ativa(s)`
                    : "Dia Livre"}
                </span>
              </div>

              {selectedDayReservations.length > 0 ? (
                <div className="agenda-day-cards">
                  {selectedDayReservations.map((res) => {
                    const colors = getChannelColor(res.channel);
                    const sDate = parseFlexibleDate(res.startDate);
                    const eDate = parseFlexibleDate(res.endDate);
                    const isCheckIn = sDate && sDate.getTime() === selectedDayDate.getTime();
                    const isCheckOut = eDate && eDate.getTime() === selectedDayDate.getTime();
                    const propObj = properties.find((p) => p.id === res.propertyId);

                    const sStyle = getReservationStatusStyle(res.status);

                    return (
                      <div
                        key={res.id}
                        className="agenda-booking-card"
                        onClick={() => setActiveReservationModal(res)}
                        style={{ borderLeft: `4px solid ${sStyle.border}` }}
                      >
                        <div
                          className="agenda-card-thumb"
                          style={{
                            backgroundImage: `url(${
                              propObj?.imageUrl ||
                              "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80"
                            })`,
                          }}
                        />
                        <div className="agenda-card-body">
                          <div className="agenda-card-top">
                            <span
                              className="status-pill-badge"
                              style={{
                                backgroundColor: sStyle.bg,
                                color: sStyle.text,
                                border: `1px solid ${sStyle.border}`,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                fontSize: "11px",
                                fontWeight: "700",
                                display: "inline-flex",
                                alignItems: "center",
                                gap: "4px",
                              }}
                            >
                              {sStyle.icon} {sStyle.label}
                            </span>
                            <span
                              className="channel-badge-mini"
                              style={{
                                backgroundColor: colors.badgeBg,
                                color: colors.badgeText,
                                padding: "2px 7px",
                                height: "auto",
                                width: "auto",
                                borderRadius: "6px",
                                fontWeight: "600",
                                fontSize: "10.5px",
                              }}
                            >
                              {res.channel}
                            </span>
                            {isCheckIn && <span className="flight-tag in">🛫 Check-in</span>}
                            {isCheckOut && <span className="flight-tag out">🛬 Check-out</span>}
                          </div>
                          <h4 className="agenda-card-guest">{res.guestName}</h4>
                          <p className="agenda-card-prop">
                            {res.propertyName} • {res.roomName}
                          </p>
                          <div className="agenda-card-bottom">
                            <span className="agenda-card-dates">
                              {res.startDate} → {res.endDate} ({res.nights} noites)
                            </span>
                            <span className="agenda-card-price">{formatCurrency(res.totalAmount)}</span>
                          </div>

                          {/* Alternância Rápida de Status pelo Admin */}
                          {isAdmin && onUpdateReservationStatus && (
                            <div
                              className="agenda-admin-status-toggle"
                              onClick={(e) => e.stopPropagation()}
                              style={{ display: "flex", gap: "6px", marginTop: "8px", paddingTop: "8px", borderTop: "1px dashed var(--border-light)", alignItems: "center" }}
                            >
                              <span style={{ fontSize: "11px", color: "var(--text-secondary)", fontWeight: "600" }}>
                                Status:
                              </span>
                              <button
                                type="button"
                                className={`cal-quick-status-chip ${res.status === "Confirmada" ? "is-confirmed" : ""}`}
                                onClick={() => onUpdateReservationStatus(res.id, "Confirmada")}
                              >
                                🟢 Confirmada
                              </button>
                              <button
                                type="button"
                                className={`cal-quick-status-chip ${res.status === "Pendente" ? "is-pending" : ""}`}
                                onClick={() => onUpdateReservationStatus(res.id, "Pendente")}
                              >
                                🟡 Pendente
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="agenda-day-empty">
                  <div className="agenda-empty-icon">
                    {selectedDayDate && getHolidayInfo(selectedDayDate) ? "🎌" : "🏖️"}
                  </div>
                  <div className="agenda-empty-text">
                    {selectedDayDate && getHolidayInfo(selectedDayDate) ? (
                      <>
                        <h4>📅 {getHolidayInfo(selectedDayDate)!.name}</h4>
                        <p>Feriado {getHolidayInfo(selectedDayDate)!.type} — nenhuma diária agendada nesta data.</p>
                      </>
                    ) : (
                      <>
                        <h4>Imóvel livre para agendamento</h4>
                        <p>Nenhuma diária agendada neste dia. Pronto para receber novos hóspedes!</p>
                      </>
                    )}
                  </div>
                  {isAdmin && (
                    <button
                      type="button"
                      className="btn-primary"
                      style={{ padding: "8px 16px", fontSize: "12px", whiteSpace: "nowrap" }}
                      onClick={() => {
                        const targetProp =
                          selectedPropertyId !== "all"
                            ? properties.find((p) => p.id === selectedPropertyId) || properties[0]
                            : properties[0];
                        if (targetProp) {
                          onOpenQuickReserve(targetProp, undefined, selectedDayDate);
                        }
                      }}
                    >
                      + Agendar nesta Data
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ====================================================
          VISÃO 2: LINHA DO TEMPO POR IMÓVEL (TAPE CHART GANTT)
         ==================================================== */}
      {viewMode === "timeline" && (
        <div className="calendar-timeline-container">
          <div className="timeline-mobile-helper">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
              <polyline points="12 19 5 12 12 5" />
            </svg>
            <span>Arraste para os lados para navegar por todos os dias do mês</span>
          </div>

          <div className="timeline-scroll-wrapper">
            <div className="timeline-table">
              {/* CABEÇALHO DA TIMELINE */}
              <div className="timeline-header-row">
                <div className="timeline-property-col-header">
                  <span>Imóvel / Acomodação</span>
                </div>
                <div className="timeline-days-header-track">
                  {daysInTimelineMonth.map((d) => (
                    <div
                      key={d.dayNumber}
                      className={`timeline-day-header-cell ${d.isToday ? "today-cell" : ""}`}
                    >
                      <span className="tl-weekday">{d.weekday}</span>
                      <span className={`tl-daynum ${d.isToday ? "today-num" : ""}`}>
                        {d.dayNumber}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* LINHAS DE CADA IMÓVEL */}
              {propertiesToDisplay.map((prop) => {
                // Reservas deste imóvel que cruzam o mês atual
                const propReservations = reservationsInCurrentMonth.filter(
                  (r) => r.propertyId === prop.id
                );

                return (
                  <div key={prop.id} className="timeline-property-row">
                    {/* COLUNA ESQUERDA FIXA: CARD DO IMÓVEL */}
                    <div className="timeline-property-info-col">
                      <div
                        className="tl-prop-thumb"
                        style={{
                          backgroundImage: `url(${prop.imageUrl || "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80"})`,
                        }}
                      />
                      <div className="tl-prop-details">
                        <h4 className="tl-prop-name" title={prop.name}>
                          {prop.name}
                        </h4>
                        <span className="tl-prop-type">
                          {prop.type} • {prop.rooms.length} acomodação(ões)
                        </span>
                      </div>
                    </div>

                    {/* ÁREA DA TIMELINE: DIAS E BARRAS DE RESERVA */}
                    <div className="timeline-grid-track">
                      {/* Células de fundo para cada dia */}
                      {daysInTimelineMonth.map((d) => {
                        const dayTime = d.date.getTime();

                        // Verifica se este dia tem reserva neste imóvel
                        const activeResForDay = propReservations.find((r) => {
                          const s = parseFlexibleDate(r.startDate);
                          const e = parseFlexibleDate(r.endDate);
                          if (!s || !e) return false;
                          s.setHours(0, 0, 0, 0);
                          e.setHours(0, 0, 0, 0);
                          return dayTime >= s.getTime() && dayTime <= e.getTime();
                        });

                        const isCheckInDay =
                          activeResForDay &&
                          parseFlexibleDate(activeResForDay.startDate)?.getTime() === dayTime;
                        const isCheckOutDay =
                          activeResForDay &&
                          parseFlexibleDate(activeResForDay.endDate)?.getTime() === dayTime;

                        return (
                          <div
                            key={d.dayNumber}
                            className={`timeline-day-slot ${d.isToday ? "today-slot" : ""} ${
                              activeResForDay ? "occupied-slot" : "free-slot"
                            }`}
                            onClick={() => {
                              if (activeResForDay) {
                                setActiveReservationModal(activeResForDay);
                              } else if (isAdmin) {
                                onOpenQuickReserve(prop, undefined, d.date);
                              }
                            }}
                          >
                            {/* Renderização de Barra de Reserva se ocupado com as 2 cores de status */}
                            {activeResForDay && (
                              <div
                                className={`timeline-booking-bar ${isCheckInDay ? "is-start" : ""} ${
                                  isCheckOutDay ? "is-end" : ""
                                }`}
                                style={{
                                  backgroundColor: getReservationStatusStyle(activeResForDay.status).badgeBg,
                                }}
                                title={`${activeResForDay.guestName} [${getReservationStatusStyle(activeResForDay.status).label}] (${activeResForDay.channel}) - ${activeResForDay.startDate} a ${activeResForDay.endDate}`}
                              >
                                {isCheckInDay && (
                                  <span className="tl-guest-pill-text">
                                    {getReservationStatusStyle(activeResForDay.status).icon} {activeResForDay.guestName}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Slot livre com hover */}
                            {!activeResForDay && (
                              <div className="tl-free-indicator" title="Clique para agendar">
                                +
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {propertiesToDisplay.length === 0 && (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-secondary)" }}>
                  Nenhum imóvel disponível para os filtros selecionados.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================
          MODAL DE DETALHES COMPLETOS DA RESERVA
         ==================================================== */}
      {activeReservationModal && (
        <div className="modal-overlay" onClick={() => setActiveReservationModal(null)}>
          <div
            className="modal-card animate-scale-in"
            style={{ maxWidth: "540px" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  className="channel-tag-round"
                  style={{
                    backgroundColor: getChannelColor(activeReservationModal.channel).badgeBg,
                    color: "#fff",
                  }}
                >
                  {activeReservationModal.channel}
                </span>
                <h3 className="modal-title">Detalhes da Reserva</h3>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setActiveReservationModal(null)}
              >
                ✕
              </button>
            </div>

            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
              {/* Informações Principais do Hóspede */}
              <div className="cal-modal-guest-header">
                <div className="cal-modal-avatar">
                  {activeReservationModal.guestName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h4 style={{ fontSize: "18px", fontWeight: "700", color: "var(--text-primary)" }}>
                    {activeReservationModal.guestName}
                  </h4>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                    <span className="cal-modal-code">
                      Código: <strong>{activeReservationModal.confirmationCode}</strong>
                    </span>
                    <span
                      className={`status-badge ${
                        activeReservationModal.status === "Confirmada"
                          ? "confirmed"
                          : activeReservationModal.status === "Pendente"
                          ? "pending"
                          : "completed"
                      }`}
                    >
                      {activeReservationModal.status}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card do Imóvel Vinculado */}
              <div className="prop-preview-box" style={{ padding: "12px 14px", borderRadius: "12px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div
                    className="prop-preview-thumb"
                    style={{
                      backgroundImage: `url(${
                        properties.find((p) => p.id === activeReservationModal.propertyId)?.imageUrl ||
                        "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=400&q=80"
                      })`,
                    }}
                  />
                  <div>
                    <h5 style={{ fontSize: "14px", fontWeight: "700", margin: 0 }}>
                      {activeReservationModal.propertyName}
                    </h5>
                    <p style={{ fontSize: "12px", color: "var(--text-secondary)", margin: "2px 0 0" }}>
                      {activeReservationModal.roomName}
                    </p>
                  </div>
                </div>
              </div>

              {/* Informações de Estadia: Check-in, Check-out e Noites */}
              <div className="cal-modal-dates-grid">
                <div className="cal-date-box">
                  <span className="cal-date-label">🛫 Check-in</span>
                  <span className="cal-date-val">{activeReservationModal.startDate}</span>
                  <span className="cal-date-sub">A partir das 14:00</span>
                </div>

                <div className="cal-nights-middle">
                  <span className="nights-badge">{activeReservationModal.nights} noites</span>
                  <div className="nights-line" />
                </div>

                <div className="cal-date-box">
                  <span className="cal-date-label">🛬 Check-out</span>
                  <span className="cal-date-val">{activeReservationModal.endDate}</span>
                  <span className="cal-date-sub">Até as 11:00</span>
                </div>
              </div>

              {/* Quadro Financeiro */}
              <div className="cal-modal-finance-box">
                <div className="finance-row">
                  <span style={{ color: "var(--text-secondary)", fontSize: "13px" }}>Valor Total da Reserva</span>
                  <span style={{ fontSize: "20px", fontWeight: "800", color: "var(--text-primary)" }}>
                    {formatCurrency(activeReservationModal.totalAmount)}
                  </span>
                </div>
                <div className="finance-row" style={{ marginTop: "6px" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Média por diária</span>
                  <span style={{ fontSize: "13px", fontWeight: "600", color: "var(--text-secondary)" }}>
                    {formatCurrency(
                      activeReservationModal.totalAmount / (activeReservationModal.nights || 1)
                    )}
                    /noite
                  </span>
                </div>
                <div className="finance-row" style={{ marginTop: "6px" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "12px" }}>Proprietário</span>
                  <span style={{ fontSize: "12px", fontWeight: "600" }}>
                    {usersList.find((u) => u.id === activeReservationModal.ownerId)?.name || "Administração Geral"}
                  </span>
                </div>
              </div>

              {/* PAINEL EXCLUSIVO DO ADMIN: ALTERAR STATUS DA RESERVA (CONFIRMADA x PENDENTE) */}
              {isAdmin && onUpdateReservationStatus && (
                <div className="cal-modal-status-admin-card" style={{ background: "var(--bg-app)", padding: "14px", borderRadius: "12px", border: "1px solid var(--border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                    <span style={{ fontSize: "12.5px", fontWeight: "700", color: "var(--text-primary)" }}>
                      ⚙️ Gestão de Status da Reserva (Admin)
                    </span>
                    <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                      Muda as 2 cores na agenda
                    </span>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <button
                      type="button"
                      className={`btn-status-toggle confirm ${activeReservationModal.status === "Confirmada" ? "is-active" : ""}`}
                      onClick={async () => {
                        await onUpdateReservationStatus(activeReservationModal.id, "Confirmada");
                        setActiveReservationModal((prev) => prev ? { ...prev, status: "Confirmada" } : null);
                      }}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: activeReservationModal.status === "Confirmada" ? "2px solid #10b981" : "1px solid var(--border-light)",
                        background: activeReservationModal.status === "Confirmada" ? "rgba(16, 185, 129, 0.18)" : "var(--bg-card)",
                        color: activeReservationModal.status === "Confirmada" ? "#10b981" : "var(--text-primary)",
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
                      {activeReservationModal.status === "Confirmada" && <span style={{ fontSize: "10px", background: "#10b981", color: "#fff", padding: "1px 6px", borderRadius: "4px" }}>Atual</span>}
                    </button>

                    <button
                      type="button"
                      className={`btn-status-toggle pending ${activeReservationModal.status === "Pendente" ? "is-active" : ""}`}
                      onClick={async () => {
                        await onUpdateReservationStatus(activeReservationModal.id, "Pendente");
                        setActiveReservationModal((prev) => prev ? { ...prev, status: "Pendente" } : null);
                      }}
                      style={{
                        padding: "10px",
                        borderRadius: "8px",
                        border: activeReservationModal.status === "Pendente" ? "2px solid #f59e0b" : "1px solid var(--border-light)",
                        background: activeReservationModal.status === "Pendente" ? "rgba(245, 158, 11, 0.18)" : "var(--bg-card)",
                        color: activeReservationModal.status === "Pendente" ? "#f59e0b" : "var(--text-primary)",
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
                      {activeReservationModal.status === "Pendente" && <span style={{ fontSize: "10px", background: "#f59e0b", color: "#fff", padding: "1px 6px", borderRadius: "4px" }}>Atual</span>}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer" style={{ justifyContent: "space-between" }}>
              <button
                type="button"
                className="btn-secondary"
                onClick={() => {
                  setActiveReservationModal(null);
                  onNavigateToReservations();
                }}
              >
                Ver na Lista de Reservas →
              </button>

              <button
                type="button"
                className="btn-primary"
                onClick={() => setActiveReservationModal(null)}
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
