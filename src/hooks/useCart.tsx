import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const product = cart.find(product => product.id === productId);
      if (!product) {
        const {data: product} = await api.get<Product>(`products/${productId}`);
        const {data: stock} = await api.get<Stock>(`stock/${productId}`);

        if (stock.amount > 0) {
          const updatedCart = [...cart, {...product, amount: 1}];
          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
          toast('Item adicionado');
        }
      } else {
        const {data: stock} = await api.get<Stock>(`stock/${productId}`)
        if (stock.amount > product.amount) {
          const updatedCart = cart.map(item => item.id === productId ? {
            ...item, 
            amount: Number(item.amount) + 1
          } : item)

          setCart(updatedCart);
          localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
        } else {
          toast.error('Quantidade solicitada fora de estoque');
        }
      }
    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const product = cart.some(item => item.id === productId);
      if (!product) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const updatedCart = cart.filter(item => item.id !== productId)
      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if (amount < 1) {
        toast.error('Erro na remoção do produto');
        return;
      }

      const { data } = await api.get<Stock>(`stock/${productId}`)
      
      if (amount > data.amount) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const product = cart.some(item => item.id === productId)
      if (!product) {
        toast.error('Erro na alteração de quantidade do produto')
      }

      const updatedCart = cart.map(item => item.id === productId ? {
        ...item,
        amount,
      } : item)

      setCart(updatedCart);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));
    } catch {
      toast.error('Erro na alteração de quantidade do produto')
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
