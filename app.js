// ============================================================
// app.js
// Lógica do CasaList: troca de telas, Firestore em tempo real,
// adicionar produto e confirmar compra.
// ============================================================

import { db, garantirAutenticacao } from "./firebase.js";
import {
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.4/firebase-firestore.js";

const CHAVE_USUARIO = "casalist_usuario";
const NOME_COLECAO = "produtos";

// ---------- Elementos das telas ----------
const telaUsuario = document.getElementById("tela-usuario");
const telaLista = document.getElementById("tela-lista");
const telaAdicionar = document.getElementById("tela-adicionar");
const modalConfirmar = document.getElementById("modal-confirmar");

const saudacaoEl = document.getElementById("saudacao");
const listaProdutosEl = document.getElementById("lista-produtos");
const nomeProdutoConfirmarEl = document.getElementById("confirmar-nome-produto");

// ---------- Estado local ----------
let usuarioAtual = null;
let produtoSelecionadoId = null;
let pararDeEscutar = null;

// ============================================================
// Início do app
// ============================================================
garantirAutenticacao()
  .then(() => {
    usuarioAtual = localStorage.getItem(CHAVE_USUARIO);
    if (usuarioAtual) {
      abrirTelaLista();
    } else {
      abrirTelaUsuario();
    }
  })
  .catch(() => {
    listaProdutosEl.innerHTML =
      '<li class="mensagem-vazia">Não foi possível conectar. Verifique sua internet e recarregue a página.</li>';
  });

// ============================================================
// Tela 1: escolher usuário
// ============================================================
function abrirTelaUsuario() {
  telaUsuario.classList.remove("escondido");
  telaLista.classList.add("escondido");
  telaAdicionar.classList.add("escondido");
}

document.querySelectorAll(".btn-usuario").forEach((botao) => {
  botao.addEventListener("click", () => {
    const nome = botao.dataset.nome;
    localStorage.setItem(CHAVE_USUARIO, nome);
    usuarioAtual = nome;
    abrirTelaLista();
  });
});

// ============================================================
// Tela 2: lista principal
// ============================================================
function abrirTelaLista() {
  telaUsuario.classList.add("escondido");
  telaAdicionar.classList.add("escondido");
  telaLista.classList.remove("escondido");
  saudacaoEl.textContent = `Olá, ${usuarioAtual} — a lista atualiza sozinha para todo mundo.`;
  escutarProdutos();
}

function escutarProdutos() {
  if (pararDeEscutar) pararDeEscutar();

  const consulta = query(collection(db, NOME_COLECAO), orderBy("criadoEm", "asc"));

  // onSnapshot mantém a lista sincronizada em tempo real entre todos
  // os celulares, sem precisar de nenhum botão "Atualizar".
  pararDeEscutar = onSnapshot(
    consulta,
    (snapshot) => renderizarLista(snapshot.docs),
    () => {
      listaProdutosEl.innerHTML =
        '<li class="mensagem-vazia">Erro ao carregar a lista. Tente novamente mais tarde.</li>';
    }
  );
}

function renderizarLista(docs) {
  listaProdutosEl.innerHTML = "";

  if (docs.length === 0) {
    listaProdutosEl.innerHTML =
      '<li class="mensagem-vazia">🎉 Nada faltando por aqui.</li>';
    return;
  }

  docs.forEach((documento) => {
    const produto = documento.data();
    const item = document.createElement("li");
    item.className = "item-produto";

    const observacaoTexto = produto.observacao
      ? ` · ${escaparHtml(produto.observacao)}`
      : "";

    item.innerHTML = `
      <span class="item-marcador" aria-hidden="true"></span>
      <span class="item-info">
        <strong>${escaparHtml(produto.nome)}</strong>
        <span>${produto.quantidade} ${escaparHtml(produto.unidade)}${observacaoTexto}</span>
        <small>adicionado por ${escaparHtml(produto.criadoPor)}</small>
      </span>
    `;

    item.addEventListener("click", () => {
      abrirModalConfirmar(documento.id, produto.nome);
    });

    listaProdutosEl.appendChild(item);
  });
}

// Evita que nomes/observações digitados pelos moradores quebrem o HTML
function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = String(texto ?? "");
  return div.innerHTML;
}

// ============================================================
// Tela 3: adicionar produto
// ============================================================
document.getElementById("btn-adicionar").addEventListener("click", () => {
  telaAdicionar.classList.remove("escondido");
  telaLista.classList.add("escondido");
});

document.getElementById("btn-voltar-adicionar").addEventListener("click", () => {
  telaAdicionar.classList.add("escondido");
  telaLista.classList.remove("escondido");
});

const formAdicionar = document.getElementById("form-adicionar");

formAdicionar.addEventListener("submit", async (evento) => {
  evento.preventDefault();

  const nome = document.getElementById("input-nome").value.trim();
  const quantidade = Number(document.getElementById("input-quantidade").value) || 1;
  const unidade = document.getElementById("input-unidade").value;
  const observacao = document.getElementById("input-observacao").value.trim();

  if (!nome || !usuarioAtual) return;

  const botaoSalvar = formAdicionar.querySelector(".botao-salvar");
  botaoSalvar.disabled = true;
  botaoSalvar.textContent = "Salvando...";

  // Fecha a tela e limpa o formulário instantaneamente (Atualização Otimista)
  formAdicionar.reset();
  document.getElementById("input-quantidade").value = 1;
  telaAdicionar.classList.add("escondido");
  telaLista.classList.remove("escondido");
  
  botaoSalvar.disabled = false;
  botaoSalvar.textContent = "Salvar";

  // Envia para o Firebase em segundo plano
  addDoc(collection(db, NOME_COLECAO), {
    nome,
    quantidade,
    unidade,
    observacao,
    criadoPor: usuarioAtual,
    criadoEm: serverTimestamp(),
  }).catch((erro) => {
    console.error("Erro ao salvar:", erro);
  });
});

// ============================================================
// Modal: confirmar compra
// ============================================================
function abrirModalConfirmar(id, nome) {
  produtoSelecionadoId = id;
  nomeProdutoConfirmarEl.textContent = nome;
  modalConfirmar.classList.remove("escondido");
}

function fecharModalConfirmar() {
  produtoSelecionadoId = null;
  modalConfirmar.classList.add("escondido");
}

document.getElementById("btn-confirmar-cancelar").addEventListener("click", fecharModalConfirmar);

document.getElementById("btn-confirmar-sim").addEventListener("click", async () => {
  if (!produtoSelecionadoId) return;
  const idParaRemover = produtoSelecionadoId;
  fecharModalConfirmar();
  try {
    await deleteDoc(doc(db, NOME_COLECAO, idParaRemover));
  } catch (erro) {
    alert("Não foi possível remover o produto. Tente novamente.");
  }
});

// ============================================================
// PWA: registrar o Service Worker
// ============================================================
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js").catch(() => {});
  });
}
