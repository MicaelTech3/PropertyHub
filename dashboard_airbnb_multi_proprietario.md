# Dashboard de Gestão Airbnb — Multi-Proprietário

## Objetivo

Criar uma plataforma própria para uma administradora que gerencia vários apartamentos de diferentes proprietários através de contas do Airbnb.

O sistema **não é um clone do Airbnb**. Ele é uma camada de gestão que organiza os dados da operação e permite que cada proprietário veja somente seus próprios imóveis.

Exemplo:

- João → 10 apartamentos
- Maria → 6 apartamentos
- Carlos → 12 apartamentos

A administradora pode ter tudo dentro de uma conta/operação do Airbnb, mas no sistema:

- João vê apenas os 10 dele.
- Maria vê apenas os 6 dela.
- Carlos vê apenas os 12 dela.
- Administrador vê todos.

---

## Conceito do produto

O sistema deve responder rapidamente:

> **Como estão meus apartamentos hoje?**

O proprietário deve conseguir ver em uma única tela:

- apartamentos ocupados;
- apartamentos disponíveis;
- reservas futuras;
- check-ins;
- check-outs;
- faturamento;
- previsão de faturamento;
- taxa de ocupação;
- desempenho de cada apartamento.

O Airbnb continua sendo a origem das reservas quando houver integração. O sistema próprio funciona como o painel gerencial individualizado.

---

# 1. Perfis de acesso

## Administrador

Acesso completo:

- todos os proprietários;
- todos os apartamentos;
- todas as reservas;
- financeiro geral;
- contas Airbnb;
- importações;
- integrações;
- relatórios;
- usuários e permissões.

## Proprietário

Acesso somente aos seus imóveis:

- seus apartamentos;
- suas reservas;
- seu faturamento;
- sua ocupação;
- suas projeções;
- seu calendário.

Um proprietário nunca deve conseguir visualizar dados de outro proprietário.

---

# 2. Dashboard do proprietário

Cabeçalho:

> Olá, João  
> Aqui está o resumo dos seus 10 apartamentos.

Filtros:

- Hoje
- Esta semana
- Este mês
- Próximo mês
- Período personalizado

### KPIs

**10** — Total de apartamentos

**7** — Ocupados agora

**2** — Reservados

**1** — Disponível

**3** — Check-ins hoje

**2** — Check-outs hoje

**R$ 18.450** — Faturamento do mês

**R$ 24.800** — Projeção do mês

---

# 3. Apartamentos

Esta é uma área central do sistema.

Não usar apenas uma tabela genérica. Criar cards visuais para cada imóvel.

### Exemplo — Apartamento 101

Status: **Ocupado**

Hóspede: João Silva

Check-in: 08/10/2026

Check-out: 12/10/2026

Valor: R$ 920

Próxima reserva: 15/10/2026

Origem: Airbnb

### Exemplo — Apartamento 102

Status: **Reservado**

Próximo check-in: 14/10/2026

Hóspede: Maria Souza

Valor: R$ 780

### Exemplo — Apartamento 103

Status: **Disponível**

Nenhuma reserva futura.

### Exemplo — Apartamento 104

Status: **Manutenção**

Problema: Ar-condicionado.

---

# 4. Status

Usar estados claros:

- 🟢 Ocupado
- 🔵 Reservado
- ⚪ Disponível
- 🟡 Check-in hoje
- 🟣 Check-out hoje
- 🔴 Manutenção
- ⚫ Bloqueado

---

# 5. Calendário operacional

Criar um calendário específico para hospedagem, organizado por apartamento.

Exemplo:

| Apartamento | 08 | 09 | 10 | 11 | 12 | 13 | 14 |
|---|---|---|---|---|---|---|---|
| 101 | ocupado | ocupado | ocupado | ocupado | saída | livre | reserva |
| 102 | livre | reserva | reserva | reserva | reserva | saída | livre |
| 103 | ocupado | ocupado | saída | livre | livre | reserva | reserva |

O calendário deve mostrar visualmente:

- ocupação;
- reservas;
- disponibilidade;
- check-in;
- check-out;
- bloqueios.

---

# 6. Reservas

Página dedicada com filtros:

- apartamento;
- proprietário;
- status;
- período;
- plataforma;
- check-in;
- check-out.

Tabela:

| Reserva | Apartamento | Hóspede | Check-in | Check-out | Valor | Status |
|---|---|---|---|---|---:|---|
| #1028 | 101 | João Silva | 08/10 | 12/10 | R$ 920 | Ativa |
| #1029 | 102 | Maria Souza | 14/10 | 18/10 | R$ 780 | Confirmada |

Cada reserva deve abrir detalhes completos.

---

# 7. Financeiro

O proprietário precisa entender quanto seus imóveis estão gerando.

Mostrar:

- faturamento do período;
- faturamento confirmado;
- faturamento previsto;
- taxas/comissões;
- resultado líquido;
- diária média;
- faturamento por apartamento.

Criar gráficos por:

- dia;
- semana;
- mês;
- apartamento.

---

# 8. Projeção

Criar uma área específica para previsão de ocupação e receita.

Exemplo:

### Próximos 30 dias
82% de ocupação prevista

### Próximos 60 dias
69%

### Próximos 90 dias
61%

Mostrar:

- reservas confirmadas;
- períodos livres;
- ocupação prevista;
- faturamento previsto.

Se não houver dados suficientes, usar dados simulados somente no protótipo e identificar claramente como demonstração.

---

# 9. Ranking de apartamentos

Mostrar quais apartamentos têm melhor desempenho.

Exemplo:

1. Apt 101 — R$ 7.820
2. Apt 104 — R$ 6.540
3. Apt 203 — R$ 5.980
4. Apt 106 — R$ 4.320
5. Apt 202 — R$ 3.760

Métricas:

- faturamento;
- ocupação;
- número de reservas;
- diária média;
- disponibilidade.

---

# 10. Página do proprietário

Exemplo:

## João Silva

**10 apartamentos**

Resumo:

- 7 ocupados;
- 2 reservados;
- 1 disponível;
- R$ 18.450 faturados;
- R$ 24.800 previstos.

Abaixo:

- lista dos apartamentos;
- calendário;
- reservas;
- histórico financeiro;
- desempenho.

---

# 11. Dashboard administrativo

O administrador deve ter uma visão global diferente da visão do proprietário.

Exemplo:

**28 apartamentos**

**3 proprietários**

**18 ocupados**

**5 reservados**

**3 disponíveis**

**2 em manutenção**

Tabela:

| Proprietário | Imóveis | Ocupação | Faturamento |
|---|---:|---:|---:|
| João Silva | 10 | 82% | R$ 18.450 |
| Maria Costa | 6 | 76% | R$ 12.820 |
| Carlos Souza | 12 | 84% | R$ 26.300 |

---

# 12. Contas Airbnb

Criar uma seção:

## Contas Airbnb

Exemplo:

**Airbnb — Conta Principal**

Status: 🟢 Conectada

Última sincronização: 08/10/2026 09:42

Imóveis: 28

Reservas: 126

Proprietários vinculados: 3

Botões:

- Sincronizar agora
- Configurar

---

# 13. Importação manual

O sistema deve funcionar mesmo sem integração direta.

Permitir:

- CSV;
- Excel;
- cadastro manual.

Campos:

```text
Apartamento
Proprietário
Reserva
Hóspede
Check-in
Check-out
Valor
Status
Conta Airbnb
```

Antes de salvar uma importação, mostrar uma prévia dos dados e permitir confirmar ou cancelar.

---

# 14. Integração futura

Preparar a arquitetura para integração oficial quando houver acesso autorizado aos recursos necessários.

Fluxo:

```text
AIRBNB
   ↓
API / INTEGRAÇÃO
   ↓
BACKEND
   ↓
BANCO DE DADOS
   ↓
SISTEMA PRÓPRIO
   ↓
DASHBOARD
```

Alternativa:

```text
AIRBNB
   ↓
EXPORTAÇÃO CSV
   ↓
IMPORTAÇÃO
   ↓
BANCO DE DADOS
   ↓
DASHBOARD
```

Não assumir que qualquer dado ou operação está disponível pela API do Airbnb. Implementar somente recursos oficialmente disponíveis e autorizados.

---

# 15. Modelo de dados

Cada apartamento deve estar relacionado a um proprietário e, quando necessário, à conta Airbnb.

```text
property_id
owner_id
airbnb_account_id
```

Exemplo:

```text
Apartamento 101

property_id: 101
owner_id: JOAO
airbnb_account_id: CONTA_PRINCIPAL
```

Isso permite separar os imóveis mesmo quando vários proprietários usam a mesma conta/operação do Airbnb.

---

# 16. Menu

### PRINCIPAL
- Dashboard

### OPERAÇÃO
- Apartamentos
- Reservas
- Calendário
- Check-ins
- Check-outs
- Limpeza
- Manutenção

### FINANCEIRO
- Faturamento
- Projeções
- Relatórios

### GESTÃO
- Proprietários
- Contas Airbnb
- Importações
- Integrações

### SISTEMA
- Configurações
- Usuários
- Permissões

---

# 17. Design

O visual deve parecer um sistema interno profissional de uma empresa de gestão de hospedagens.

### Direção

- moderno;
- limpo;
- profissional;
- desktop-first;
- responsivo;
- excelente em tablet e celular;
- foco em informação operacional.

### Cores

Base:

- branco;
- cinza claro;
- azul escuro;
- azul;
- verde para ocupado/positivo;
- amarelo para atenção;
- vermelho para problemas.

Evitar excesso de gradientes.

Evitar excesso de cards.

Priorizar hierarquia de informação.

---

# 18. Regra para NÃO ser genérico

Não usar métricas aleatórias de SaaS como:

- usuários cadastrados;
- vendas;
- conversões;
- pedidos;
- leads;
- marketing.

Cada elemento precisa ter relação direta com:

**apartamento + proprietário + reserva + ocupação + dinheiro.**

A primeira tela deve responder:

1. Quantos apartamentos estão ocupados?
2. Quais estão livres?
3. Quais têm reserva?
4. Quem entra hoje?
5. Quem sai hoje?
6. Quanto já foi faturado?
7. Quanto está previsto?
8. Qual apartamento performa melhor?
9. Quais imóveis pertencem ao proprietário logado?
10. De qual conta Airbnb vieram os dados?
11. Quando ocorreu a última sincronização?
12. Existem apartamentos sem reserva?

---

# 19. Estrutura visual da tela principal

```text
┌──────────────────────────────────────────────────────────────┐
│ LOGO     Buscar...                    Data      Usuário       │
├──────────────┬───────────────────────────────────────────────┤
│              │                                               │
│ Dashboard    │ João Silva                                    │
│              │ 10 apartamentos                               │
│ Apartamentos │                                               │
│ Reservas     │ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────────────┐ │
│ Calendário   │ │ 10   │ │  7   │ │  2   │ │ R$ 18.450    │ │
│ Financeiro   │ │ aptos│ │ocup. │ │res.  │ │ faturamento   │ │
│              │ └──────┘ └──────┘ └──────┘ └──────────────┘ │
│ Proprietários│                                               │
│ Airbnb       │ Ocupação                 Próximas reservas   │
│              │ ┌───────────────┐       ┌─────────────────┐ │
│              │ │      78%      │       │ Apt 101         │ │
│              │ │    ocupação   │       │ Check-out 12/10 │ │
│              │ └───────────────┘       │ Apt 102         │ │
│              │                         │ Check-in 14/10  │ │
│              │ Apartamentos                                │
│              │ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ │
│              │ │ Apt101 │ │ Apt102 │ │ Apt103 │ │ Apt104 │ │
│              │ │Ocupado │ │Reserva │ │ Livre  │ │Ocupado │ │
│              │ └────────┘ └────────┘ └────────┘ └────────┘ │
└──────────────┴───────────────────────────────────────────────┘
```

---

# 20. Tecnologia sugerida

Frontend:

- React
- Vite
- Tailwind CSS
- shadcn/ui
- Recharts

Backend:

- Node.js
- API REST

Banco:

- PostgreSQL / Supabase

Autenticação:

- Supabase Auth ou Firebase Auth

Arquitetura preparada para:

- múltiplos proprietários;
- múltiplas contas Airbnb;
- múltiplos apartamentos;
- importação CSV/Excel;
- integração futura.

---

# 21. MVP

Primeira versão:

1. Login
2. Usuários e permissões
3. Proprietários
4. Apartamentos
5. Reservas
6. Dashboard
7. Calendário
8. Faturamento
9. Projeções
10. Importação CSV
11. Associação apartamento → proprietário
12. Associação apartamento → conta Airbnb
13. Histórico de sincronização

A integração direta com Airbnb pode entrar em uma segunda etapa.

---

# 22. Regra principal

> **O Airbnb é a origem da operação.**
>
> **O sistema próprio é a visão gerencial individualizada.**

O proprietário entra e vê:

> **Meus apartamentos.**

O administrador entra e vê:

> **Toda a operação.**

O resultado final deve parecer uma ferramenta feita especificamente para uma empresa que administra apartamentos de temporada, e não um template de dashboard reaproveitado.
