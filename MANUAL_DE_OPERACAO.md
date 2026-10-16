# 📘 Manual de Operação e Uso — PropertyHub

Bem-vindo ao **PropertyHub**, a plataforma de gestão inteligente de imóveis e locações por temporada (Airbnb, Booking e Direto) com suporte a múltiplos proprietários.

Este manual foi elaborado exclusivamente para a **operação prática do dia a dia**: como navegar, cadastrar imóveis, gerenciar proprietários, lançar reservas e fotos.

---

## 📌 Sumário
1. [Acessando a Plataforma](#1-acessando-a-plataforma)
2. [Gestão de Proprietários](#2-gestão-de-proprietários)
3. [Como Hospedar e Inserir Fotos nos Imóveis (PostImages)](#3-como-hospedar-e-inserir-fotos-nos-imóveis-postimages)
4. [Cadastrando um Novo Imóvel](#4-cadastrando-um-novo-imóvel)
5. [Vinculando e Desvinculando Imóveis](#5-vinculando-e-desvinculando-imóveis)
6. [Lançando Reservas e Bloqueios Rápidos](#6-lançando-reservas-e-bloqueios-rápidos)
7. [Sincronização com o Airbnb (iCal)](#7-sincronização-com-o-airbnb-ical)
8. [Visão e Acesso do Proprietário](#8-visão-e-acesso-do-proprietário)

---

## 1. Acessando a Plataforma

1. Acesse o endereço do sistema no seu navegador (computador ou celular):
   * **Domínio oficial:** `https://rjadmlocação.com.br` *(ou pelo link Firebase: `https://hub-propertydev.web.app`)*
2. Na tela de login:
   * **Identificador:** Digite seu **e-mail** ou **nome de usuário**.
   * **Senha:** Digite a senha cadastrada.
3. Clique em **"Entrar na Plataforma"**.
   * O sistema detecta automaticamente se você é **Administrador da Gestão** ou um **Proprietário**, adaptando a tela para o seu nível de acesso.

---

## 2. Gestão de Proprietários

Como Administrador, você pode cadastrar todos os proprietários que possuem imóveis sob sua gestão.

### ➕ Cadastrar um Novo Proprietário
1. No menu principal, clique na aba **"Proprietários"**.
2. Clique no botão **`+ Novo Proprietário`** (no canto superior direito).
3. Preencha os campos obrigatórios:
   * **Nome Completo:** Ex: `Carlos Alberto Mendes`
   * **Usuário de Acesso:** Ex: `carlos` *(sem espaços ou caracteres especiais)*
   * **E-mail:** Ex: `carlos@email.com`
   * **Senha de Acesso:** Defina uma senha inicial (ex: `123456`). O proprietário usará esse usuário e senha para entrar.
4. Clique em **"Cadastrar Proprietário"**.

---

## 3. Como Hospedar e Inserir Fotos nos Imóveis (PostImages)

Para manter o sistema rápido e sem sobrecarregar o banco de dados, as fotos dos imóveis são carregadas por link direto via serviço seguro e gratuito de hospedagem.

### Passo a passo para gerar o link da foto:
1. No formulário de cadastro do imóvel, clique no botão azul **`📷 Abrir gerador PostImages ↗`** *(ou acesse [https://postimages.org/](https://postimages.org/))*.
2. Na página do PostImages:
   * No campo *"Redimensionar imagem"*, escolha **"Não redimensionar"** (ou 1280x960).
   * No campo *"Validade"*, deixe como **"Sem expiração"**.
   * Clique em **"Escolher imagens"** e selecione a foto do imóvel no seu computador ou celular.
3. Após o upload concluir, a tela exibirá vários links. **Atenção:**
   * Copie o campo chamado **"Link direto"** *(ele termina com `.jpg`, `.jpeg` ou `.png` — exemplo: `https://i.postimg.cc/abc123/foto.jpg`)*.
4. Volte à aba do PropertyHub e **cole o link no campo "Foto de Capa"**.
5. Uma miniatura com a **prévia da imagem** aparecerá na mesma hora com um aviso verde `✓ Imagem carregada com sucesso`.

---

## 4. Cadastrando um Novo Imóvel

1. Acesse a aba **"Imóveis"** (ou dentro do perfil de um proprietário) e clique em **`+ Novo Imóvel`**.
2. Preencha os dados do imóvel:
   * **Título / Nome no Airbnb:** Ex: `Studio Beira-Mar Copacabana Posto 4`
   * **Tipo de Imóvel:** Apartamento, Casa, Studio/Flat, Chalé ou Cobertura.
   * **Vincular a um Proprietário:**
     * Escolha o proprietário na lista suspensa; OU
     * Escolha `⚠️ Sem Proprietário` se quiser cadastrar o imóvel agora e atribuir a um cliente depois.
   * **Endereço Completo e Cidade/UF:** Ex: `Av. Atlântica, 1500 - Copacabana` e `Rio de Janeiro, RJ`.
   * **Link do Anúncio no Airbnb (Opcional):** Link direto do anúncio (ex: `https://www.airbnb.com.br/rooms/12345678`).
   * **ID / Código do Anúncio (Opcional):** Apenas os números do código do anúncio.
   * **Diária Base (R$):** Valor padrão da diária (ex: `280`).
   * **Capacidade:** Número de hóspedes, quartos e banheiros.
   * **Foto de Capa:** Cole o link direto obtido no PostImages.
   * **Comodidades:** Liste itens separados por vírgula (ex: `Wi-Fi, Ar-condicionado, Vista para o Mar, Garagem`).
   * **Link iCal (Opcional):** Link de exportação da agenda do Airbnb para bloqueios automáticos.
3. Clique em **"Salvar Imóvel no Firebase"**.

---

## 5. Vinculando e Desvinculando Imóveis

### Imóveis "Sem Proprietário" (Banco Geral de Imóveis)
Quando você adiciona imóveis sem dono definido, eles ficam marcados com a etiqueta amarela **"Sem Proprietário"**.

* **Para vincular a um proprietário existente:**
  1. Vá até a aba **"Proprietários"** e clique no cartão do proprietário desejado.
  2. No topo da ficha dele, clique no botão **`🏢 Vincular Imóvel Existente`**.
  3. O sistema listará todos os imóveis vagos. Basta clicar em **"Vincular a este proprietário"**.

* **Para desvincular um imóvel de um proprietário:**
  1. Na listagem de imóveis ou na ficha do proprietário, localize o imóvel.
  2. Clique em **"Desvincular"**. O imóvel volta para o status "Sem Proprietário" sem perder nenhuma reserva ou histórico.

---

## 6. Lançando Reservas e Bloqueios Rápidos

O sistema calcula **faturamento, taxa de ocupação e vacância automaticamente** a cada reserva lançada.

### Como lançar uma reserva:
1. Na tela **"Imóveis"** (ou no detalhe do Proprietário), localize o cartão do apartamento.
2. Clique no botão azul **`⚡ Reservar Agora`** localizado no cartão do imóvel.
3. No modal que abrir:
   * **Nome do Hóspede:** Ex: `Mariana Oliveira` (ou digite `Manutenção / Bloqueio` para fechar a data).
   * **Canal:** Selecione **Airbnb**, **Booking**, **Direto** ou **Bloqueio Manual**.
   * **Data de Check-in e Data de Check-out:** Escolha as datas no calendário.
   * **Valor Total (R$):** O sistema calcula automaticamente as diárias multiplicadas pelo preço base, mas você pode editar livremente para aplicar descontos ou tarifas de alta temporada.
4. Clique em **"Confirmar Reserva"**.
   * A ocupação do mês sobe automaticamente.
   * O faturamento bruto e o repasse líquido do proprietário são recalculados em tempo real no Dashboard.

---

## 7. Sincronização com o Airbnb (iCal)

Para importar o calendário do Airbnb e evitar overbooking:

1. No portal do Airbnb como anfitrião:
   * Vá em **Anúncios > Calendário > Preços e Disponibilidade > Sincronização de Calendários > Exportar Calendário**.
   * Copie o link que termina com `.ics`.
2. No PropertyHub:
   * Cole esse link no campo **"Link iCal do Calendário Airbnb"** ao cadastrar o imóvel.

---

## 8. Visão e Acesso do Proprietário

Quando um cliente proprietário faz login com as credenciais que você criou para ele:

* **Privacidade total:** Ele **não tem acesso** a dados da sua empresa ou de outros proprietários.
* **Extrato do Proprietário:**
  * Faturamento total dos imóveis dele.
  * Divisão transparente da comissão de administração vs. valor líquido a receber.
  * Calendário de reservas dos apartamentos dele.
  * Taxa de ocupação exclusiva dos seus imóveis.

---

## 9. Modo Desenvolvedor (Dev) & Console do Banco de Dados

O usuário Desenvolvedor possui credenciais especiais e acesso ao console de engenharia da plataforma:

* **E-mail do Dev:** `micaelbardimtech@gmail.com`
* **Usuário:** `micaelbardimtech` ou `dev`
* **Senha:** `dev` *(ou autenticação via Firebase Auth)*

### Recursos Exclusivos do Dev:
1. **📋 Logs de Auditoria Separados:**
   - Monitoramento em tempo real de todas as ações no sistema (logins, alterações, reservas, exclusões e resets).
   - Filtros por categoria (`auth`, `user`, `property`, `room`, `reservation`, `database`).
   - Busca em tempo real, visualização de metadados JSON e exportação de arquivo de logs.
2. **👥 Gestão Direta de Usuários:**
   - Criar qualquer nível de usuário (`dev`, `admin`, `owner`).
   - Editar credenciais e revelar senhas para suporte.
   - Excluir qualquer usuário imediatamente do banco sem autorização do admin.
3. **🚪 Gestão de Cômodos (Quartos) & Vínculos:**
   - Criar cômodos diretamente em qualquer imóvel com código Airbnb, iCal e diária.
   - Editar e excluir cômodos.
   - Vincular ou desvincular imóveis de proprietários diretamente.
4. **💾 Console do Banco de Dados & Resets:**
   - **Resetar Usuários:** Restaurar padrão de fábrica ou limpar proprietários de teste.
   - **Resetar Agenda / Reservas:** Esvaziar a agenda completamente, restaurar reservas de teste ou limpar reservas de um imóvel específico.
   - **Resetar Imóveis:** Restaurar imóveis padrão ou limpar imóveis.
   - **Backup & Restauração Completa:** Exportar e importar arquivo `.json` com todo o banco de dados.
   - **Reset de Fábrica Total:** Redefinição limpa completa com proteção de confirmação.

---

*PropertyHub — Gestão Profissional de Locação por Temporada.*

