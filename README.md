# Smart Contract de Votacao Descentralizada — Solidity / EVM

**Desenvolvido por L. A. Leandro — Sao Jose dos Campos, SP — 24/05/2026**

Contrato inteligente em Solidity para gerenciamento de eleicoes internas descentralizadas na rede Ethereum. Cada carteira digital possui direito a um unico voto, com registro imutavel e auditavel diretamente no estado global da blockchain.

---

## Objetivo

Fornecer uma urna eletronica criptografica distribuida onde as regras da eleicao sao definidas no momento da implantacao e jamais podem ser alteradas. Nao ha entidade centralizada capaz de modificar resultados, adulterar votos ou interromper o processo.

---

## Requisitos

- Rede Ethereum (mainnet, testnet ou rede local) ou qualquer EVM compativel
- Node.js >= 18.0.0
- npm >= 9.0.0
- Git
- Carteira Ethereum com ETH para custear gas em ambiente real

---

## Especificacoes

**Linguagem:** Solidity ^0.8.28  
**Maquina virtual:** Ethereum Virtual Machine (EVM)  
**Paradigma:** Contrato inteligente imutavel, sem proxy, sem upgrade  
**Ciclo de vida da eleicao:**

```
[CONSTRUTOR] -> (inativo) -> [startElection] -> (ativo) -> [endElection] -> (encerrado)
```

**Restricoes de seguranca:**

- Apenas o endereco proprietario (owner) cadastra candidatos e controla o inicio/fim
- Cada address vota uma unica vez, verificado via mapping(address => bool)
- Nao e possivel votar antes da abertura ou apos o encerramento
- Nao e possivel consultar o vencedor enquanto a eleicao estiver ativa
- Empates sao detectados e rejeitados com erro explicito

---

## Fluxograma da Arquitetura

```
+---------------------------+
|         Frontend          |
| (console Hardhat / DApp)  |
+-----------+---------------+
            |
            | Transacoes (vote, startElection, ...)
            | Queries (getCandidates, getWinner, ...)
            v
+---------------------------+       +-------------------+
|      Voting.sol           |<----->|   Ethereum EVM    |
|                           |       | (estado global)   |
|  - mapping hasVoted       |       +-------------------+
|  - Candidate[] candidates |
|  - address owner          |
|  - bool electionActive    |
+---------------------------+
            ^
            |
+-----------+---------------+
|    Hardhat framework      |
| (compilacao, deploy,      |
|  testes, script runner)   |
+---------------------------+
```

---

## Stacks e Tecnologias

| Componente       | Tecnologia                                     |
|------------------|------------------------------------------------|
| Blockchain       | Ethereum (EVM)                                 |
| Linguagem        | Solidity 0.8.28                                |
| Framework        | Hardhat v2.28.6                                |
| Testes           | Mocha + Chai + ethers.js (via Hardhat Toolbox) |
| Padrao de acesso | Ownable customizado (modifier onlyOwner)       |
| Build            | hardhat compile                                |
| Deploy           | hardhat run scripts/deploy.js                  |

---

## Dependencias

### Producao (on-chain)

Nenhuma. O contrato Voting.sol e autocontido, sem heranca de bibliotecas externas.

### Desenvolvimento (npm)

| Pacote                             | Versao  | Finalidade                          |
|------------------------------------|---------|--------------------------------------|
| hardhat                            | ^2.28.6 | Framework de desenvolvimento         |
| @nomicfoundation/hardhat-toolbox   | ^6.1.2  | Plugins de testes, compilacao, etc   |

### Instalacao

```bash
npm install
```

---

## Instalacao e Compilacao

```bash
# 1. Clonar o repositorio
git clone https://github.com/radarmultinivel/Smart-Contract-de-Votacao-Imut-vel-Solidity--Ethereum.git
cd Smart-Contract-de-Votacao-Imut-vel-Solidity--Ethereum

# 2. Instalar dependencias
npm install

# 3. Compilar o contrato
npx hardhat compile

# Saida esperada:
# Compiled 1 Solidity file successfully (evm target: paris)
```

A compilacao gera os artefatos em `artifacts/contracts/Voting.sol/` (ABI + Bytecode).

---

## Testes

### Executar

```bash
npx hardhat test
```

### Cobertura (28 testes)

| Modulo              | Qtd  | O que valida                                    |
|---------------------|------|-------------------------------------------------|
| Deployment          | 5    | Owner, candidatos iniciais, rejeicao de vazio/duplicata |
| Election Lifecycle  | 5    | Transicoes ativo/inativo, rejeicao de dupla chamada     |
| Candidate Management| 5    | Adicao de candidato, bloqueio durante eleicao, acesso   |
| Voting              | 7    | Voto unico, candidato invalido, rastreamento por address|
| Winner Selection    | 4    | Vencedor, empate, eleicao ativa, zero votos            |
| Access Control      | 2    | Bloqueio de funcoes administrativas para nao-owner     |

---

## Manual do Usuario

### 1. Iniciar no local de testes

```bash
npx hardhat node
```

Mantem um no Ethereum em http://127.0.0.1:8545 com 20 contas pre-financiadas.

### 2. Implantar o contrato

Em outro terminal:

```bash
npx hardhat run scripts/deploy.js --network localhost
```

Saida esperada:

```
Voting deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Candidates: Alice, Bob, Charlie
Owner: 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266
```

### 3. Interagir via console

```bash
npx hardhat console --network localhost
```

```javascript
const Voting = await ethers.getContractFactory("Voting");
const voting = await Voting.attach("0x5FbDB2315678afecb367f032d93F642f64180aa3");

// Iniciar votacao
await voting.startElection();

// Obter contas disponiveis
const contas = await ethers.getSigners();

// Votar (cada conta so pode votar uma vez)
await voting.connect(contas[1]).vote(0);
await voting.connect(contas[2]).vote(1);
await voting.connect(contas[3]).vote(0);

// Listar candidatos e total de votos
const candidatos = await voting.getCandidates();
console.log("Candidatos:", candidatos);
console.log("Total de votos:", await voting.getTotalVotes().toString());

// Verificar se um endereco votou
console.log("contas[1] votou?", await voting.hasAddressVoted(contas[1].address));

// Encerrar e obter vencedor
await voting.endElection();
const vencedor = await voting.getWinner();
console.log("Vencedor:", vencedor.name, "-", vencedor.voteCount.toString(), "votos");
```

### 4. Funcoes Disponiveis

**Administrativas (apenas owner):**

| Funcao               | Parametros             | Descricao                              |
|----------------------|------------------------|----------------------------------------|
| startElection()      | —                      | Abre a votacao                         |
| endElection()        | —                      | Encerra a votacao                      |
| addCandidate(string) | name: nome do candidato| Cadastra novo candidato (antes de abrir)|

**Publicas:**

| Funcao                   | Parametros               | Descricao                                |
|--------------------------|--------------------------|------------------------------------------|
| vote(uint256)            | candidateId: ID do candidato | Registra voto do chamador            |
| getCandidates()          | —                        | Retorna array completo de candidatos     |
| getCandidate(uint256)    | candidateId              | Retorna um candidato especifico          |
| getWinner()              | —                        | Retorna o vencedor (apos encerramento)   |
| getTotalVotes()          | —                        | Total de votos computados                |
| hasAddressVoted(address) | voter: endereco da conta | Verifica se conta ja votou               |
| getCandidatesCount()     | —                        | Numero de candidatos cadastrados         |
| isElectionActive()       | —                        | Status atual da votacao                  |

---

## Tratamento de Erros (Custom Errors)

O contrato utiliza Custom Errors do Solidity, que consomem menos gas que strings em require().

| Erro                                   | Dispara quando                              |
|----------------------------------------|---------------------------------------------|
| `Unauthorized()`                       | Funcao administrativa chamada por nao-owner |
| `ElectionNotStarted()`                 | Tentativa de votar antes de startElection   |
| `ElectionEnded()`                      | Tentativa de votar apos endElection         |
| `AlreadyVoted()`                       | Mesmo address tenta votar duas vezes        |
| `InvalidCandidate()`                   | ID de candidato inexistente                 |
| `CandidateAlreadyExists()`             | Nome duplicado no cadastro                  |
| `NoCandidatesRegistered()`             | Nenhum candidato disponivel                 |
| `ElectionAlreadyStarted()`             | startElection chamado duas vezes            |
| `ElectionAlreadyEnded()`               | endElection chamado duas vezes              |
| `ElectionOngoing()`                    | getWinner chamado com eleicao ativa         |
| `TieBetweenCandidates(uint256,uint256)`| Empate detectado na apuracao                |

---

## Licenca

MIT
