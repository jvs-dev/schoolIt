# 🚀 SchoolIT - Sistema de Chamados TI (Fricção Zero)

Um MVP B2B SaaS desenvolvido para revolucionar o suporte de TI em instituições de ensino. O foco absoluto do sistema é eliminar o atrito entre o problema do professor e a resolução da TI, utilizando uma arquitetura de "Kiosk Mode" e banco de dados em tempo real.

## 🎯 O Problema vs. A Solução
Em escolas, um professor com 30 alunos na sala não tem tempo para preencher formulários longos quando o projetor ou a internet param. 
**A Solução:** O SchoolIT transforma a tela do professor em um "Botão de Pânico". Com apenas 1 clique, o TI é acionado. Sem formulários, sem senhas, sem atrito.

## ✨ Features Principais

* **Fricção Zero (Kiosk Mode):** O sistema se adapta ao dispositivo. Uma vez configurado pelo TI via `localStorage`, o computador atua como um totem dedicado para a sala de aula.
* **Gestão de Ativos Invisível:** O TI cadastra a sala, o andar e o hardware da máquina no setup. Quando o professor pede ajuda, o ticket já nasce com a localização geográfica e técnica exata.
* **Painel da TI em Tempo Real:** Dashboard premium com atualização instantânea via Firebase `onSnapshot`. Sem recarregar a página. Com alertas visuais e sonoros para novos chamados.
* **Avaliação de Atendimento (PLG):** Sistema de pontuação de 5 estrelas focado em coletar métricas de satisfação (Product-Led Growth) de forma anônima e direta.
* **Segurança Global:** Autenticação de admin protegida por Hash Criptográfico (SHA-256) validada diretamente no servidor do Firebase.

## 🛠️ Stack Tecnológico

* **Front-end:** Next.js, React, Tailwind CSS
* **Ícones e UI:** Lucide React
* **Back-end & BaaS:** Firebase (Firestore)
* **Arquitetura:** Role-based routing (Setup, Teacher, IT Admin) via cache local.

## 💡 Fluxo de Uso (Prova de Conceito)

1. **Setup Inicial:** O técnico de TI acessa o sistema na máquina da sala, insere a senha global criptografada e registra os dados do ativo (Setor, Andar, Sala, Marca do PC).
2. **Abertura de Chamado:** O professor, diante de um problema, clica em uma das "Quick Actions" (ex: Sem Internet).
3. **Tela de Bloqueio:** A interface do professor é bloqueada com um aviso de "TI a caminho", impedindo aberturas duplicadas.
4. **Resolução e Avaliação:** O TI recebe o chamado no dashboard, resolve o problema na sala, e o professor encerra o chamado avaliando o atendimento em 3 quesitos de 1 a 5 estrelas.

---
*Construído com foco em velocidade, usabilidade e entrega de valor B2B.*