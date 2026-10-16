import { useState } from "react";

interface WikiTabProps {
  onStartInteractiveTour: (tourId: "create_property" | "create_reservation" | "assign_owner") => void;
  getPrettyAppOrigin: () => string;
  isDev?: boolean;
}

export default function WikiTab({
  onStartInteractiveTour,
  getPrettyAppOrigin,
  isDev = false,
}: WikiTabProps) {
  const [selectedTopic, setSelectedTopic] = useState<string>("property");

  // Lista de tópicos - O tópico do Dev só é incluído se o usuário logado for Dev!
  const topics = [
    { id: "property", label: "🏠 1. Cadastrar Imóvel (Airbnb)", icon: "🏠" },
    { id: "edit_property", label: "⚙️ 2. Editar Configurações do Imóvel", icon: "⚙️" },
    { id: "calendar", label: "📅 3. Agendar & Vincular no Calendário", icon: "📅" },
    { id: "status", label: "🟡 4. Gestão de Status (Pendente x Confirmada)", icon: "🟡" },
    { id: "edit_user", label: "👤 5. Editar Usuários, Nome e Senha", icon: "👤" },
    { id: "assign", label: "👥 6. Vincular Imóvel ao Proprietário", icon: "👥" },
    { id: "whatsapp", label: "📲 7. Enviar Acesso via WhatsApp", icon: "📲" },
    { id: "ical", label: "🔄 8. Sincronização iCal do Airbnb", icon: "🔄" },
    ...(isDev ? [{ id: "dev", label: "⚡ 9. Funções do Desenvolvedor & DB", icon: "⚡" }] : []),
  ];

  return (
    <div className="wiki-container">
      {/* HEADER WIKI */}
      <div className="wiki-hero-header">
        <div className="wiki-hero-info">
          <div className="wiki-badge">📘 CENTRAL DE AJUDA & WIKI OPERACIONAL</div>
          <h1 className="wiki-title">Manual Completo & Treinamento Prático</h1>
          <p className="wiki-subtitle">
            Aprenda a operar todas as funções da plataforma passo a passo. Utilize os <strong>assistentes práticos com animação</strong> que destacam cada campo e botão na tela até concluir a operação por completo.
          </p>
        </div>
        <div className="wiki-hero-actions">
          <button
            className="btn-wiki-action-primary"
            onClick={() => onStartInteractiveTour("create_property")}
          >
            🚀 Praticar: Criar Imóvel Completo
          </button>
          <button
            className="btn-wiki-action-secondary"
            onClick={() => onStartInteractiveTour("create_reservation")}
          >
            📅 Praticar: Agendar no Calendário
          </button>
        </div>
      </div>

      {/* LAYOUT WIKI: SIDEBAR DE TÓPICOS + CONTEÚDO */}
      <div className="wiki-content-layout">
        {/* MENU LATERAL DE TÓPICOS */}
        <aside className="wiki-sidebar-nav">
          <span className="wiki-nav-label">Tópicos do Manual</span>
          {topics.map((t) => (
            <button
              key={t.id}
              className={`wiki-topic-btn ${selectedTopic === t.id ? "active" : ""}`}
              onClick={() => setSelectedTopic(t.id)}
            >
              <span>{t.label}</span>
            </button>
          ))}

          <div className="wiki-quick-tour-box">
            <span style={{ fontSize: "12px", fontWeight: "700", color: "#10b981", display: "block", marginBottom: "4px" }}>
              💡 Treinamento com Animação
            </span>
            <p style={{ fontSize: "11.5px", color: "var(--text-secondary)", margin: "0 0 10px 0", lineHeight: "1.4" }}>
              O site te encaminha para a tela e ilumina cada botão em sequência até você concluir o fluxo!
            </p>
            <button
              className="btn-tour-pill"
              onClick={() => onStartInteractiveTour("create_property")}
            >
              Tour Completo: Novo Imóvel →
            </button>
            <button
              className="btn-tour-pill"
              onClick={() => onStartInteractiveTour("create_reservation")}
              style={{ marginTop: "6px" }}
            >
              Tour: Vincular Reserva →
            </button>
          </div>
        </aside>

        {/* ÁREA PRINCIPAL DO TÓPICO */}
        <div className="wiki-main-topic">
          {/* TÓPICO 1: CADASTRAR IMÓVEL */}
          {selectedTopic === "property" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Cadastrar um Novo Imóvel no Sistema</h2>
                <button
                  className="btn-wiki-practice"
                  onClick={() => onStartInteractiveTour("create_property")}
                  title="O assistente vai te levar para cada botão na tela até criar o imóvel completo"
                >
                  ▶️ Iniciar Treinamento Guiado (Passo a Passo Animado)
                </button>
              </div>

              <p className="wiki-lead">
                O cadastro de imóveis permite registrar apartamentos, casas, studios e coberturas com fotos em alta definição, diária base, comodidades e vinculação com o Airbnb.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Acesse a aba "Imóveis"</h4>
                    <p>No menu lateral esquerdo, clique em <strong>Imóveis</strong> para ver o catálogo.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Clique no botão "+ Novo Imóvel"</h4>
                    <p>Localizado no topo superior direito da tela. O formulário completo será aberto.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Preencha o Nome e Categoria</h4>
                    <p>
                      Informe o título comercial (ex: <em>"Apartamento Copacabana Vista Mar"</em>), selecione o tipo de acomodação e defina o proprietário ou deixe como <em>"Sem Proprietário"</em>.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">4</span>
                  <div className="wiki-step-content">
                    <h4>Endereço Completo & Cidade</h4>
                    <p>Digite a rua, número, bairro e cidade/UF para facilitar a identificação e geolocalização dos hóspedes.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">5</span>
                  <div className="wiki-step-content">
                    <h4>Diária Base, Hóspedes e Quartos</h4>
                    <p>
                      Defina o valor da diária padrão em R$, a lotação máxima de hóspedes, quantidade de quartos e banheiros.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">6</span>
                  <div className="wiki-step-content">
                    <h4>Foto de Capa com o Gerador PostImages</h4>
                    <p>
                      Clique no botão azul <strong>"📷 Abrir gerador PostImages ↗"</strong>, envie a foto do imóvel e copie o <strong>Link direto</strong> (com final <code>.jpg</code> ou <code>.png</code>). Cole no campo correspondente para visualizar a prévia instantânea.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">7</span>
                  <div className="wiki-step-content">
                    <h4>Clique em "Salvar Imóvel no Firebase"</h4>
                    <p>
                      O imóvel será imediatamente gravado no Firestore e disponibilizado para reservas e vinculação de proprietários!
                    </p>
                  </div>
                </div>
              </div>

              <div className="wiki-tip-box">
                💡 <strong>Prática Interativa:</strong> Clique no botão <strong>"▶️ Iniciar Treinamento Guiado"</strong> acima para ser conduzido botão por botão através de uma animação visual iluminada!
              </div>
            </div>
          )}

          {/* TÓPICO 2: EDITAR CONFIGURAÇÕES DO IMÓVEL */}
          {selectedTopic === "edit_property" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Editar as Configurações de um Imóvel</h2>
              </div>

              <p className="wiki-lead">
                Você pode editar a qualquer momento o nome, foto de capa, comodidades, preços de diária, capacidade, links de anúncio e o proprietário vinculado de qualquer imóvel cadastrado.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Localize o Card do Imóvel</h4>
                    <p>Na aba <strong>Imóveis</strong> ou dentro do painel do proprietário em <strong>Proprietários</strong>, localize o card do imóvel que deseja modificar.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Clique no Botão "Editar" (⚙️ Configurações)</h4>
                    <p>
                      Em cada card de imóvel, existe o botão <strong>Editar</strong> (ícone de lápis / configurações). Clique nele para abrir o modal de configurações completas.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Atualize os Campos Desejados</h4>
                    <ul>
                      <li><strong>Título / Nome:</strong> Mude o título público do anúncio.</li>
                      <li><strong>Proprietário Vinculado:</strong> Transfira o imóvel para outro dono ou desvincule.</li>
                      <li><strong>Diária e Lotação:</strong> Ajuste valores de alta/baixa temporada e limites de hóspedes.</li>
                      <li><strong>Trocar Foto de Capa:</strong> Altere a URL da imagem com prévia ao vivo.</li>
                      <li><strong>Comodidades e iCal:</strong> Atualize Wi-Fi, piscina, ar-condicionado e link de sincronização.</li>
                    </ul>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">4</span>
                  <div className="wiki-step-content">
                    <h4>Clique em "Salvar Alterações"</h4>
                    <p>As modificações são sincronizadas imediatamente no banco de dados Firestore e refletidas no portal do proprietário.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 3: CALENDÁRIO & AGENDAMENTO */}
          {selectedTopic === "calendar" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Agendar uma Reserva & Vincular no Calendário</h2>
                <button
                  className="btn-wiki-practice"
                  onClick={() => onStartInteractiveTour("create_reservation")}
                >
                  ▶️ Praticar Agendamento no Calendário
                </button>
              </div>

              <p className="wiki-lead">
                O calendário oferece visão em Grade Mensal ou Linha do Tempo por Imóvel, com identificação de feriados e 2 cores principais de status.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Acesse "Calendário / Agenda"</h4>
                    <p>Clique em <strong>Calendário / Agenda</strong> no menu lateral.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Clique em "+ Vincular Reserva no Imóvel"</h4>
                    <p>
                      Clique no botão <strong>+ Vincular Reserva no Imóvel</strong> no topo ou clique diretamente sobre qualquer dia vago do calendário.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Preencha o Nome do Cliente e as Datas</h4>
                    <ul>
                      <li><strong>Imóvel:</strong> Selecione qual propriedade está sendo alugada.</li>
                      <li><strong>Nome do Cliente / Hóspede:</strong> Nome completo para a ficha de hospedagem.</li>
                      <li><strong>Check-in e Check-out:</strong> O sistema calcula as diárias automaticamente.</li>
                      <li><strong>Status da Reserva:</strong> Escolha entre <strong>🟢 Confirmada</strong> ou <strong>🟡 Pendente da confirmação</strong>.</li>
                    </ul>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">4</span>
                  <div className="wiki-step-content">
                    <h4>Salvar e Visualizar na Grade</h4>
                    <p>A reserva será inserida na cor exata do status escolhido e bloqueará o período para novos lançamentos.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 4: GESTÃO DE STATUS (PENDENTE X CONFIRMADA) */}
          {selectedTopic === "status" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Alternar Status entre Pendente e Confirmada</h2>
              </div>

              <p className="wiki-lead">
                O calendário possui <strong>2 cores de status oficiais</strong> para controle ágil da ocupação:
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px", margin: "16px 0" }}>
                <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(245, 158, 11, 0.12)", border: "1.5px solid #f59e0b" }}>
                  <h3 style={{ margin: "0 0 6px 0", color: "#b45309", fontSize: "15px" }}>🟡 Pendente da Confirmação</h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)" }}>
                    Indica pré-reserva ou intenção de locação aguardando comprovante de sinal, caução ou confirmação bancária.
                  </p>
                </div>

                <div style={{ padding: "16px", borderRadius: "10px", background: "rgba(16, 185, 129, 0.12)", border: "1.5px solid #10b981" }}>
                  <h3 style={{ margin: "0 0 6px 0", color: "#047857", fontSize: "15px" }}>🟢 Confirmada</h3>
                  <p style={{ margin: 0, fontSize: "12.5px", color: "var(--text-secondary)" }}>
                    Reserva 100% garantida e confirmada pelo Administrador. Período bloqueado com status verde.
                  </p>
                </div>
              </div>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Como o Administrador Altera o Status</h4>
                    <p>
                      <strong>Opção A (Clique Rápido):</strong> Na agenda lateral do dia selecionado, clique no chip de status da reserva para alternar instantaneamente entre 🟢 e 🟡.
                      <br />
                      <strong>Opção B (Modal Detalhado):</strong> Clique no card da reserva para abrir o modal de detalhes e clique nos botões <em>[🟢 Confirmar Reserva]</em> ou <em>[🟡 Deixar Pendente]</em>.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Segurança & Permissão</h4>
                    <p>
                      O proprietário apenas visualiza a agenda e as cores em modo leitura. Somente Administradores e Desenvolvedores têm permissão para mudar o status.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 5: EDITAR USUÁRIOS, NOME E SENHA */}
          {selectedTopic === "edit_user" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Editar Usuários, Alterar Nome e Trocar Senha</h2>
              </div>

              <p className="wiki-lead">
                O PropertyHub permite que o Administrador altere o nome, e-mail e redefina a senha de qualquer proprietário, além de permitir que cada usuário troque sua própria senha.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Editar Dados de um Proprietário</h4>
                    <p>
                      1. Acesse a aba <strong>Proprietários</strong>.<br />
                      2. Clique no card do proprietário para entrar no painel dele.<br />
                      3. No cabeçalho, clique no botão <strong>"✏️ Editar Nome e Senha"</strong>.<br />
                      4. Altere o nome, nome de usuário ou digite uma <strong>nova senha</strong> de acesso.<br />
                      5. Clique em <strong>Salvar Alterações</strong>. A nova senha passa a valer imediatamente no login.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Alterar Minha Própria Senha</h4>
                    <p>
                      1. Acesse a aba <strong>Configurações</strong> no menu lateral.<br />
                      2. Na seção <strong>"Meu Perfil & Alterar Senha"</strong>, digite seu novo nome ou nova senha.<br />
                      3. Clique em <strong>Salvar Perfil</strong>.
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Reenviar Nova Senha via WhatsApp</h4>
                    <p>
                      Após alterar a senha de um proprietário, clique em <strong>"Copiar Acesso (WhatsApp)"</strong>. Uma mensagem com o nome, usuário, nova senha e link amigável já formatado será copiada para sua área de transferência para envio direto!
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 6: VINCULAR IMÓVEL AO PROPRIETÁRIO */}
          {selectedTopic === "assign" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Vincular ou Trocar o Proprietário de um Imóvel</h2>
                <button
                  className="btn-wiki-practice"
                  onClick={() => onStartInteractiveTour("assign_owner")}
                >
                  ▶️ Praticar Vínculo de Imóvel
                </button>
              </div>

              <p className="wiki-lead">
                Os imóveis podem ser vinculados a proprietários cadastrados ou mantidos como "Sem Proprietário" para gestão direta.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Acesse a aba "Imóveis"</h4>
                    <p>Localize o imóvel desejado no catálogo.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Clique em "Vincular" ou "Trocar Dono"</h4>
                    <p>O cartão central será exibido com todos os proprietários cadastrados.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Selecione o Proprietário e Confirme</h4>
                    <p>
                      Ao confirmar, o imóvel passa a aparecer instantaneamente no painel e no link exclusivo daquele proprietário.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 7: WHATSAPP */}
          {selectedTopic === "whatsapp" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Enviar o Acesso Formatado pelo WhatsApp</h2>
              </div>

              <p className="wiki-lead">
                Envie aos proprietários mensagens prontas e elegantes com o link amigável (<code>rjadmlocação.com.br</code>) e os dados de login.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>Abra o Card do Proprietário</h4>
                    <p>Na aba <strong>Proprietários</strong>, clique no card do proprietário.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Clique em "Copiar Acesso (WhatsApp)"</h4>
                    <p>
                      O sistema copia automaticamente uma mensagem com saudação personalizada, usuário, senha e o link bonito ({getPrettyAppOrigin()}).
                    </p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Cole e Envie no WhatsApp</h4>
                    <p>
                      Basta colar no chat do proprietário. Ao clicar no link, o proprietário entra direto no painel com seus imóveis e calendário exclusivo.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 8: ICAL */}
          {selectedTopic === "ical" && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>Como Sincronizar Calendário com o Airbnb (iCal)</h2>
              </div>

              <p className="wiki-lead">
                A sincronização por iCal permite que o PropertyHub leia as datas bloqueadas pelo Airbnb automaticamente sem expor senhas.
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>No Airbnb (Computador ou Navegador)</h4>
                    <p>Acesse seu painel de anfitrião &rarr; <strong>Anúncios</strong> &rarr; Escolha o anúncio &rarr; <strong>Preços e disponibilidade</strong> &rarr; Role até <strong>Sincronização de calendários</strong> &rarr; Clique em <strong>Exportar calendário</strong>.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>Copie o Link do Calendário</h4>
                    <p>É uma URL que termina com <code>.ics</code>.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>Cole no PropertyHub</h4>
                    <p>Cole no campo <strong>"Link iCal do Calendário Airbnb"</strong> do imóvel ou nas configurações do imóvel.</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TÓPICO 9: FUNÇÕES DO DEV & DB (EXCLUSIVO PARA DEV) */}
          {selectedTopic === "dev" && isDev && (
            <div className="wiki-card-body animate-fade-in">
              <div className="wiki-card-header">
                <h2>⚡ Funções Exclusivas do Desenvolvedor (Dev)</h2>
              </div>

              <p className="wiki-lead">
                O login do Dev (<code>micaelbardimtech@gmail.com</code>) possui privilégios de superusuário na aba <strong>Console Dev & DB</strong>:
              </p>

              <div className="wiki-steps-list">
                <div className="wiki-step-item">
                  <span className="wiki-step-number">1</span>
                  <div className="wiki-step-content">
                    <h4>📋 Logs de Auditoria Separados</h4>
                    <p>Registro em tempo real de cada login, criação de imóvel, reserva, alteração e exclusão com filtros e exportação JSON.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">2</span>
                  <div className="wiki-step-content">
                    <h4>👥 Gestão Direta de Usuários</h4>
                    <p>Criar qualquer perfil de usuário, alterar dados, revelar senhas e excluir sem pedir permissão para o administrador.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">3</span>
                  <div className="wiki-step-content">
                    <h4>🚪 Gestão de Cômodos (Quartos)</h4>
                    <p>Adicionar novas acomodações a qualquer imóvel, alterar tarifas diárias e sincronizar iCals.</p>
                  </div>
                </div>

                <div className="wiki-step-item">
                  <span className="wiki-step-number">4</span>
                  <div className="wiki-step-content">
                    <h4>💾 Console do Banco & Resets</h4>
                    <p>
                      <strong>Reset Total do Banco:</strong> Quando o Dev executa o reset completo, são removidos todos os proprietários, imóveis e reservas da agenda, restando estritamente as contas de Dev e Admin.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
