import { useState, useMemo } from "react";
import type { Property, Room, Reservation, User, Role } from "./App";
import type { LogEntry } from "./logger";

interface DevTabProps {
  currentUser: User;
  usersList: User[];
  properties: Property[];
  reservations: Reservation[];
  logs: LogEntry[];
  onRefreshLogs: () => void;
  onClearLogs: () => void;
  onCreateUser: (user: Partial<User>) => Promise<void>;
  onUpdateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  onDeleteUser: (userId: string) => Promise<void>;
  onCreateRoom: (propertyId: string, room: Omit<Room, "id" | "syncDate">) => Promise<void>;
  onUpdateRoom: (propertyId: string, roomId: string, updates: Partial<Room>) => Promise<void>;
  onDeleteRoom: (propertyId: string, roomId: string) => Promise<void>;
  onAssignPropertyOwner: (propertyId: string, ownerId: string) => Promise<void>;
  onResetUsers: (mode: "restore_initial" | "clear_owners") => Promise<void>;
  onResetReservations: (mode: "clear_all" | "restore_initial" | "clear_by_prop", propertyId?: string) => Promise<void>;
  onResetProperties: (mode: "restore_initial" | "clear_all") => Promise<void>;
  onFullFactoryReset: () => Promise<void>;
  onImportBackup: (backupData: { users?: User[]; properties?: Property[]; reservations?: Reservation[] }) => Promise<void>;
  showToast: (msg: string) => void;
  getPrettyAppOrigin: () => string;
}

export default function DevTab({
  currentUser,
  usersList,
  properties,
  reservations,
  logs,
  onRefreshLogs,
  onClearLogs,
  onCreateUser,
  onUpdateUser,
  onDeleteUser,
  onCreateRoom,
  onUpdateRoom,
  onDeleteRoom,
  onAssignPropertyOwner,
  onResetUsers,
  onResetReservations,
  onResetProperties,
  onFullFactoryReset,
  onImportBackup,
  showToast,
  getPrettyAppOrigin,
}: DevTabProps) {
  // Sub-tabs dentro da aba Dev
  const [activeSubTab, setActiveSubTab] = useState<"logs" | "users" | "rooms" | "database">("logs");

  // Filtros de Logs
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>("all");
  const [logSearchQuery, setLogSearchQuery] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Estado Modal Criar/Editar Usuário
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [formUserName, setFormUserName] = useState("");
  const [formUserUsername, setFormUserUsername] = useState("");
  const [formUserEmail, setFormUserEmail] = useState("");
  const [formUserPassword, setFormUserPassword] = useState("");
  const [formUserRole, setFormUserRole] = useState<Role>("owner");
  const [showPasswords, setShowPasswords] = useState(false);

  // Estado Gestão de Cômodos
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>(properties[0]?.id || "");
  const [isRoomModalOpen, setIsRoomModalOpen] = useState(false);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [formRoomName, setFormRoomName] = useState("");
  const [formRoomPrice, setFormRoomPrice] = useState(250);
  const [formRoomCode, setFormRoomCode] = useState("");
  const [formRoomStatus, setFormRoomStatus] = useState<"Disponível" | "Ocupado" | "Manutenção">("Disponível");
  const [formRoomIcal, setFormRoomIcal] = useState("");

  // Estado Reset de Banco
  const [resetPropTarget, setResetPropTarget] = useState<string>(properties[0]?.id || "");
  const [isResetConfirmModalOpen, setIsResetConfirmModalOpen] = useState(false);
  const [pendingResetAction, setPendingResetAction] = useState<{
    title: string;
    description: string;
    confirmText: string;
    execute: () => Promise<void>;
  } | null>(null);

  // Imóvel atualmente selecionado para cômodos
  const targetProperty = useMemo(() => {
    return properties.find((p) => p.id === selectedPropertyId) || properties[0];
  }, [properties, selectedPropertyId]);

  // Logs filtrados
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchCat = logCategoryFilter === "all" || log.category === logCategoryFilter;
      if (!matchCat) return false;
      if (!logSearchQuery.trim()) return true;
      const q = logSearchQuery.toLowerCase();
      return (
        log.description.toLowerCase().includes(q) ||
        log.action.toLowerCase().includes(q) ||
        log.actorName.toLowerCase().includes(q) ||
        log.actorEmail.toLowerCase().includes(q)
      );
    });
  }, [logs, logCategoryFilter, logSearchQuery]);

  // Exportar Logs como JSON
  const handleExportLogs = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `propertyhub_logs_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("✓ Arquivo de logs exportado com sucesso.");
  };

  // Exportar Backup Completo do Banco de Dados
  const handleExportDatabaseBackup = () => {
    const fullBackup = {
      exportDate: new Date().toISOString(),
      platform: "PropertyHub",
      databaseVersion: "2.0",
      users: usersList,
      properties: properties,
      reservations: reservations,
      logsCount: logs.length,
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fullBackup, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `propertyhub_backup_banco_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast("✓ Backup completo do banco exportado com sucesso!");
  };

  // Importar Backup JSON
  const handleImportJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.users && !parsed.properties && !parsed.reservations) {
          showToast("⚠️ O arquivo JSON selecionado não contém os dados esperados do PropertyHub.");
          return;
        }
        if (window.confirm(`Deseja restaurar este backup contendo ${parsed.users?.length || 0} usuários, ${parsed.properties?.length || 0} imóveis e ${parsed.reservations?.length || 0} reservas? Isso atualizará o Firestore.`)) {
          await onImportBackup(parsed);
          showToast("✓ Banco de dados restaurado a partir do backup!");
        }
      } catch (err: any) {
        showToast("⚠️ Erro ao processar arquivo JSON: " + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  // Handlers para Usuário
  const openCreateUserModal = () => {
    setEditingUserId(null);
    setFormUserName("");
    setFormUserUsername("");
    setFormUserEmail("");
    setFormUserPassword("");
    setFormUserRole("owner");
    setIsUserModalOpen(true);
  };

  const openEditUserModal = (u: User) => {
    setEditingUserId(u.id);
    setFormUserName(u.name);
    setFormUserUsername(u.username || "");
    setFormUserEmail(u.email);
    setFormUserPassword(u.password || "");
    setFormUserRole(u.role);
    setIsUserModalOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formUserName.trim() || !formUserUsername.trim() || !formUserEmail.trim() || !formUserPassword.trim()) {
      showToast("Preencha todos os campos do usuário.");
      return;
    }

    if (editingUserId) {
      await onUpdateUser(editingUserId, {
        name: formUserName.trim(),
        username: formUserUsername.trim().toLowerCase(),
        email: formUserEmail.trim().toLowerCase(),
        password: formUserPassword.trim(),
        role: formUserRole,
      });
      showToast(`✓ Usuário ${formUserName} atualizado com sucesso no banco!`);
    } else {
      await onCreateUser({
        name: formUserName.trim(),
        username: formUserUsername.trim().toLowerCase(),
        email: formUserEmail.trim().toLowerCase(),
        password: formUserPassword.trim(),
        role: formUserRole,
      });
      showToast(`✓ Novo usuário (${formUserRole}) criado diretamente no banco!`);
    }
    setIsUserModalOpen(false);
  };

  // Handlers para Cômodos
  const openCreateRoomModal = () => {
    setEditingRoomId(null);
    setFormRoomName("");
    setFormRoomPrice(targetProperty?.basePrice || 250);
    setFormRoomCode("ARR" + Math.floor(100000 + Math.random() * 900000));
    setFormRoomStatus("Disponível");
    setFormRoomIcal("");
    setIsRoomModalOpen(true);
  };

  const openEditRoomModal = (r: Room) => {
    setEditingRoomId(r.id);
    setFormRoomName(r.name);
    setFormRoomPrice(r.pricePerNight);
    setFormRoomCode(r.airbnbCode || "");
    setFormRoomStatus(r.status);
    setFormRoomIcal(r.iCalUrl || "");
    setIsRoomModalOpen(true);
  };

  const handleSaveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProperty || !formRoomName.trim()) return;

    if (editingRoomId) {
      await onUpdateRoom(targetProperty.id, editingRoomId, {
        name: formRoomName.trim(),
        pricePerNight: Number(formRoomPrice) || 200,
        airbnbCode: formRoomCode.trim(),
        status: formRoomStatus,
        iCalUrl: formRoomIcal.trim() || undefined,
      });
      showToast(`✓ Cômodo "${formRoomName}" atualizado com sucesso!`);
    } else {
      await onCreateRoom(targetProperty.id, {
        name: formRoomName.trim(),
        pricePerNight: Number(formRoomPrice) || 200,
        airbnbCode: formRoomCode.trim(),
        status: formRoomStatus,
        iCalUrl: formRoomIcal.trim() || undefined,
      });
      showToast(`✓ Cômodo "${formRoomName}" adicionado ao imóvel "${targetProperty.name}"!`);
    }
    setIsRoomModalOpen(false);
  };

  const triggerResetConfirm = (title: string, description: string, confirmText: string, execute: () => Promise<void>) => {
    setPendingResetAction({
      title,
      description,
      confirmText,
      execute,
    });
    setIsResetConfirmModalOpen(true);
  };

  return (
    <div className="dev-panel-container">
      {/* HEADER DEV */}
      <div className="dev-header-card">
        <div className="dev-header-info">
          <div className="dev-badge-row">
            <span className="dev-super-badge">⚡ MODO DESENVOLVEDOR (DEV)</span>
            <span className="dev-online-badge">● Firestore Live Sync</span>
          </div>
          <h1 className="dev-title">Console de Engenharia & Banco de Dados</h1>
          <p className="dev-subtitle">
            Logado como <strong>{currentUser.name}</strong> (<code>{currentUser.email}</code>). Você tem acesso irrestrito para inspecionar logs de auditoria, criar/excluir usuários, gerenciar cômodos e restaurar coleções do banco.
          </p>
        </div>

        <div className="dev-header-actions">
          <button className="btn-dev-export" onClick={handleExportDatabaseBackup} title="Exportar JSON completo de todas as coleções">
            💾 Exportar Backup do Banco
          </button>
          <label className="btn-dev-import" title="Restaurar backup a partir de JSON">
            📥 Importar Backup JSON
            <input type="file" accept=".json" onChange={handleImportJsonFile} style={{ display: "none" }} />
          </label>
        </div>
      </div>

      {/* QUICK STATS CARDS */}
      <div className="dev-stats-grid">
        <div className="dev-stat-card" onClick={() => setActiveSubTab("logs")}>
          <span className="dev-stat-number">{logs.length}</span>
          <span className="dev-stat-label">📋 Logs Registrados</span>
          <span className="dev-stat-hint">Auditoria em tempo real</span>
        </div>
        <div className="dev-stat-card" onClick={() => setActiveSubTab("users")}>
          <span className="dev-stat-number">{usersList.length}</span>
          <span className="dev-stat-label">👥 Usuários no Banco</span>
          <span className="dev-stat-hint">{usersList.filter(u => u.role === "owner").length} proprietários</span>
        </div>
        <div className="dev-stat-card" onClick={() => setActiveSubTab("rooms")}>
          <span className="dev-stat-number">
            {properties.reduce((acc, p) => acc + (p.rooms?.length || 0), 0)}
          </span>
          <span className="dev-stat-label">🚪 Cômodos Cadastrados</span>
          <span className="dev-stat-hint">Em {properties.length} imóveis</span>
        </div>
        <div className="dev-stat-card danger" onClick={() => setActiveSubTab("database")}>
          <span className="dev-stat-number">{reservations.length}</span>
          <span className="dev-stat-label">📅 Reservas na Agenda</span>
          <span className="dev-stat-hint">Gerenciar / Resetar</span>
        </div>
      </div>

      {/* SUB-TABS NAVIGATION */}
      <div className="dev-subtabs-nav">
        <button
          className={`dev-subtab-btn ${activeSubTab === "logs" ? "active" : ""}`}
          onClick={() => setActiveSubTab("logs")}
        >
          📋 Logs de Auditoria ({logs.length})
        </button>
        <button
          className={`dev-subtab-btn ${activeSubTab === "users" ? "active" : ""}`}
          onClick={() => setActiveSubTab("users")}
        >
          👥 Usuários & Senhas ({usersList.length})
        </button>
        <button
          className={`dev-subtab-btn ${activeSubTab === "rooms" ? "active" : ""}`}
          onClick={() => setActiveSubTab("rooms")}
        >
          🚪 Cômodos & Vínculos ({properties.length} Imóveis)
        </button>
        <button
          className={`dev-subtab-btn danger ${activeSubTab === "database" ? "active" : ""}`}
          onClick={() => setActiveSubTab("database")}
        >
          💾 Console do Banco & Resets
        </button>
      </div>

      {/* ========================================================= */}
      {/* SUB-TAB 1: LOGS DE AUDITORIA SEPARADAMENTE */}
      {/* ========================================================= */}
      {activeSubTab === "logs" && (
        <div className="dev-subtab-content">
          <div className="dev-controls-bar">
            <div className="dev-pills-row">
              {[
                { id: "all", label: "Todos os Logs" },
                { id: "auth", label: "🔑 Autenticação" },
                { id: "user", label: "👤 Usuários" },
                { id: "property", label: "🏠 Imóveis" },
                { id: "room", label: "🚪 Cômodos" },
                { id: "reservation", label: "📅 Reservas" },
                { id: "database", label: "💾 Banco de Dados" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  className={`dev-pill ${logCategoryFilter === cat.id ? "active" : ""}`}
                  onClick={() => setLogCategoryFilter(cat.id)}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="dev-search-actions">
              <input
                type="text"
                className="dev-input-search"
                placeholder="Buscar por descrição, ação ou usuário..."
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
              />
              <button className="dev-btn-secondary" onClick={onRefreshLogs} title="Recarregar logs">
                🔄 Atualizar
              </button>
              <button className="dev-btn-secondary" onClick={handleExportLogs} title="Baixar JSON com logs">
                📥 Exportar
              </button>
              <button
                className="dev-btn-danger-outline"
                onClick={() => {
                  if (window.confirm("Deseja realmente limpar a visualização dos logs locais?")) {
                    onClearLogs();
                    showToast("Logs locais limpos.");
                  }
                }}
                title="Limpar logs"
              >
                🗑️ Limpar
              </button>
            </div>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="dev-empty-box">
              <span style={{ fontSize: "28px" }}>📝</span>
              <h3>Nenhum log encontrado para os filtros selecionados</h3>
              <p>As ações executadas no sistema (criação, edição, login, reservas e resets) aparecerão aqui em tempo real.</p>
            </div>
          ) : (
            <div className="dev-logs-table-wrap">
              <table className="dev-table">
                <thead>
                  <tr>
                    <th style={{ width: 150 }}>Data & Hora</th>
                    <th style={{ width: 140 }}>Ator / Usuário</th>
                    <th style={{ width: 110 }}>Categoria</th>
                    <th style={{ width: 140 }}>Ação</th>
                    <th>Descrição do Evento</th>
                    <th style={{ width: 70, textAlign: "center" }}>Detalhes</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const catColors: Record<string, { bg: string; color: string }> = {
                      auth: { bg: "rgba(59, 130, 246, 0.15)", color: "#3b82f6" },
                      user: { bg: "rgba(168, 85, 247, 0.15)", color: "#a855f7" },
                      property: { bg: "rgba(16, 185, 129, 0.15)", color: "#10b981" },
                      room: { bg: "rgba(245, 158, 11, 0.15)", color: "#f59e0b" },
                      reservation: { bg: "rgba(236, 72, 153, 0.15)", color: "#ec4899" },
                      database: { bg: "rgba(239, 68, 68, 0.15)", color: "#ef4444" },
                      security: { bg: "rgba(99, 102, 241, 0.15)", color: "#6366f1" },
                    };
                    const colorStyle = catColors[log.category] || { bg: "rgba(156, 163, 175, 0.15)", color: "#9ca3af" };

                    return (
                      <tr key={log.id} className={isExpanded ? "log-row-expanded" : ""}>
                        <td style={{ fontFamily: "monospace", fontSize: "12px", whiteSpace: "nowrap" }}>
                          {log.timeFormatted}
                        </td>
                        <td>
                          <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontWeight: "600", fontSize: "12.5px" }}>{log.actorName}</span>
                            <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>{log.actorEmail}</span>
                          </div>
                        </td>
                        <td>
                          <span
                            className="dev-tag"
                            style={{ backgroundColor: colorStyle.bg, color: colorStyle.color }}
                          >
                            {log.category.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <code style={{ fontSize: "11px", color: "#38bdf8", background: "rgba(56, 189, 248, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                            {log.action}
                          </code>
                        </td>
                        <td style={{ fontSize: "13px" }}>
                          {log.description}
                          {isExpanded && log.details && (
                            <div className="dev-log-details-box">
                              <strong>Payload & Metadados do Firestore:</strong>
                              <pre>{JSON.stringify(log.details, null, 2)}</pre>
                            </div>
                          )}
                        </td>
                        <td style={{ textAlign: "center" }}>
                          {log.details ? (
                            <button
                              className="dev-btn-icon-sm"
                              onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                              title="Expandir metadados"
                            >
                              {isExpanded ? "▲" : "▼"}
                            </button>
                          ) : (
                            <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 2: GESTÃO COMPLETA DE USUÁRIOS (DEV DIRETO) */}
      {/* ========================================================= */}
      {activeSubTab === "users" && (
        <div className="dev-subtab-content">
          <div className="dev-section-header">
            <div>
              <h2>Usuários Registrados no Firestore</h2>
              <p>O Dev tem controle total: criar qualquer nível de acesso, alterar senhas diretamente ou excluir sem pedir autorização.</p>
            </div>
            <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
              <button
                className="dev-btn-secondary"
                onClick={() => setShowPasswords(!showPasswords)}
              >
                {showPasswords ? "🔒 Ocultar Senhas" : "👁️ Revelar Senhas"}
              </button>
              <button className="dev-btn-primary" onClick={openCreateUserModal}>
                + Criar Usuário no Banco
              </button>
            </div>
          </div>

          <div className="dev-table-wrap">
            <table className="dev-table">
              <thead>
                <tr>
                  <th>Nome Completo</th>
                  <th>E-mail</th>
                  <th>Usuário (Login)</th>
                  <th>Nível / Role</th>
                  <th>Senha de Acesso</th>
                  <th>Imóveis Vinculados</th>
                  <th style={{ textAlign: "right" }}>Ações Dev</th>
                </tr>
              </thead>
              <tbody>
                {usersList.map((user) => {
                  const userProps = properties.filter((p) => p.ownerId === user.id);
                  const isCurrentDev = user.id === currentUser.id;

                  return (
                    <tr key={user.id}>
                      <td style={{ fontWeight: "600" }}>
                        {user.name} {isCurrentDev && <span className="dev-badge-you">(Você)</span>}
                      </td>
                      <td>{user.email}</td>
                      <td>
                        <code>{user.username || user.email.split("@")[0]}</code>
                      </td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role === "dev" ? "⚡ DEV" : user.role === "admin" ? "🛡️ ADMIN" : "👤 PROPRIETÁRIO"}
                        </span>
                      </td>
                      <td>
                        {showPasswords ? (
                          <code style={{ color: "#f59e0b", background: "rgba(245, 158, 11, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
                            {user.password || "(sem senha)"}
                          </code>
                        ) : (
                          <span style={{ letterSpacing: "2px", color: "var(--text-secondary)" }}>••••••••</span>
                        )}
                      </td>
                      <td>
                        {user.role === "owner" ? (
                          <span className="owner-prop-count">
                            {userProps.length} imóvel(is)
                          </span>
                        ) : (
                          <span style={{ color: "var(--text-secondary)", fontSize: "11px" }}>Gestão Global</span>
                        )}
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          className="dev-action-btn edit"
                          onClick={() => openEditUserModal(user)}
                          title="Editar usuário e senha"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          className="dev-action-btn copy"
                          onClick={() => {
                            const origin = getPrettyAppOrigin();
                            const link = `${origin.replace(/\/+$/, "")}/?owner=${user.id}`;
                            navigator.clipboard.writeText(
                              `🔑 *Acesso PropertyHub*\n👤 Usuário: ${user.username}\n🔐 Senha: ${user.password}\n🌐 Link: ${link}`
                            );
                            showToast(`✓ Credenciais de ${user.name} copiadas para WhatsApp!`);
                          }}
                          title="Copiar dados de acesso com link amigável"
                        >
                          📋 Copiar Acesso
                        </button>
                        {!isCurrentDev && (
                          <button
                            className="dev-action-btn delete"
                            onClick={async () => {
                              if (window.confirm(`Tem certeza que deseja EXCLUIR o usuário "${user.name}"? Os imóveis dele ficarão marcados como "Sem Proprietário". Não é necessário pedir permissão ao admin.`)) {
                                await onDeleteUser(user.id);
                                showToast(`✓ Usuário ${user.name} excluído do Firestore com sucesso.`);
                              }
                            }}
                            title="Excluir usuário imediatamente"
                          >
                            🗑️ Excluir
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 3: CÔMODOS & VÍNCULOS DE IMÓVEIS */}
      {/* ========================================================= */}
      {activeSubTab === "rooms" && (
        <div className="dev-subtab-content">
          <div className="dev-section-header">
            <div>
              <h2>Gestão Direta de Cômodos & Vínculos</h2>
              <p>Crie novos cômodos/quartos, edite tarifas ou vincule/desvincule imóveis a qualquer proprietário sem intermediação do admin.</p>
            </div>
            {targetProperty && (
              <button className="dev-btn-primary" onClick={openCreateRoomModal}>
                + Adicionar Cômodo a "{targetProperty.name}"
              </button>
            )}
          </div>

          {/* SELETOR DE IMÓVEL */}
          <div className="dev-property-selector-box">
            <label style={{ fontSize: "13px", fontWeight: "700" }}>Selecione o Imóvel para Gerenciar Cômodos:</label>
            <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap", marginTop: "6px" }}>
              <select
                className="dev-select"
                style={{ flex: 1, minWidth: 260 }}
                value={selectedPropertyId}
                onChange={(e) => setSelectedPropertyId(e.target.value)}
              >
                {properties.map((prop) => {
                  const owner = usersList.find((u) => u.id === prop.ownerId);
                  return (
                    <option key={prop.id} value={prop.id}>
                      {prop.name} — ({owner ? owner.name : "⚠️ Sem Proprietário"}) — {prop.rooms?.length || 0} cômodos
                    </option>
                  );
                })}
              </select>

              {/* VINCULAR PROPRIETÁRIO DIRETO */}
              {targetProperty && (
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>Proprietário Vinculado:</span>
                  <select
                    className="dev-select-sm"
                    value={targetProperty.ownerId || ""}
                    onChange={async (e) => {
                      const newOwnerId = e.target.value;
                      await onAssignPropertyOwner(targetProperty.id, newOwnerId);
                      showToast(`✓ Vínculo do imóvel "${targetProperty.name}" atualizado no Firestore!`);
                    }}
                  >
                    <option value="">⚠️ Sem Proprietário (Desvinculado)</option>
                    {usersList
                      .filter((u) => u.role === "owner")
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name} ({o.email})
                        </option>
                      ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          {/* LISTA DE CÔMODOS DO IMÓVEL */}
          {targetProperty && (
            <div style={{ marginTop: "16px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                <h3 style={{ fontSize: "15px", fontWeight: "700" }}>
                  Cômodos cadastrados em <em>"{targetProperty.name}"</em> ({targetProperty.rooms?.length || 0})
                </h3>
              </div>

              {(!targetProperty.rooms || targetProperty.rooms.length === 0) ? (
                <div className="dev-empty-box">
                  <p>Este imóvel não possui cômodos cadastrados ainda.</p>
                  <button className="dev-btn-primary" onClick={openCreateRoomModal}>
                    Criar Primeiro Cômodo
                  </button>
                </div>
              ) : (
                <div className="dev-rooms-grid">
                  {targetProperty.rooms.map((room) => (
                    <div className="dev-room-card" key={room.id}>
                      <div className="dev-room-header">
                        <h4>{room.name}</h4>
                        <span className={`room-status-badge ${room.status.toLowerCase()}`}>
                          {room.status}
                        </span>
                      </div>

                      <div className="dev-room-meta">
                        <div>
                          <span className="dev-meta-label">Diária:</span>
                          <span className="dev-meta-val">
                            {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(room.pricePerNight)}
                          </span>
                        </div>
                        <div>
                          <span className="dev-meta-label">Código Airbnb:</span>
                          <span className="dev-meta-val"><code>{room.airbnbCode || "N/A"}</code></span>
                        </div>
                      </div>

                      {room.iCalUrl && (
                        <div style={{ fontSize: "11px", color: "var(--text-secondary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          iCal: <code>{room.iCalUrl}</code>
                        </div>
                      )}

                      <div className="dev-room-actions">
                        <button
                          className="dev-action-btn edit"
                          onClick={() => openEditRoomModal(room)}
                        >
                          ✏️ Editar Cômodo
                        </button>
                        <button
                          className="dev-action-btn delete"
                          onClick={async () => {
                            if (window.confirm(`Tem certeza que deseja excluir o cômodo "${room.name}" deste imóvel?`)) {
                              await onDeleteRoom(targetProperty.id, room.id);
                              showToast(`✓ Cômodo "${room.name}" removido!`);
                            }
                          }}
                        >
                          🗑️ Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================= */}
      {/* SUB-TAB 4: CONSOLE DO BANCO DE DADOS & RESETS */}
      {/* ========================================================= */}
      {activeSubTab === "database" && (
        <div className="dev-subtab-content">
          <div className="dev-section-header">
            <div>
              <h2 style={{ color: "#ef4444" }}>Console de Reset & Restauração do Banco de Dados</h2>
              <p>Ferramentas diretas de engenharia: limpe ou restaure usuários, esvazie a agenda de reservas, faça backup ou resete o banco para o estado original.</p>
            </div>
          </div>

          <div className="dev-reset-grid">
            {/* CARD 1: RESET DE AGENDA / RESERVAS */}
            <div className="dev-reset-card">
              <div className="dev-reset-header">
                <span className="dev-reset-icon">📅</span>
                <div>
                  <h3>Agenda & Reservas ({reservations.length} ativas)</h3>
                  <p>Limpar reservas antigas, esvaziar a agenda ou restaurar datas de teste</p>
                </div>
              </div>

              <div className="dev-reset-buttons">
                <button
                  className="dev-btn-reset-warning"
                  onClick={() => {
                    triggerResetConfirm(
                      "Esvaziar Toda a Agenda",
                      `Você está prestes a apagar todas as ${reservations.length} reservas registradas no Firestore. A agenda ficará completamente livre.`,
                      "Confirmar e Esvaziar Agenda",
                      async () => {
                        await onResetReservations("clear_all");
                        showToast("✓ Agenda e reservas esvaziadas com sucesso!");
                      }
                    );
                  }}
                >
                  🧹 Esvaziar Toda a Agenda
                </button>

                <button
                  className="dev-btn-reset-neutral"
                  onClick={() => {
                    triggerResetConfirm(
                      "Restaurar Reservas de Demonstração",
                      "Esta ação reconfigura a agenda com as 3 reservas padrão de teste distribuídas nos imóveis.",
                      "Restaurar Agenda Demo",
                      async () => {
                        await onResetReservations("restore_initial");
                        showToast("✓ Reservas padrão de teste restauradas na agenda!");
                      }
                    );
                  }}
                >
                  🔄 Restaurar Reservas Demo (Padrão)
                </button>

                {/* Resetar reservas por imóvel */}
                <div style={{ marginTop: "12px", borderTop: "1px solid var(--border-light)", paddingTop: "12px" }}>
                  <label style={{ fontSize: "12px", fontWeight: "600", display: "block", marginBottom: "6px" }}>
                    Limpar reservas de um imóvel específico:
                  </label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <select
                      className="dev-select-sm"
                      style={{ flex: 1 }}
                      value={resetPropTarget}
                      onChange={(e) => setResetPropTarget(e.target.value)}
                    >
                      {properties.map((p) => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <button
                      className="dev-btn-reset-warning"
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                      onClick={() => {
                        const targetP = properties.find((p) => p.id === resetPropTarget);
                        triggerResetConfirm(
                          `Limpar reservas de "${targetP?.name}"`,
                          `Todas as reservas cadastradas para o imóvel "${targetP?.name}" serão removidas do Firestore.`,
                          "Limpar Reservas Deste Imóvel",
                          async () => {
                            await onResetReservations("clear_by_prop", resetPropTarget);
                            showToast(`✓ Reservas de "${targetP?.name}" limpas!`);
                          }
                        );
                      }}
                    >
                      Limpar
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* CARD 2: RESET DE USUÁRIOS */}
            <div className="dev-reset-card">
              <div className="dev-reset-header">
                <span className="dev-reset-icon">👥</span>
                <div>
                  <h3>Usuários & Contas ({usersList.length} cadastrados)</h3>
                  <p>Restaurar usuários originais ou limpar proprietários criados em testes</p>
                </div>
              </div>

              <div className="dev-reset-buttons">
                <button
                  className="dev-btn-reset-neutral"
                  onClick={() => {
                    triggerResetConfirm(
                      "Restaurar Usuários Originais de Fábrica",
                      "Restaura a lista base com o Dev micaelbardimtech@gmail.com, o Administrador e os 2 proprietários padrão (João e Maria).",
                      "Restaurar Usuários Iniciais",
                      async () => {
                        await onResetUsers("restore_initial");
                        showToast("✓ Usuários de fábrica restaurados com sucesso!");
                      }
                    );
                  }}
                >
                  🔄 Restaurar Usuários Iniciais
                </button>

                <button
                  className="dev-btn-reset-warning"
                  onClick={() => {
                    triggerResetConfirm(
                      "Limpar Todos os Proprietários",
                      "Remove todas as contas de proprietários cadastradas, preservando o Dev e o Administrador.",
                      "Limpar Proprietários",
                      async () => {
                        await onResetUsers("clear_owners");
                        showToast("✓ Todos os proprietários de teste foram removidos!");
                      }
                    );
                  }}
                >
                  🧹 Limpar Apenas Proprietários
                </button>
              </div>
            </div>

            {/* CARD 3: RESET DE IMÓVEIS */}
            <div className="dev-reset-card">
              <div className="dev-reset-header">
                <span className="dev-reset-icon">🏠</span>
                <div>
                  <h3>Imóveis Cadastrados ({properties.length} imóveis)</h3>
                  <p>Restaurar os 3 imóveis completos de demonstração ou esvaziar</p>
                </div>
              </div>

              <div className="dev-reset-buttons">
                <button
                  className="dev-btn-reset-neutral"
                  onClick={() => {
                    triggerResetConfirm(
                      "Restaurar Imóveis Iniciais",
                      "Recarrega os 3 imóveis originais com suas fotos, comodidades, quartos e descrições no Firestore.",
                      "Restaurar Imóveis Iniciais",
                      async () => {
                        await onResetProperties("restore_initial");
                        showToast("✓ Imóveis iniciais restaurados com sucesso!");
                      }
                    );
                  }}
                >
                  🔄 Restaurar Imóveis Iniciais
                </button>

                <button
                  className="dev-btn-reset-warning"
                  onClick={() => {
                    triggerResetConfirm(
                      "Esvaziar Todos os Imóveis",
                      "Apaga todos os imóveis cadastrados no Firestore. Use com cautela.",
                      "Esvaziar Imóveis",
                      async () => {
                        await onResetProperties("clear_all");
                        showToast("✓ Imóveis esvaziados no Firestore!");
                      }
                    );
                  }}
                >
                  🧹 Esvaziar Todos os Imóveis
                </button>
              </div>
            </div>

            {/* CARD 4: RESET DE FÁBRICA COMPLETO (ZERO BALA) */}
            <div className="dev-reset-card danger-card">
              <div className="dev-reset-header">
                <span className="dev-reset-icon">⚡</span>
                <div>
                  <h3 style={{ color: "#ef4444" }}>Reset de Fábrica Total (Hard Reset)</h3>
                  <p>Restaura todo o banco para o estado original zero bala (Usuários, Imóveis e Agenda)</p>
                </div>
              </div>

              <div className="dev-reset-buttons">
                <button
                  className="dev-btn-reset-danger"
                  onClick={() => {
                    triggerResetConfirm(
                      "⚠️ HARD RESET — Zerar e Restaurar Todo o Banco",
                      "Esta ação redefinirá completamente as coleções 'users', 'properties' e 'reservations' do Firestore para a configuração de fábrica limpa. Seu acesso de Dev (micaelbardimtech@gmail.com) será mantido intacto.",
                      "Sim, Executar Reset de Fábrica",
                      async () => {
                        await onFullFactoryReset();
                        showToast("✓ Reset de fábrica completo concluído com sucesso!");
                      }
                    );
                  }}
                >
                  💣 Executar Reset de Fábrica Total
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR USUÁRIO */}
      {/* ========================================================= */}
      {isUserModalOpen && (
        <div className="modal-overlay" onClick={() => setIsUserModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingUserId ? "Editar Usuário no Banco" : "Criar Usuário no Banco (Dev)"}</h3>
              <button className="modal-close-btn" onClick={() => setIsUserModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveUser}>
              <div className="modal-body">
                <label className="form-label">
                  Nível de Acesso (Role)
                  <select
                    className="form-select"
                    value={formUserRole}
                    onChange={(e) => setFormUserRole(e.target.value as Role)}
                  >
                    <option value="owner">Proprietário (Acesso Restrito aos Próprios Imóveis)</option>
                    <option value="admin">Administrador (Gestão Geral)</option>
                    <option value="dev">Desenvolvedor (Acesso Total + Logs + Banco)</option>
                  </select>
                </label>

                <label className="form-label">
                  Nome Completo
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: João da Silva"
                    value={formUserName}
                    onChange={(e) => setFormUserName(e.target.value)}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="form-label">
                    Nome de Usuário (Login)
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Ex: joaosilva"
                      value={formUserUsername}
                      onChange={(e) => setFormUserUsername(e.target.value)}
                      required
                    />
                  </label>

                  <label className="form-label">
                    E-mail
                    <input
                      className="form-input"
                      type="email"
                      placeholder="joao@email.com"
                      value={formUserEmail}
                      onChange={(e) => setFormUserEmail(e.target.value)}
                      required
                    />
                  </label>
                </div>

                <label className="form-label">
                  Senha de Acesso
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Digite a senha desejada"
                    value={formUserPassword}
                    onChange={(e) => setFormUserPassword(e.target.value)}
                    required
                  />
                </label>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsUserModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingUserId ? "Salvar Alterações" : "Gravar no Banco"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CRIAR / EDITAR CÔMODO */}
      {/* ========================================================= */}
      {isRoomModalOpen && targetProperty && (
        <div className="modal-overlay" onClick={() => setIsRoomModalOpen(false)}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h3>{editingRoomId ? "Editar Cômodo / Quarto" : "Novo Cômodo / Quarto"}</h3>
                <span style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                  Imóvel: {targetProperty.name}
                </span>
              </div>
              <button className="modal-close-btn" onClick={() => setIsRoomModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleSaveRoom}>
              <div className="modal-body">
                <label className="form-label">
                  Nome do Cômodo / Acomodação
                  <input
                    className="form-input"
                    type="text"
                    placeholder="Ex: Suíte Presidencial, Quarto Casal, Acomodação 201"
                    value={formRoomName}
                    onChange={(e) => setFormRoomName(e.target.value)}
                    required
                  />
                </label>

                <div className="form-row">
                  <label className="form-label">
                    Diária Base (R$)
                    <input
                      className="form-input"
                      type="number"
                      placeholder="250"
                      value={formRoomPrice}
                      onChange={(e) => setFormRoomPrice(Number(e.target.value))}
                      required
                    />
                  </label>

                  <label className="form-label">
                    Status Inicial
                    <select
                      className="form-select"
                      value={formRoomStatus}
                      onChange={(e) => setFormRoomStatus(e.target.value as any)}
                    >
                      <option value="Disponível">Disponível</option>
                      <option value="Ocupado">Ocupado</option>
                      <option value="Manutenção">Manutenção</option>
                    </select>
                  </label>
                </div>

                <div className="form-row">
                  <label className="form-label">
                    Código Airbnb / PMS
                    <input
                      className="form-input"
                      type="text"
                      placeholder="Ex: ARR123456"
                      value={formRoomCode}
                      onChange={(e) => setFormRoomCode(e.target.value)}
                    />
                  </label>

                  <label className="form-label">
                    Link iCal do Calendário (Opcional)
                    <input
                      className="form-input"
                      type="url"
                      placeholder="https://www.airbnb.com.br/calendar/ical/..."
                      value={formRoomIcal}
                      onChange={(e) => setFormRoomIcal(e.target.value)}
                    />
                  </label>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsRoomModalOpen(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  {editingRoomId ? "Atualizar Cômodo" : "Adicionar Cômodo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* MODAL: CONFIRMAÇÃO DE RESET SEGURO */}
      {/* ========================================================= */}
      {isResetConfirmModalOpen && pendingResetAction && (
        <div className="modal-overlay" onClick={() => setIsResetConfirmModalOpen(false)}>
          <div className="modal-container" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ color: "#ef4444" }}>⚠️ {pendingResetAction.title}</h3>
              <button className="modal-close-btn" onClick={() => setIsResetConfirmModalOpen(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-primary)" }}>
                {pendingResetAction.description}
              </p>
              <div style={{ marginTop: "14px", padding: "12px", background: "rgba(239, 68, 68, 0.1)", borderRadius: "8px", color: "#ef4444", fontSize: "12px" }}>
                🛡️ <strong>Ação de Engenharia:</strong> Esta modificação afetará diretamente as coleções do Firestore e a sincronização em tempo real de todos os navegadores conectados.
              </div>
            </div>
            <div className="modal-footer">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setIsResetConfirmModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="dev-btn-reset-danger"
                onClick={async () => {
                  const action = pendingResetAction.execute;
                  setIsResetConfirmModalOpen(false);
                  await action();
                }}
              >
                {pendingResetAction.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
