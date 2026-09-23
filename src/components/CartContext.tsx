"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

/*
  Carrinho do cliente — guardado no localStorage do navegador.
  Não guarda preço como fonte de verdade: o total final é sempre
  recalculado no servidor (POST /api/checkout) a partir do banco.
*/

export type CartItem = {
  produtoId: string;
  nome: string;
  detalhe: string;
  descricao: string;
  codigo: string;
  preco: number;
  imagem: string;
  quantidade: number;
};

type CartCtx = {
  itens: CartItem[];
  totalItens: number;
  subtotal: number;
  addItem: (item: Omit<CartItem, "quantidade">, qtd?: number) => void;
  setQuantidade: (produtoId: string, qtd: number) => void;
  removeItem: (produtoId: string) => void;
  clear: () => void;
};

const Ctx = createContext<CartCtx | null>(null);
const STORAGE_KEY = "regadoces_carrinho_v1";

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [itens, setItens] = useState<CartItem[]>([]);
  const [carregado, setCarregado] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItens(JSON.parse(raw));
    } catch {
      /* storage indisponível — segue com carrinho vazio */
    }
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(itens));
    } catch {
      /* ignore */
    }
  }, [itens, carregado]);

  const addItem = useCallback(
    (item: Omit<CartItem, "quantidade">, qtd = 1) => {
      setItens((prev) => {
        const found = prev.find((i) => i.produtoId === item.produtoId);
        if (found) {
          return prev.map((i) =>
            i.produtoId === item.produtoId
              ? { ...i, quantidade: Math.min(i.quantidade + qtd, 99) }
              : i
          );
        }
        return [...prev, { ...item, quantidade: qtd }];
      });
    },
    []
  );

  const setQuantidade = useCallback((produtoId: string, qtd: number) => {
    setItens((prev) =>
      prev
        .map((i) =>
          i.produtoId === produtoId
            ? { ...i, quantidade: Math.max(0, Math.min(qtd, 99)) }
            : i
        )
        .filter((i) => i.quantidade > 0)
    );
  }, []);

  const removeItem = useCallback((produtoId: string) => {
    setItens((prev) => prev.filter((i) => i.produtoId !== produtoId));
  }, []);

  const clear = useCallback(() => setItens([]), []);

  const value = useMemo<CartCtx>(() => {
    const totalItens = itens.reduce((s, i) => s + i.quantidade, 0);
    const subtotal = itens.reduce((s, i) => s + i.preco * i.quantidade, 0);
    return { itens, totalItens, subtotal, addItem, setQuantidade, removeItem, clear };
  }, [itens, addItem, setQuantidade, removeItem, clear]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useCart precisa do CartProvider");
  return ctx;
}
